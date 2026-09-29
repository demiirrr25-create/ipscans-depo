using IPCast.Network;
using IPCast.RemoteDesktop;
using IPCast.RemoteDesktop.Capture;
using IPCast.RemoteDesktop.Input;
using IPCast.Shared;
using Xunit;

namespace IPCast.Tests;

public class RemoteDesktopSessionTests : IAsyncDisposable
{
    private readonly DeviceId _hostId = DeviceId.FromValidatedRaw("555666777");
    private readonly DeviceId _clientId = DeviceId.FromValidatedRaw("888999111");
    private IPCastHost? _host;

    public async ValueTask DisposeAsync()
    {
        if (_host is not null)
        {
            await _host.DisposeAsync();
        }
    }

    private const ConnectionPermissions FullControl =
        ConnectionPermissions.ViewScreen | ConnectionPermissions.ControlMouse | ConnectionPermissions.ControlKeyboard;

    [Fact]
    public async Task ViewerReceivesFramesFromSharer()
    {
        var (initiatorSession, acceptorSession, host) = await SessionTestHelper.EstablishSessionAsync(_hostId, _clientId, FullControl);
        _host = host;

        // Acceptor (accepted the connection) shares its screen; initiator (pressed Connect) views it.
        await using var sharerLoop = new SessionMessageLoop(acceptorSession);
        await using var viewerLoop = new SessionMessageLoop(initiatorSession);

        using var sharerDesktop = new RemoteDesktopSession(sharerLoop, acceptorSession);
        using var viewerDesktop = new RemoteDesktopSession(viewerLoop, initiatorSession);

        var frameReceived = new TaskCompletionSource<CapturedFrame>();
        viewerDesktop.FrameReceived += frame => frameReceived.TrySetResult(frame);

        sharerLoop.Start();
        viewerLoop.Start();

        using var capturer = new TestPatternScreenCapturer(width: 160, height: 90);
        var injector = new RecordingInputInjector();
        sharerDesktop.StartSharing(capturer, injector, frameInterval: TimeSpan.FromMilliseconds(50));

        var frame = await frameReceived.Task.WaitAsync(TimeSpan.FromSeconds(10));

        Assert.Equal(160, frame.Width);
        Assert.Equal(90, frame.Height);
        Assert.Equal(160 * 90 * 4, frame.Bgra.Length);

        initiatorSession.Dispose();
        acceptorSession.Dispose();
    }

    [Fact]
    public async Task ViewerInputIsAppliedOnSharerSide()
    {
        var (initiatorSession, acceptorSession, host) = await SessionTestHelper.EstablishSessionAsync(_hostId, _clientId, FullControl);
        _host = host;

        await using var sharerLoop = new SessionMessageLoop(acceptorSession);
        await using var viewerLoop = new SessionMessageLoop(initiatorSession);

        using var sharerDesktop = new RemoteDesktopSession(sharerLoop, acceptorSession);
        using var viewerDesktop = new RemoteDesktopSession(viewerLoop, initiatorSession);

        sharerLoop.Start();
        viewerLoop.Start();

        using var capturer = new TestPatternScreenCapturer();
        var injector = new RecordingInputInjector();
        // A long interval keeps the capture loop from racing with assertions below - this test cares about input, not frames.
        sharerDesktop.StartSharing(capturer, injector, frameInterval: TimeSpan.FromSeconds(30));

        await viewerDesktop.SendMouseMoveAsync(0.25, 0.75);
        await viewerDesktop.SendMouseButtonAsync(button: 0, isDown: true);
        await viewerDesktop.SendKeyEventAsync(virtualKeyCode: 0x41, isDown: true); // 'A'

        await WaitUntilAsync(() => injector.MouseMoves.Count > 0 && injector.MouseButtons.Count > 0 && injector.KeyEvents.Count > 0);

        Assert.Equal(0.25, injector.MouseMoves[0].NormalizedX, precision: 3);
        Assert.Equal(0.75, injector.MouseMoves[0].NormalizedY, precision: 3);
        Assert.Equal(0, injector.MouseButtons[0].Button);
        Assert.True(injector.MouseButtons[0].IsDown);
        Assert.Equal(0x41, injector.KeyEvents[0].VirtualKeyCode);
        Assert.True(injector.KeyEvents[0].IsDown);

        initiatorSession.Dispose();
        acceptorSession.Dispose();
    }

    [Fact]
    public async Task InputIsIgnored_WhenControlPermissionsNotGranted()
    {
        var viewOnly = ConnectionPermissions.ViewScreen;
        var (initiatorSession, acceptorSession, host) = await SessionTestHelper.EstablishSessionAsync(_hostId, _clientId, viewOnly);
        _host = host;

        await using var sharerLoop = new SessionMessageLoop(acceptorSession);
        await using var viewerLoop = new SessionMessageLoop(initiatorSession);

        using var sharerDesktop = new RemoteDesktopSession(sharerLoop, acceptorSession);
        using var viewerDesktop = new RemoteDesktopSession(viewerLoop, initiatorSession);

        sharerLoop.Start();
        viewerLoop.Start();

        using var capturer = new TestPatternScreenCapturer();
        var injector = new RecordingInputInjector();
        sharerDesktop.StartSharing(capturer, injector, frameInterval: TimeSpan.FromSeconds(30));

        await viewerDesktop.SendMouseMoveAsync(0.5, 0.5);
        await viewerDesktop.SendKeyEventAsync(0x41, true);

        // Give the (non-)delivery a moment; there's no positive event to await since it must NOT arrive.
        await Task.Delay(TimeSpan.FromMilliseconds(300));

        Assert.Empty(injector.MouseMoves);
        Assert.Empty(injector.KeyEvents);

        initiatorSession.Dispose();
        acceptorSession.Dispose();
    }

    private static async Task WaitUntilAsync(Func<bool> condition, int timeoutMs = 5000)
    {
        var deadline = DateTime.UtcNow.AddMilliseconds(timeoutMs);
        while (!condition())
        {
            if (DateTime.UtcNow > deadline)
            {
                throw new TimeoutException("Condition was not met in time.");
            }

            await Task.Delay(20);
        }
    }
}
