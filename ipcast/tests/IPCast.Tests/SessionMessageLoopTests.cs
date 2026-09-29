using IPCast.Network;
using IPCast.Shared;
using Xunit;

namespace IPCast.Tests;

public class SessionMessageLoopTests : IAsyncDisposable
{
    private readonly DeviceId _hostId = DeviceId.FromValidatedRaw("222333444");
    private readonly DeviceId _clientId = DeviceId.FromValidatedRaw("555666777");
    private IPCastHost? _host;

    public async ValueTask DisposeAsync()
    {
        if (_host is not null)
        {
            await _host.DisposeAsync();
        }
    }

    private async Task<(RemoteSession Initiator, RemoteSession Acceptor)> EstablishSessionAsync(ConnectionPermissions granted)
    {
        var (initiator, acceptor, host) = await SessionTestHelper.EstablishSessionAsync(_hostId, _clientId, granted);
        _host = host;
        return (initiator, acceptor);
    }

    [Fact]
    public async Task ClipboardText_IsDeliveredToPeer_WhenPermissionGranted()
    {
        var (initiator, acceptor) = await EstablishSessionAsync(ConnectionPermissions.Clipboard);

        await using var initiatorLoop = new SessionMessageLoop(initiator);
        await using var acceptorLoop = new SessionMessageLoop(acceptor);

        var received = new TaskCompletionSource<string>();
        acceptorLoop.ClipboardTextReceived += text => received.TrySetResult(text);

        initiatorLoop.Start();
        acceptorLoop.Start();

        await initiatorLoop.SendClipboardTextAsync("hello from the initiator");

        var text = await received.Task.WaitAsync(TimeSpan.FromSeconds(5));
        Assert.Equal("hello from the initiator", text);

        initiator.Dispose();
        acceptor.Dispose();
    }

    [Fact]
    public async Task ClipboardText_IsIgnored_WhenPermissionNotGranted()
    {
        var (initiator, acceptor) = await EstablishSessionAsync(ConnectionPermissions.ViewScreen);

        await using var initiatorLoop = new SessionMessageLoop(initiator);
        await using var acceptorLoop = new SessionMessageLoop(acceptor);

        var received = false;
        acceptorLoop.ClipboardTextReceived += _ => received = true;

        initiatorLoop.Start();
        acceptorLoop.Start();

        await initiatorLoop.SendClipboardTextAsync("should be dropped");

        // Give the (non-)delivery a moment, then confirm nothing arrived - there's no positive
        // event to await here since the whole point is that it must NOT fire.
        await Task.Delay(TimeSpan.FromMilliseconds(300));
        Assert.False(received);

        initiator.Dispose();
        acceptor.Dispose();
    }
}
