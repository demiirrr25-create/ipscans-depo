using IPCast.Network;
using IPCast.Shared;
using Xunit;
namespace IPCast.Tests;
public class SessionToolsTests
{
    [Fact]
    public async Task DeviceInfoAndRestartRequirePermissionAndOwnerDecision()
    {
        var (a, b, host) = await SessionTestHelper.EstablishSessionAsync(DeviceId.FromValidatedRaw("111222333"),
            DeviceId.FromValidatedRaw("444555666"), ConnectionPermissions.SystemInformation | ConnectionPermissions.RemoteRestart);
        await using var ownedHost = host; using var ownerA = a; using var ownerB = b;
        await using var loopA = new SessionMessageLoop(a); await using var loopB = new SessionMessageLoop(b);
        using var toolsA = new SessionTools(loopA, a); using var toolsB = new SessionTools(loopB, b);
        var asked = false; toolsB.RequestRestart = () => { asked = true; return Task.FromResult(false); };
        loopA.Start(); loopB.Start();
        Assert.Equal(Environment.MachineName, (await toolsA.GetInformationAsync()).Information!.Name);
        await Assert.ThrowsAsync<IOException>(() => toolsA.RestartAsync());
        Assert.True(asked);
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => toolsB.GetInformationAsync());
    }
}
