using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;

namespace IPCast.Network;

public static class WakeOnLan
{
    public static byte[] CreateMagicPacket(string address)
    {
        if (!PhysicalAddress.TryParse(address, out var parsed) || parsed.GetAddressBytes() is not { Length: 6 } mac ||
            mac.All(b => b == 0) || (mac[0] & 1) != 0)
            throw new ArgumentException("Enter a valid unicast MAC address, such as 00-11-22-33-44-55.");
        var packet = new byte[102];
        Array.Fill(packet, (byte)255, 0, 6);
        for (var i = 0; i < 16; i++) mac.CopyTo(packet, 6 + i * 6);
        return packet;
    }

    public static async Task SendAsync(string address, CancellationToken ct = default)
    {
        var packet = CreateMagicPacket(address);
        using var udp = new UdpClient(AddressFamily.InterNetwork) { EnableBroadcast = true };
        await udp.SendAsync(packet, new IPEndPoint(IPAddress.Broadcast, 9), ct).ConfigureAwait(false);
    }
}
