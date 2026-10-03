using IPCast.Network;
using IPCast.RemoteDesktop;
using IPCast.RemoteDesktop.Capture;
using IPCast.RemoteDesktop.Input;
using IPCast.Shared;

namespace IPCast.Tests;

public class LiveQualityTests
{
    [Fact] public async Task QualityChangeIsAcknowledgedAndChangesReceivedResolution()
    {
        var (viewer, hostSession, host) = await SessionTestHelper.EstablishSessionAsync(DeviceId.FromValidatedRaw("555666777"), DeviceId.FromValidatedRaw("111222333"), ConnectionPermissions.ViewScreen);
        await using (host) using (viewer) using (hostSession)
        {
            await using var viewerLoop = new SessionMessageLoop(viewer); await using var hostLoop = new SessionMessageLoop(hostSession);
            using var remote = new RemoteDesktopSession(viewerLoop, viewer); using var sharing = new RemoteDesktopSession(hostLoop, hostSession);
            var received = new TaskCompletionSource<CapturedFrame>(TaskCreationOptions.RunContinuationsAsynchronously);
            remote.FrameReceived += frame => { if (frame.Width == 1280) received.TrySetResult(frame); };
            viewerLoop.Start(); hostLoop.Start();
            sharing.StartSharing(new TestPatternScreenCapturer(1600, 900), new RecordingInputInjector(), TimeSpan.FromMilliseconds(100));
            await remote.SetStreamingQualityAsync("Speed");
            var frame = await received.Task.WaitAsync(TimeSpan.FromSeconds(10)); Assert.Equal(720, frame.Height);
            await Assert.ThrowsAsync<UnauthorizedAccessException>(() => sharing.SetStreamingQualityAsync("Quality"));
            await Assert.ThrowsAsync<ArgumentException>(() => remote.SetStreamingQualityAsync("unlimited"));
        }
    }
}
