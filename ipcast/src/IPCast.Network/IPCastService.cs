using System.Net;
using System.Security.Cryptography.X509Certificates;
using IPCast.Shared;

namespace IPCast.Network;

/// <summary>
/// The single facade a UI needs to run one IPCast device: accepts incoming connections
/// (<see cref="OnConnectionRequested"/>/<see cref="SessionEstablished"/>) and places outgoing ones
/// (<see cref="ConnectAsync"/>), finding peers by ID via <see cref="LanDiscoveryService"/> and
/// falling back to <see cref="RelayServerEndpoint"/> (if one is configured) when the target isn't
/// on the same LAN.
/// </summary>
public sealed class IPCastService : IAsyncDisposable
{
    private readonly DeviceId _localDeviceId;
    private readonly int _discoveryPort;
    private readonly IPCastHost _host;
    private readonly IPCastConnector _connector;
    private LanDiscoveryService? _discovery;
    private Task? _relayListenTask;

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

        if (RelayServerEndpoint is not null)
        {
            _relayListenTask = _host.ListenViaRelayAsync(RelayServerEndpoint, _localDeviceId);
        }
    }

    /// <summary>
    /// Optional relay server address (spec §12-13) to fall back to when the target isn't found on
    /// the local network - e.g. because it's on a different network entirely. Null (the default)
    /// means LAN-only: no relay is contacted and a LAN miss is reported as a plain failure. Nothing
    /// sets this automatically; it only does anything if the user has been given (and entered) the
    /// address of a relay server someone deliberately chose to run. Must be set before
    /// <see cref="Start"/> for this device to also be reachable *via* the relay (not just able to
    /// reach others through it) - see <see cref="IPCastHost.ListenViaRelayAsync"/>.
    /// </summary>
    public IPEndPoint? RelayServerEndpoint { get; set; }

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
            return await _connector
                .ConnectViaRelayAsync(RelayServerEndpoint, targetId, requestedPermissions, password, ct)
                .ConfigureAwait(false);
        }

        return ConnectResult.Failed(
            "Couldn't find that ID on the local network, and no relay server is configured for connecting over the internet (Settings).");
    }

    public async ValueTask DisposeAsync()
    {
        _discovery?.Dispose();
        await _host.DisposeAsync().ConfigureAwait(false);

        if (_relayListenTask is not null)
        {
            try
            {
                await _relayListenTask.ConfigureAwait(false);
            }
            catch (Exception)
            {
                // ListenViaRelayAsync already swallows its own cancellation/network-failure exceptions.
            }
        }
    }
}
