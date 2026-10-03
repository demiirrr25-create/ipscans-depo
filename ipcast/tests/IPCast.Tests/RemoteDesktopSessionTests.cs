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
    public async Task UnchangedDesktop_SkipsDuplicateFramesAndRefreshesPeriodically()
    {
        var (viewer, sharer, host) = await SessionTestHelper.EstablishSessionAsync(_hostId, _clientId, FullControl);
        _host = host;
        using (viewer) using (sharer)
        {
            await using var sendLoop = new SessionMessageLoop(sharer);
            await using var receiveLoop = new SessionMessageLoop(viewer);
            using var sender = new RemoteDesktopSession(sendLoop, sharer);
            using var receiver = new RemoteDesktopSession(receiveLoop, viewer);
            var frames = System.Threading.Channels.Channel.CreateUnbounded<CapturedFrame>();
            receiver.FrameReceived += frame => frames.Writer.TryWrite(frame);
            sendLoop.Start(); receiveLoop.Start();
            sender.StartSharing(new StaticCapturer(), new RecordingInputInjector(), TimeSpan.FromMilliseconds(20), maxDimension: 80);
            var first = await frames.Reader.ReadAsync().AsTask().WaitAsync(TimeSpan.FromSeconds(5));
            Assert.Equal(80, first.Width);
            await Task.Delay(250);
            Assert.False(frames.Reader.TryRead(out _));
            var refresh = await frames.Reader.ReadAsync().AsTask().WaitAsync(TimeSpan.FromSeconds(3));
            Assert.Equal(first.Width, refresh.Width);
        }
    }

    private sealed class StaticCapturer : IScreenCapturer
    {
        public CapturedFrame CaptureFrame() => new(160, 90, new byte[160 * 90 * 4]);
        public void Dispose() { }
    }

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

    [Fact]
    public async Task CaptureFailureReportsFaultAndStopsCapture()
    {
        var (viewer, sharer, host) = await SessionTestHelper.EstablishSessionAsync(_hostId, _clientId, FullControl);
        _host = host;
        using (viewer) using (sharer)
        {
            await using var loop = new SessionMessageLoop(sharer);
            using var desktop = new RemoteDesktopSession(loop, sharer);
            var fault = new TaskCompletionSource<Exception>(TaskCreationOptions.RunContinuationsAsynchronously);
            desktop.Faulted += ex => fault.TrySetResult(ex);
            var capturer = new FailingCapturer();
            desktop.StartSharing(capturer, new RecordingInputInjector(), TimeSpan.FromMilliseconds(20));
            Assert.IsType<InvalidOperationException>(await fault.Task.WaitAsync(TimeSpan.FromSeconds(5)));
            await Task.Delay(100);
            Assert.Equal(1, capturer.Attempts);
            Assert.True(capturer.Disposed);
        }
    }

    private sealed class FailingCapturer : IScreenCapturer
    {
        public int Attempts { get; private set; }
        public bool Disposed { get; private set; }
        public CapturedFrame CaptureFrame()
        {
            Attempts++;
            throw new InvalidOperationException("Capture unavailable");
        }
        public void Dispose() => Disposed = true;
    }

    [Fact]
    public async Task ViewerCanSelectMonitorAndPointerMapsToVirtualDesktop()
    {
        var (viewer, sharer, host) = await SessionTestHelper.EstablishSessionAsync(_hostId, _clientId, FullControl);
        _host = host;
        using (viewer) using (sharer)
        {
            await using var sharerLoop = new SessionMessageLoop(sharer);
            await using var viewerLoop = new SessionMessageLoop(viewer);
            using var sharerDesktop = new RemoteDesktopSession(sharerLoop, sharer);
            using var viewerDesktop = new RemoteDesktopSession(viewerLoop, viewer);
            var monitorsReceived = new TaskCompletionSource<IReadOnlyList<MonitorInfo>>(TaskCreationOptions.RunContinuationsAsynchronously);
            viewerDesktop.AvailableMonitorsReceived += monitors => monitorsReceived.TrySetResult(monitors);
            var selectedFrameReceived = new TaskCompletionSource<CapturedFrame>(TaskCreationOptions.RunContinuationsAsynchronously);
            viewerDesktop.FrameReceived += frame =>
            {
                if (frame.Width == 100) selectedFrameReceived.TrySetResult(frame);
            };
            var capturer = new TwoMonitorCapturer();
            var injector = new RecordingInputInjector();
            sharerLoop.Start(); viewerLoop.Start();
            sharerDesktop.StartSharing(capturer, injector, TimeSpan.FromMilliseconds(20));

            await viewerDesktop.RequestAvailableMonitorsAsync();
            var monitors = await monitorsReceived.Task.WaitAsync(TimeSpan.FromSeconds(5));
            Assert.Equal(3, monitors.Count);
            Assert.Contains(monitors, m => m.DeviceName == "right");

            await viewerDesktop.SelectMonitorAsync("right");
            await WaitUntilAsync(() => capturer.LastSelectedMonitor == "right");
            Assert.Equal(100, (await selectedFrameReceived.Task.WaitAsync(TimeSpan.FromSeconds(5))).Width);
            await viewerDesktop.SendMouseMoveAsync(0.5, 0.5);
            await WaitUntilAsync(() => injector.MouseMoves.Count > 0);
            Assert.Equal(0.75, injector.MouseMoves[^1].NormalizedX, precision: 3);
            Assert.Equal(0.5, injector.MouseMoves[^1].NormalizedY, precision: 3);
        }
    }

    private sealed class TwoMonitorCapturer : IScreenCapturer, IMonitorAwareCapturer
    {
        public string? LastSelectedMonitor { get; private set; }

        public IEnumerable<MonitorInfo> GetAvailableMonitors() =>
        [
            new(MonitorInfo.VirtualDesktopDeviceName, "All monitors", 0, 0, 200, 100),
            new("left", "Monitor 1", 0, 0, 100, 100),
            new("right", "Monitor 2", 100, 0, 100, 100),
        ];

        public Task<CapturedFrame?> CaptureFrameAsync(MonitorInfo monitor, CancellationToken ct)
        {
            LastSelectedMonitor = monitor.DeviceName;
            return Task.FromResult<CapturedFrame?>(new CapturedFrame(monitor.Width, monitor.Height,
                new byte[monitor.Width * monitor.Height * 4]));
        }

        public CapturedFrame CaptureFrame() => new(200, 100, new byte[200 * 100 * 4]);
        public void Dispose() { }
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
