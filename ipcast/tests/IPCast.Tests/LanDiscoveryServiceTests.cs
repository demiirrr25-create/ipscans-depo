using System.Net;
using IPCast.Network;
using IPCast.Shared;
using Xunit;

namespace IPCast.Tests;

public class LanDiscoveryServiceTests
{
    [Fact]
    public async Task DiscoverAsync_FindsRunningServiceByOverrideEndpoint()
    {
        var targetId = DeviceId.FromValidatedRaw("777888999");
        using var service = new LanDiscoveryService(targetId, tcpPort: 54321, discoveryPort: 0);

        var found = await LanDiscoveryService.DiscoverAsync(
            targetId,
            TimeSpan.FromSeconds(3),
            overrideTarget: new IPEndPoint(IPAddress.Loopback, service.Port));

        Assert.NotNull(found);
        Assert.Equal(54321, found!.Port);
        Assert.Equal(IPAddress.Loopback, found.Address);
    }

    [Fact]
    public async Task DiscoverAsync_TimesOutWhenIdDoesNotMatch()
    {
        var runningId = DeviceId.FromValidatedRaw("100200300");
        var searchedId = DeviceId.FromValidatedRaw("999888777");
        using var service = new LanDiscoveryService(runningId, tcpPort: 12345, discoveryPort: 0);

        var found = await LanDiscoveryService.DiscoverAsync(
            searchedId,
            TimeSpan.FromMilliseconds(500),
            overrideTarget: new IPEndPoint(IPAddress.Loopback, service.Port));

        Assert.Null(found);
    }
}
