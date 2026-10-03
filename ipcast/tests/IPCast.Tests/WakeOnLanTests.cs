using IPCast.Network;
using Xunit;
namespace IPCast.Tests;
public class WakeOnLanTests
{
    [Fact] public void PacketContainsSyncAndSixteenMacCopies()
    {
        var packet = WakeOnLan.CreateMagicPacket("00-11-22-33-44-55");
        Assert.Equal(102, packet.Length);
        Assert.All(packet.Take(6), b => Assert.Equal(255, b));
        for (var i = 0; i < 16; i++) Assert.Equal(new byte[] { 0, 17, 34, 51, 68, 85 }, packet.Skip(6 + i * 6).Take(6));
    }
    [Theory]
    [InlineData("FF-FF-FF-FF-FF-FF")]
    [InlineData("invalid")]
    public void RejectsInvalidDestination(string address) => Assert.Throws<ArgumentException>(() => WakeOnLan.CreateMagicPacket(address));
}
