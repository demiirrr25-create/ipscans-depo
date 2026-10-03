using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Text.Json;
using IPCast.Shared;

namespace IPCast.Network;

/// <summary>
/// Finds another IPCast device's TCP endpoint on the local network via UDP broadcast, so users only
/// ever need to type a 9-digit ID - never an IP address - as long as both devices are on the same LAN
/// (spec §13: "aynı LAN içerisindeki bilgisayarlar mümkünse doğrudan birbirine bağlansın"). Reaching a
/// device on a *different* network needs a rendezvous/relay server, which is Phase 4-6, not this class.
/// </summary>
public sealed class LanDiscoveryService : IDisposable
{
    public const int DefaultDiscoveryPort = 48700;
    private const string RequestPrefix = "IPCAST-WHOIS:";
    private const string ResponsePrefix = "IPCAST-HERE:";
    private const string DevicePrefix = "IPCAST-DEVICE:";

    private readonly DeviceId _localDeviceId;
    private readonly int _tcpPort;
    private readonly UdpClient _responder;
    private readonly CancellationTokenSource _cts = new();
    private readonly Task _responderLoop;

    /// <param name="localDeviceId">This device's own ID - only requests asking for this ID get a reply.</param>
    /// <param name="tcpPort">The <see cref="IPCastHost"/> port to tell requesters to connect to.</param>
    public LanDiscoveryService(DeviceId localDeviceId, int tcpPort, int discoveryPort = DefaultDiscoveryPort)
    {
        _localDeviceId = localDeviceId;
        _tcpPort = tcpPort;
        _responder = new UdpClient(AddressFamily.InterNetwork);
        _responder.Client.SetSocketOption(SocketOptionLevel.Socket, SocketOptionName.ReuseAddress, true);
        _responder.Client.Bind(new IPEndPoint(IPAddress.Any, discoveryPort));
        _responderLoop = RunResponderAsync(_cts.Token);
    }

    /// <summary>The bound UDP port - useful when constructed with discoveryPort 0 (let the OS pick one).</summary>
    public int Port => ((IPEndPoint)_responder.Client.LocalEndPoint!).Port;

    private async Task RunResponderAsync(CancellationToken ct)
    {
        var window = Environment.TickCount64;
        var responses = 0;
        while (!ct.IsCancellationRequested)
        {
            UdpReceiveResult result;
            try
            {
                result = await _responder.ReceiveAsync(ct).ConfigureAwait(false);
            }
            catch (Exception ex) when (ex is OperationCanceledException or ObjectDisposedException)
            {
                return;
            }

            if (result.Buffer.Length > 64) continue;
            if (Environment.TickCount64 - window >= 1000) { window = Environment.TickCount64; responses = 0; }
            if (responses >= 20) continue;
            var text = Encoding.UTF8.GetString(result.Buffer);
            if (text == RequestPrefix + "*")
            {
                responses++;
                var info = new DiscoveredDevice(_localDeviceId.Raw, Environment.MachineName,
                    System.Runtime.InteropServices.RuntimeInformation.OSDescription, "", _tcpPort);
                var packet = Encoding.UTF8.GetBytes(DevicePrefix + JsonSerializer.Serialize(info));
                try { await _responder.SendAsync(packet, result.RemoteEndPoint, ct).ConfigureAwait(false); }
                catch (Exception ex) when (ex is SocketException or OperationCanceledException or ObjectDisposedException) { }
                continue;
            }
            if (!text.StartsWith(RequestPrefix, StringComparison.Ordinal))
            {
                continue;
            }

            if (text[RequestPrefix.Length..] != _localDeviceId.Raw)
            {
                continue;
            }

            var response = Encoding.UTF8.GetBytes($"{ResponsePrefix}{_localDeviceId.Raw}:{_tcpPort}");
            responses++;
            try
            {
                await _responder.SendAsync(response, result.RemoteEndPoint, ct).ConfigureAwait(false);
            }
            catch (Exception ex) when (ex is OperationCanceledException or ObjectDisposedException)
            {
                return;
            }
        }
    }

