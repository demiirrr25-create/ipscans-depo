using System.Net;
using System.Net.Security;
using System.Net.Sockets;
using System.Security.Authentication;
using System.Security.Cryptography.X509Certificates;
using System.Text.Json;
using IPCast.Network.Protocol;
using IPCast.Shared;

namespace IPCast.Network;

/// <summary>
/// Listens for inbound IPCast connections, encrypts each one with TLS, runs the
/// Hello/ConnectionRequest handshake, and asks <see cref="OnConnectionRequested"/> (wired to the
/// UI) whether to accept each one.
/// </summary>
public sealed class IPCastHost : IAsyncDisposable
{
    private readonly X509Certificate2 _certificate;
    private readonly TcpListener _listener;
    private readonly CancellationTokenSource _cts = new();
    private readonly RateLimiter _unattendedAccessRateLimiter = new(maxAttempts: 5, window: TimeSpan.FromMinutes(5));
    private Task? _acceptLoop;

    public IPCastHost(X509Certificate2 certificate, int port = 0)
    {
        _certificate = certificate;
        _listener = new TcpListener(IPAddress.Any, port);
    }

    /// <summary>The bound TCP port - useful when constructed with port 0 (let the OS pick one).</summary>
    public int Port => ((IPEndPoint)_listener.LocalEndpoint).Port;

    /// <summary>Must be set before <see cref="Start"/> for incoming connections to ever be accepted.</summary>
    public ConnectionRequestHandler? OnConnectionRequested { get; set; }

    /// <summary>
    /// If set, an incoming request that supplies the correct password (spec §9) is accepted
    /// immediately, without ever invoking <see cref="OnConnectionRequested"/> - that's the whole
    /// point of unattended access: nobody needs to be there to click Accept. Rate-limited to slow
    /// down password brute-forcing.
    /// </summary>
    public IUnattendedAccessPolicy? UnattendedAccessPolicy { get; set; }

    /// <summary>Raised once a session has been accepted and is ready for higher-level use.</summary>
    public event Action<RemoteSession>? SessionEstablished;

    public void Start()
    {
        _listener.Start();
        _acceptLoop = AcceptLoopAsync(_cts.Token);
    }

    private async Task AcceptLoopAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            TcpClient client;
            try
            {
                client = await _listener.AcceptTcpClientAsync(ct).ConfigureAwait(false);
            }
            catch (Exception ex) when (ex is OperationCanceledException or ObjectDisposedException or SocketException)
            {
                return;
            }

            _ = HandleIncomingAsync(client, ct);
        }
    }

    private async Task HandleIncomingAsync(TcpClient client, CancellationToken ct)
    {
        Stream stream;
        try
        {
            var sslStream = new SslStream(client.GetStream(), leaveInnerStreamOpen: false, TlsPolicy.AcceptAnyCertificate);
            await sslStream.AuthenticateAsServerAsync(
                new SslServerAuthenticationOptions
                {
                    ServerCertificate = _certificate,
                    ClientCertificateRequired = false,
                    EnabledSslProtocols = SslProtocols.None, // let the OS/runtime pick the best mutually-supported version (TLS 1.2/1.3)
                },
                ct).ConfigureAwait(false);
            stream = sslStream;
        }
        catch (Exception)
        {
            // TLS handshake failed (e.g. the peer isn't a real IPCast client): drop it silently.
            client.Dispose();
            return;
        }

        try
        {
            var (helloType, helloPayload) = await MessageStream.ReadAsync(stream, ct).ConfigureAwait(false);
            if (helloType != MessageType.Hello)
            {
                client.Dispose();
                return;
            }

            var hello = helloPayload.Deserialize<HelloMessage>()!;
            if (!DeviceId.TryParse(hello.DeviceId, out var remoteId))
            {
                client.Dispose();
                return;
            }

            var (requestType, requestPayload) = await MessageStream.ReadAsync(stream, ct).ConfigureAwait(false);
            if (requestType != MessageType.ConnectionRequest)
            {
                client.Dispose();
                return;
            }

            var request = requestPayload.Deserialize<ConnectionRequestMessage>()!;

            if (!string.IsNullOrEmpty(request.Password))
            {
                await HandleUnattendedAccessAttemptAsync(stream, client, remoteId, request.Password, ct).ConfigureAwait(false);
                return;
            }

            var incoming = new IncomingConnectionRequest(remoteId, request.RequestedPermissions);

            var handler = OnConnectionRequested;
            var decision = handler is null
                ? ConnectionDecision.Reject("No one is available to accept connections right now.")
                : await handler(incoming).ConfigureAwait(false);

            await MessageStream.WriteAsync(
                stream,
                MessageType.ConnectionDecision,
                new ConnectionDecisionMessage(decision.Accepted, decision.GrantedPermissions, decision.Reason),
                ct).ConfigureAwait(false);

            if (!decision.Accepted)
            {
                client.Dispose();
                return;
            }

            SessionEstablished?.Invoke(new RemoteSession(remoteId, client, stream, decision.GrantedPermissions, isInitiator: false));
        }
        catch (Exception)
        {
            // Malformed handshake, disconnect mid-negotiation, etc: just drop this one connection.
            client.Dispose();
        }
    }

    private async Task HandleUnattendedAccessAttemptAsync(
        Stream stream, TcpClient client, DeviceId remoteId, string password, CancellationToken ct)
    {
        try
        {
            var rateLimitKey = remoteId.Raw;
            ConnectionDecision decision;

            if (!_unattendedAccessRateLimiter.IsAllowed(rateLimitKey))
            {
                decision = ConnectionDecision.Reject("Too many attempts. Try again later.");
            }
            else
            {
                var granted = UnattendedAccessPolicy?.TryAuthenticate(password);
                if (granted is null)
                {
                    _unattendedAccessRateLimiter.RecordFailedAttempt(rateLimitKey);
                    decision = ConnectionDecision.Reject("Incorrect password.");
                }
                else
                {
                    decision = new ConnectionDecision(true, granted.Value);
                }
            }

            await MessageStream.WriteAsync(
                stream,
                MessageType.ConnectionDecision,
                new ConnectionDecisionMessage(decision.Accepted, decision.GrantedPermissions, decision.Reason),
                ct).ConfigureAwait(false);

            if (!decision.Accepted)
            {
                client.Dispose();
                return;
            }

            SessionEstablished?.Invoke(new RemoteSession(remoteId, client, stream, decision.GrantedPermissions, isInitiator: false));
        }
        catch (Exception)
        {
            client.Dispose();
        }
    }

    public async ValueTask DisposeAsync()
    {
        await _cts.CancelAsync().ConfigureAwait(false);
        _listener.Stop();

        if (_acceptLoop is not null)
        {
            try
            {
                await _acceptLoop.ConfigureAwait(false);
            }
            catch (Exception)
            {
                // Accept loop already swallows its own cancellation/shutdown exceptions.
            }
        }

        _cts.Dispose();
    }
}
