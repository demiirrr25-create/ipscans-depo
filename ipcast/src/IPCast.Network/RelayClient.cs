using System.Net;
using System.Net.Sockets;
using IPCast.Network.Protocol;

namespace IPCast.Network;

/// <summary>
/// Connects to a relay server (<c>IPCast.Server.RelayServer</c>) and registers for a pairing
/// (client side of spec §12-13). Lives here rather than in IPCast.Server so
/// <see cref="IPCastConnector"/> can use it directly as a LAN-discovery-failed fallback without
/// creating a circular project reference.
/// </summary>
public static class RelayClient
{
    /// <summary>
    /// Registers with the relay and waits to be paired. Pass a specific <paramref name="targetDeviceId"/>
    /// to request a connection to that exact device, or null to register as reachable by anyone
    /// (used by <see cref="IPCastHost"/> to accept relay connections the same way it accepts LAN
    /// ones, without knowing in advance who'll connect). Returns the raw, unencrypted TCP
    /// client/stream once paired - callers then run their own TLS handshake and protocol on top of
    /// it, exactly as they would over a direct TCP connection.
    /// </summary>
    public static async Task<(TcpClient Client, NetworkStream Stream)> ConnectViaRelayAsync(
        IPEndPoint relayEndpoint, string localDeviceId, string? targetDeviceId, CancellationToken ct = default)
    {
        var client = new TcpClient();
        try
        {
            await client.ConnectAsync(relayEndpoint.Address, relayEndpoint.Port, ct).ConfigureAwait(false);
            var stream = client.GetStream();

            await MessageStream.WriteAsync(
                stream, MessageType.RelayRegister, new RelayRegisterMessage(localDeviceId, targetDeviceId), ct)
                .ConfigureAwait(false);

            var (type, _) = await MessageStream.ReadAsync(stream, ct).ConfigureAwait(false);
            if (type != MessageType.RelayReady)
            {
                throw new InvalidOperationException("Relay server sent an unexpected response instead of confirming readiness.");
            }

            return (client, stream);
        }
        catch
        {
            client.Dispose();
            throw;
        }
    }
}
