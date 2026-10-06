using IPCast.Network;
using IPCast.RemoteDesktop;
using IPCast.Shared;
using Xunit;

namespace IPCast.Tests;
public class SessionAudioTests
{
    private sealed class FakeAudio : ISystemAudio
    {
        public event Action<byte[]>? Captured;
        public event Action<Exception>? Failed { add { } remove { } }
        public readonly TaskCompletionSource<bool> Started = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public readonly TaskCompletionSource<byte[]> Played = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public float Volume { get; set; }
        public void StartCapture() => Started.TrySetResult(true);
        public void StopCapture() { }
        public void Play(byte[] bytes) => Played.TrySetResult(bytes);
        public void StopPlayback() { }
        public void Emit(byte[] bytes) => Captured?.Invoke(bytes);
        public void Dispose() { }
    }
    [Fact]
    public async Task AudioIsOffUntilExplicitEnableAndCarriesPcmOverTls()
    {
        var (a, b, host) = await SessionTestHelper.EstablishSessionAsync(DeviceId.FromValidatedRaw("111222333"),
            DeviceId.FromValidatedRaw("444555666"), ConnectionPermissions.Audio);
        await using var ownedHost = host; using var ownerA = a; using var ownerB = b;
        await using var loopA = new SessionMessageLoop(a); await using var loopB = new SessionMessageLoop(b);
        var capture = new FakeAudio(); var output = new FakeAudio();
        using var audioA = new SessionAudio(loopA, a, () => output);
        using var audioB = new SessionAudio(loopB, b, () => capture);
        var enabled = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
        audioA.StateChanged += (state, _) => { if (state) enabled.TrySetResult(true); };
        loopA.Start(); loopB.Start();
        Assert.False(capture.Started.Task.IsCompleted);
        await audioA.SetEnabledAsync(true);
        await enabled.Task.WaitAsync(TimeSpan.FromSeconds(5));
        var bytes = new byte[] { 1, 2, 3, 4 };
        capture.Emit(bytes);
        Assert.Equal(bytes, await output.Played.Task.WaitAsync(TimeSpan.FromSeconds(5)));
        await audioA.SetEnabledAsync(false);
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => audioB.SetEnabledAsync(true));
    }
}
