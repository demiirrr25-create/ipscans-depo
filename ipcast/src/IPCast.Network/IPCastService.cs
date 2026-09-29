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

    public IPCastService(
        DeviceId localDeviceId,
        X509Certificate2 certificate,
        int discoveryPort = LanDiscoveryService.DefaultDiscoveryPort)
    {
        _localDeviceId = localDeviceId;
        _discoveryPort = discoveryPort;
        _host = new IPCastHost(certificate, port: 0);
        _host.SessionEstablished += session => SessionEstablished?.Invoke(session);
        _connector = new IPCastConnector(localDeviceId);

        var relayEnv = Environment.GetEnvironmentVariable("IPCAST_RELAY_SERVER");
        if (!string.IsNullOrWhiteSpace(relayEnv) && TryParseEndpoint(relayEnv, 9876, out var relayEp))
        {
            RelayServerEndpoint = relayEp;
        }
    }

    /// <summary>Optional relay server endpoint used for non-LAN / NAT-traversal connections.</summary>
    public System.Net.IPEndPoint? RelayServerEndpoint { get; set; }

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
    }

    public async Task<ConnectResult> ConnectAsync(
        string targetInput,
        ConnectionPermissions requestedPermissions,
        string? password = null,
        TimeSpan? discoveryTimeout = null,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(targetInput))
        {
            return ConnectResult.Failed("Please enter a 9-digit IPCast ID or direct IP:port address.");
        }

        if (DeviceId.TryParse(targetInput, out var targetId))
        {
            return await ConnectAsync(targetId, requestedPermissions, password, discoveryTimeout, ct).ConfigureAwait(false);
        }

        if (TryParseEndpoint(targetInput, _host.Port > 0 ? _host.Port : 9876, out var directEndpoint) && directEndpoint is not null)
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

        if (RelayServerEndpoint is not null)
        {
            try
            {
                var relayStream = await RelayClient.ConnectViaRelayAsync(
                    RelayServerEndpoint, _localDeviceId.Raw, targetId.Raw, ct).ConfigureAwait(false);

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

    private static bool TryParseEndpoint(string input, int defaultPort, out System.Net.IPEndPoint? endpoint)
    {
        endpoint = null;
        if (string.IsNullOrWhiteSpace(input)) return false;

        input = input.Trim();
        if (System.Net.IPEndPoint.TryParse(input, out endpoint)) return true;

        if (System.Net.IPAddress.TryParse(input, out var ip))
        {
            endpoint = new System.Net.IPEndPoint(ip, defaultPort);
            return true;
        }

        var parts = input.Split(':');
        if (parts.Length == 2 && System.Net.IPAddress.TryParse(parts[0], out var hostIp) && int.TryParse(parts[1], out var port))
        {
            endpoint = new System.Net.IPEndPoint(hostIp, port);
            return true;
        }

        return false;
    }

    public async ValueTask DisposeAsync()
    {
        _discovery?.Dispose();
        await _host.DisposeAsync().ConfigureAwait(false);
    }
}