    /// <summary>
    /// Broadcasts "who has this ID" on the local network and waits (up to <paramref name="timeout"/>)
    /// for that device's <see cref="LanDiscoveryService"/> to answer with its current TCP endpoint.
    /// </summary>
    /// <param name="overrideTarget">
    /// Send the request to this specific endpoint instead of the broadcast address - used by tests
    /// (and would also let a user manually target a specific host that broadcast can't reach).
    /// </param>
    public static async Task<IPEndPoint?> DiscoverAsync(
        DeviceId targetId,
        TimeSpan timeout,
        int discoveryPort = DefaultDiscoveryPort,
        IPEndPoint? overrideTarget = null,
        CancellationToken ct = default)
    {
        using var client = new UdpClient(AddressFamily.InterNetwork);
        client.EnableBroadcast = true;
        client.Client.Bind(new IPEndPoint(IPAddress.Any, 0));

        var request = Encoding.UTF8.GetBytes($"{RequestPrefix}{targetId.Raw}");
        var destination = overrideTarget ?? new IPEndPoint(IPAddress.Broadcast, discoveryPort);
        await client.SendAsync(request, destination, ct).ConfigureAwait(false);

        using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeoutCts.CancelAfter(timeout);

        try
        {
            while (true)
            {
                var result = await client.ReceiveAsync(timeoutCts.Token).ConfigureAwait(false);
                var text = Encoding.UTF8.GetString(result.Buffer);
                if (!text.StartsWith(ResponsePrefix, StringComparison.Ordinal))
                {
                    continue;
                }

                var parts = text[ResponsePrefix.Length..].Split(':');
                if (parts.Length == 2 && parts[0] == targetId.Raw && int.TryParse(parts[1], out var port) && port is > 0 and <= 65535)
                {
                    return new IPEndPoint(result.RemoteEndPoint.Address, port);
                }
            }
        }
        catch (OperationCanceledException)
        {
            return null;
        }
    }

    public void Dispose()
    {
        _cts.Cancel();
        _responder.Dispose();
        _cts.Dispose();
    }

    public static async Task<IReadOnlyList<DiscoveredDevice>> DiscoverAllAsync(TimeSpan timeout,
        int discoveryPort = DefaultDiscoveryPort, IPEndPoint? overrideTarget = null, CancellationToken ct = default)
    {
        using var client = new UdpClient(AddressFamily.InterNetwork) { EnableBroadcast = true };
        using var lifetime = CancellationTokenSource.CreateLinkedTokenSource(ct);
        lifetime.CancelAfter(timeout);
        var found = new Dictionary<string, DiscoveredDevice>();
        await client.SendAsync(Encoding.UTF8.GetBytes(RequestPrefix + "*"),
            overrideTarget ?? new IPEndPoint(IPAddress.Broadcast, discoveryPort), ct).ConfigureAwait(false);
        try
        {
            while (found.Count < 256)
            {
                var result = await client.ReceiveAsync(lifetime.Token).ConfigureAwait(false);
                if (result.Buffer.Length > 4096) continue;
                var text = Encoding.UTF8.GetString(result.Buffer);
                if (!text.StartsWith(DevicePrefix, StringComparison.Ordinal)) continue;
                try
                {
                    var device = JsonSerializer.Deserialize<DiscoveredDevice>(text[DevicePrefix.Length..]);
                    if (device is null || !DeviceId.TryParse(device.DeviceId, out _) || device.Port is < 1 or > 65535 ||
                        device.Name is null || device.Name.Length > 128 || device.Platform is null || device.Platform.Length > 256) continue;
                    found[device.DeviceId] = device with { Address = result.RemoteEndPoint.Address.ToString() };
                }
                catch (JsonException) { }
            }
        }
        catch (OperationCanceledException) when (!ct.IsCancellationRequested) { }
        return found.Values.ToArray();
    }
}

public sealed record DiscoveredDevice(string DeviceId, string Name, string Platform, string Address, int Port)
{
    public string Description => $"{Name} · {DeviceId} · {Address}:{Port} · {Platform}";
}
