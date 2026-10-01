using System.Net;
using System.Net.Sockets;
using IPCast.Network.Protocol;

namespace IPCast.Network;

/// <summary>Connects to a RelayServer and registers for a relay pairing (client side of spec §12-13).</summary>
public static class RelayClient
{
    public static Task<Stream> ConnectViaRelayAsync(RelayAddress address, string localDeviceId, string targetDeviceId, CancellationToken ct = default)
        => RegisterAsync(address, localDeviceId, targetDeviceId, MessageType.RelayRegister, ct);

    public static Task<Stream> ListenAsync(RelayAddress address, string deviceId, CancellationToken ct = default)
        => RegisterAsync(address, deviceId, "", MessageType.RelayListen, ct);

    private static async Task<Stream> RegisterAsync(RelayAddress address, string deviceId, string targetId, MessageType type, CancellationToken ct)
    {
        if (address.TcpEndpoint is { } tcp) return await RegisterAsync(tcp, deviceId, targetId, type, ct);
        var socket = new System.Net.WebSockets.ClientWebSocket();
        socket.Options.KeepAliveInterval = TimeSpan.FromSeconds(20);
        socket.Options.KeepAliveTimeout = TimeSpan.FromSeconds(20);
        var stream = new WebSocketStream(socket);
        try
        {
            await socket.ConnectAsync(address.WebSocketUri!, ct).ConfigureAwait(false);
            await MessageStream.WriteAsync(stream, type, new RelayRegisterMessage(deviceId, targetId), ct).ConfigureAwait(false);
            var (reply, _) = await MessageStream.ReadAsync(stream, ct).ConfigureAwait(false);
            if (reply != MessageType.RelayReady) throw new IOException("Relay did not confirm readiness.");
            return stream;
        }
        catch { stream.Dispose(); throw; }
    }

    /// <summary>
    /// Registers with the relay for a connection to <paramref name="targetDeviceId"/> and waits for
    /// the relay to pair it with the other side. Returns the raw, unencrypted network stream once
    /// paired - callers (e.g. IPCastConnector/IPCastHost) then run their own TLS handshake and
    /// protocol on top of it, exactly as they would over a direct TCP connection.
    /// </summary>
    public static async Task<NetworkStream> ConnectViaRelayAsync(
        IPEndPoint relayEndpoint, string localDeviceId, string targetDeviceId, CancellationToken ct = default)
        => await RegisterAsync(relayEndpoint, localDeviceId, targetDeviceId, MessageType.RelayRegister, ct);

    public static Task<NetworkStream> ListenAsync(IPEndPoint endpoint, string deviceId, CancellationToken ct = default)
        => RegisterAsync(endpoint, deviceId, "", MessageType.RelayListen, ct);

    private static async Task<NetworkStream> RegisterAsync(
        IPEndPoint relayEndpoint, string localDeviceId, string targetDeviceId, MessageType registrationType, CancellationToken ct)
    {
        var client = new TcpClient();
        try
        {
            await client.ConnectAsync(relayEndpoint.Address, relayEndpoint.Port, ct).ConfigureAwait(false);
            var stream = client.GetStream();

            await MessageStream.WriteAsync(
                stream, registrationType, new RelayRegisterMessage(localDeviceId, targetDeviceId), ct)
                .ConfigureAwait(false);

            var (type, _) = await MessageStream.ReadAsync(stream, ct).ConfigureAwait(false);
            if (type != MessageType.RelayReady)
            {
                throw new InvalidOperationException("Relay server sent an unexpected response instead of confirming readiness.");
            }

            return stream;
        }
        catch
        {
            client.Dispose();
            throw;
        }
    }
}
