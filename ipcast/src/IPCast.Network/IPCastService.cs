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

        if (endpoint is null)
        {
            return ConnectResult.Failed(
                "Couldn't find that ID on the local network. Internet connections aren't available yet (Phase 4 of the roadmap).");
        }

        return await _connector.ConnectAsync(endpoint, targetId, requestedPermissions, password, ct).ConfigureAwait(false);
    }

    public async ValueTask DisposeAsync()
    {
        _discovery?.Dispose();
        await _host.DisposeAsync().ConfigureAwait(false);
    }
}
