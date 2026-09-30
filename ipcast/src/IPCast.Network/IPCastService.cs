using System.Security.Cryptography.X509Certificates;
using IPCast.Shared;

namespace IPCast.Network;

/// <summary>
/// The single facade a UI needs to run one IPCast device on the local network: accepts incoming
/// connections (<see cref="OnConnectionRequested"/>/<see cref="SessionEstablished"/>) and places
/// outgoing ones (<see cref="ConnectAsync"/>), finding peers by ID via <see cref="LanDiscoveryService"/>.
/// Internet connections when peers aren't on the same LAN require a relay/signaling server - that's
/// Phase 4-6, not this class.
/// </summary>
public sealed class IPCastService : IAsyncDisposable
{
    private readonly DeviceId _localDeviceId;
    private readonly int _discoveryPort;
    private readonly IPCastHost _host;
    private readonly IPCastConnector _connector;
    private LanDiscoveryService? _discovery;
    private CancellationTokenSource? _relayCts;
    private Task? _relayListener;
    private RelayAddress? _relayAddress;
    private bool _started;
    public int ListeningPort => _host.Port;
    public event Action<string>? RelayStatusChanged;
    public Func<string, string, Task<bool>>? VerifyPeerCertificateAsync
    {
        get => _connector.VerifyPeerCertificateAsync;
        set => _connector.VerifyPeerCertificateAsync = value;
    }

    public IPCastService(
        DeviceId localDeviceId,
        X509Certificate2 certificate,
        int discoveryPort = LanDiscoveryService.DefaultDiscoveryPort)
    {
        _localDeviceId = localDeviceId;
        _discoveryPort = discoveryPort;
        _host = new IPCastHost(certificate, port: 0) { LocalDeviceId = localDeviceId };
        _host.SessionEstablished += session => SessionEstablished?.Invoke(session);
        _connector = new IPCastConnector(localDeviceId);

        var relayEnv = Environment.GetEnvironmentVariable("IPCAST_RELAY_SERVER");
        if (RelayAddress.TryParse(relayEnv, out var relayAddress))
        {
            RelayServerAddress = relayAddress;
        }
    }

    /// <summary>Optional relay server endpoint used for non-LAN / NAT-traversal connections.</summary>
    public System.Net.IPEndPoint? RelayServerEndpoint
    {
        get => _relayAddress?.TcpEndpoint;
        set => RelayServerAddress = value is null ? null : new RelayAddress(value, null);
    }

    public RelayAddress? RelayServerAddress
    {
        get => _relayAddress;
        set
        {
            _relayAddress = value;
            _relayCts?.Cancel();
            if (_started && value is not null)
            {
                _relayCts = new CancellationTokenSource();
                _relayListener = ListenOnRelayAsync(value, _relayCts.Token);
            }
        }
    }

    /// <summary>Must be set before <see cref="Start"/> to actually respond to incoming requests.</summary>
    public ConnectionRequestHandler? OnConnectionRequested
    {
        get => _host.OnConnectionRequested;
        set => _host.OnConnectionRequested = value;
    }

    /// <summary>If set, incoming requests with the correct password (spec §9) are accepted without an interactive prompt.</summary>
    public IUnattendedAccessPolicy? UnattendedAccessPolicy
    {
        get => _host.UnattendedAccessPolicy;
        set => _host.UnattendedAccessPolicy = value;
    }

    public event Action<RemoteSession>? SessionEstablished;

    public void Start()
    {
        _host.Start();
        _discovery = new LanDiscoveryService(_localDeviceId, _host.Port, _discoveryPort);
        _started = true;
        RelayServerAddress = _relayAddress;
    }

    public async Task<ConnectResult> ConnectAsync(
        string targetInput,
        ConnectionPermissions requestedPermissions,
        string? password = null,
        TimeSpan? discoveryTimeout = null,
        CancellationToken ct = default)
    {
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeout.CancelAfter(TimeSpan.FromSeconds(45));
        ct = timeout.Token;
        if (string.IsNullOrWhiteSpace(targetInput))
        {
            return ConnectResult.Failed("Please enter a 9-digit IPCast ID or direct IP:port address.");
        }

        if (DeviceId.TryParse(targetInput, out var targetId))
        {
            return await ConnectAsync(targetId, requestedPermissions, password, discoveryTimeout, ct).ConfigureAwait(false);
        }

        if (TryParseEndpoint(targetInput, 0, out var directEndpoint) && directEndpoint is not null)
        {
            var dummyTargetId = _localDeviceId; // direct IP connection
            return await _connector.ConnectAsync(directEndpoint, dummyTargetId, requestedPermissions, password, ct).ConfigureAwait(false);
        }

        return ConnectResult.Failed("Enter a valid 9-digit IPCast ID or IP:port address (e.g. 192.168.1.50:9876).");
    }

