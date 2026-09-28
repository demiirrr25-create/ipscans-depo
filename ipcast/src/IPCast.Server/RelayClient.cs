using System.Net;
using System.Net.Sockets;
using IPCast.Network.Protocol;

namespace IPCast.Server;

/// <summary>Connects to a <see cref="RelayServer"/> and registers for a relay pairing (client side of spec §12-13).</summary>
public static class RelayClient
{
    /// <summary>
    /// Registers with the relay for a connection to <paramref name="targetDeviceId"/> and waits for
    /// the relay to pair it with the other side. Returns the raw, unencrypted network stream once
    /// paired - callers (e.g. IPCastConnector/IPCastHost) then run their own TLS handshake and
    /// protocol on top of it, exactly as they would over a direct TCP connection.
    /// </summary>
    public static async Task<NetworkStream> ConnectViaRelayAsync(
        IPEndPoint relayEndpoint, string localDeviceId, string targetDeviceId, CancellationToken ct = default)
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

            return stream;
        }
        catch
        {
            client.Dispose();
            throw;
        }
    }
}
