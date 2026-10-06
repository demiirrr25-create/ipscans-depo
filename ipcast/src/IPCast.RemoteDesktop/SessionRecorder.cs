namespace IPCast.RemoteDesktop;

public sealed class SessionRecorder
{
    private readonly CancellationTokenSource _stop = new();
    public Task Completion { get; }
    public SessionRecorder(string path, Func<CapturedFrame?> getFrame)
    {
        Completion = Task.Run(async () =>
        {
            var first = getFrame() ?? throw new InvalidOperationException("Wait for the first remote frame before recording.");
            using var recording = new MjpegRecording(path, first.Width, first.Height);
            using var timer = new PeriodicTimer(TimeSpan.FromMilliseconds(100));
            try
            {
                do
                {
                    if (getFrame() is { } frame) recording.WriteFrame(frame);
                } while (await timer.WaitForNextTickAsync(_stop.Token).ConfigureAwait(false));
            }
            catch (OperationCanceledException) when (_stop.IsCancellationRequested) { }
        });
    }
    public async Task StopAsync()
    {
        await _stop.CancelAsync();
        try { await Completion.ConfigureAwait(false); }
        finally { _stop.Dispose(); }
    }
}