    public async Task<ConnectResult> ConnectAsync(
        DeviceId targetId,
        ConnectionPermissions requestedPermissions,
        string? password = null,
        TimeSpan? discoveryTimeout = null,
        CancellationToken ct = default)
    {
        if (targetId == _localDeviceId)
        {
            return ConnectResult.Failed("You can't connect to your own device.");
        }

        var endpoint = await LanDiscoveryService
            .DiscoverAsync(targetId, discoveryTimeout ?? TimeSpan.FromSeconds(3), _discoveryPort, ct: ct)
            .ConfigureAwait(false);

        if (endpoint is not null)
        {
            return await _connector.ConnectAsync(endpoint, targetId, requestedPermissions, password, ct).ConfigureAwait(false);
        }

        if (RelayServerAddress is { } relayAddress)
        {
            try
            {
                var relayStream = await RelayClient.ConnectViaRelayAsync(
                    relayAddress, _localDeviceId.Raw, targetId.Raw, ct).ConfigureAwait(false);

                return await _connector.ConnectAsync(
                    relayStream, targetId, requestedPermissions, password, ct: ct).ConfigureAwait(false);
            }
            catch (Exception ex)
            {
                return ConnectResult.Failed($"Relay connection attempt failed: {ex.Message}");
            }
        }

        return ConnectResult.Failed(
            "Couldn't find that ID on the local network. Configure a Relay Server in Settings or enter direct IP:port to connect across networks.");
    }

    public static bool TryParseEndpoint(string input, int defaultPort, out System.Net.IPEndPoint? endpoint)
    {
        endpoint = null;
        if (string.IsNullOrWhiteSpace(input)) return false;

        input = input.Trim();
        if (System.Net.IPEndPoint.TryParse(input, out endpoint) && endpoint.Port > 0) return true;
        if (System.Net.IPAddress.TryParse(input, out var ip))
        {
            if (defaultPort <= 0 || defaultPort > 65535) return false;
            endpoint = new System.Net.IPEndPoint(ip, defaultPort);
            return true;
        }
        return System.Net.IPEndPoint.TryParse(input, out endpoint) && endpoint.Port > 0;
    }

    private async Task ListenOnRelayAsync(RelayAddress endpoint, CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            try
            {
                RelayStatusChanged?.Invoke($"Waiting for incoming connections via {endpoint}.");
                var stream = await RelayClient.ListenAsync(endpoint, _localDeviceId.Raw, ct).ConfigureAwait(false);
                _ = BridgeRelayAsync(stream, ct);
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested) { break; }
            catch (Exception ex)
            {
                RelayStatusChanged?.Invoke($"Relay unavailable: {ex.Message} Retrying...");
                try { await Task.Delay(TimeSpan.FromSeconds(5), ct).ConfigureAwait(false); }
                catch (OperationCanceledException) { break; }
            }
        }
    }

    private async Task BridgeRelayAsync(Stream relayStream, CancellationToken ct)
    {
        using (relayStream)
        using (var local = new System.Net.Sockets.TcpClient())
        using (var lifetime = CancellationTokenSource.CreateLinkedTokenSource(ct))
        {
            try
            {
                await local.ConnectAsync(System.Net.IPAddress.Loopback, _host.Port, ct).ConfigureAwait(false);
                var toHost = relayStream.CopyToAsync(local.GetStream(), lifetime.Token);
                var fromHost = local.GetStream().CopyToAsync(relayStream, lifetime.Token);
                await Task.WhenAny(toHost, fromHost).ConfigureAwait(false);
                lifetime.Cancel();
                local.Dispose();
                relayStream.Dispose();
                await Task.WhenAll(toHost, fromHost).ConfigureAwait(false);
            }
            catch (Exception) { /* TLS handshake and permission handling stay in IPCastHost. */ }
        }
    }

    public async ValueTask DisposeAsync()
    {
        _started = false;
        _relayCts?.Cancel();
        if (_relayListener is not null) await _relayListener.ConfigureAwait(false);
        _relayCts?.Dispose();
        _discovery?.Dispose();
        await _host.DisposeAsync().ConfigureAwait(false);
    }
}
