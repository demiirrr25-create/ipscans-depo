using System.Net;
using System.Net.Security;
using System.Net.Sockets;
using System.Security.Authentication;
using System.Text.Json;
using IPCast.Network.Protocol;
using IPCast.Shared;

namespace IPCast.Network;

/// <summary>Places outbound connections to other IPCast devices (spec §4: the "CONNECT" flow).</summary>
public sealed class IPCastConnector
{
    private const string AppVersion = "1.0.0-phase2";

    private readonly DeviceId _localDeviceId;
    public Func<string, string, Task<bool>>? VerifyPeerCertificateAsync { get; set; }

    public IPCastConnector(DeviceId localDeviceId)
    {
        _localDeviceId = localDeviceId;
    }

    public async Task<ConnectResult> ConnectAsync(
        IPEndPoint remoteEndpoint,
        DeviceId remoteDeviceId,
        ConnectionPermissions requestedPermissions,
        string? password = null,
        CancellationToken ct = default)
    {
        var client = new TcpClient();
        try
        {
            using var dialTimeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
            dialTimeout.CancelAfter(TimeSpan.FromSeconds(5));
            await client.ConnectAsync(remoteEndpoint.Address, remoteEndpoint.Port, dialTimeout.Token).ConfigureAwait(false);
            return await ConnectAsync(
                client.GetStream(),
                remoteDeviceId,
                requestedPermissions,
                password,
                client: client,
                ct: ct,
                trustKey: remoteDeviceId == _localDeviceId ? remoteEndpoint.ToString() : remoteDeviceId.Raw,
                connectionKind: ConnectionKind.Direct).ConfigureAwait(false);
        }
        catch (Exception ex) when (ex is SocketException or IOException or InvalidDataException
            or OperationCanceledException or System.Security.Authentication.AuthenticationException)
        {
            client.Dispose();
            return ConnectResult.Failed($"Couldn't connect: {ex.Message}");
        }
    }

    public async Task<ConnectResult> ConnectAsync(
        Stream rawStream,
        DeviceId remoteDeviceId,
        ConnectionPermissions requestedPermissions,
        string? password = null,
        TcpClient? client = null,
        IDisposable? ownerToDispose = null,
        CancellationToken ct = default,
        string? trustKey = null,
        ConnectionKind connectionKind = ConnectionKind.Unknown)
    {
        try
        {
            var sslStream = new SslStream(rawStream, leaveInnerStreamOpen: false, TlsPolicy.AcceptAnyCertificate);
            await sslStream.AuthenticateAsClientAsync(
                new SslClientAuthenticationOptions
                {
                    TargetHost = remoteDeviceId.Raw,
                    EnabledSslProtocols = SslProtocols.None,
                },
                ct).ConfigureAwait(false);
            Stream stream = sslStream;

            if (VerifyPeerCertificateAsync is { } verify)
            {
                var fingerprint = sslStream.RemoteCertificate?.GetCertHashString(System.Security.Cryptography.HashAlgorithmName.SHA256);
                if (fingerprint is null || !await verify(trustKey ?? remoteDeviceId.Raw, fingerprint).WaitAsync(ct).ConfigureAwait(false))
                {
                    sslStream.Dispose(); client?.Dispose(); ownerToDispose?.Dispose();
                    return ConnectResult.Reject("The remote certificate was not approved. Compare the fingerprint with the remote device before connecting.");
                }
            }

            await MessageStream.WriteAsync(stream, MessageType.Hello, new HelloMessage(_localDeviceId.Raw, AppVersion), ct)
                .ConfigureAwait(false);
            await MessageStream.WriteAsync(
                stream,
                MessageType.ConnectionRequest,
                new ConnectionRequestMessage(_localDeviceId.Raw, requestedPermissions, password),
                ct).ConfigureAwait(false);

            var (type, payload) = await MessageStream.ReadAsync(stream, ct).ConfigureAwait(false);
            if (type != MessageType.ConnectionDecision)
            {
                client?.Dispose();
                ownerToDispose?.Dispose();
                rawStream.Dispose();
                return ConnectResult.Failed("The remote device sent an unexpected response.");
            }

            var decision = payload.Deserialize<ConnectionDecisionMessage>()
                ?? throw new InvalidDataException("The remote device sent an empty decision.");
            if (!decision.Accepted)
            {
                client?.Dispose();
                ownerToDispose?.Dispose();
                rawStream.Dispose();
                return ConnectResult.Reject(decision.Reason ?? "The remote device declined the connection.");
            }

            if ((decision.GrantedPermissions & ~requestedPermissions) != ConnectionPermissions.None)
            {
                sslStream.Dispose(); client?.Dispose(); ownerToDispose?.Dispose();
                return ConnectResult.Reject("The remote device returned permissions that were not requested.");
            }
            if (decision.HostDeviceId is not null &&
                (!DeviceId.TryParse(decision.HostDeviceId, out var declaredId) ||
                 (remoteDeviceId != _localDeviceId && declaredId != remoteDeviceId)))
            {
                sslStream.Dispose(); client?.Dispose(); ownerToDispose?.Dispose();
                return ConnectResult.Reject("The remote device identity does not match the requested device.");
            }

            var session = new RemoteSession(
                DeviceId.TryParse(decision.HostDeviceId ?? "", out var hostId) ? hostId : remoteDeviceId,
                client,
                stream,
                decision.GrantedPermissions,
                isInitiator: true,
                ownerToDispose: ownerToDispose,
                connectionKind: connectionKind);
            return ConnectResult.Succeeded(session);
        }
        catch (Exception ex) when (ex is SocketException or IOException or InvalidDataException
            or OperationCanceledException or System.Security.Authentication.AuthenticationException)
        {
            client?.Dispose();
            ownerToDispose?.Dispose();
            rawStream.Dispose();
            return ConnectResult.Failed($"Couldn't connect: {ex.Message}");
        }
    }
}
