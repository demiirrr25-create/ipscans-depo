namespace IPCast.RemoteDesktop;

/// <summary>One raw, uncompressed captured screen frame - BGRA, 4 bytes per pixel, top-down, no padding.</summary>
public sealed record CapturedFrame(int Width, int Height, byte[] Bgra);

/// <summary>
/// Captures the local screen. The only real implementation (<see cref="Capture.GdiScreenCapturer"/>)
/// is Windows-only (GDI BitBlt) - this interface exists so the rest of the pipeline (encoding,
/// transport, the viewer side) can be built and tested cross-platform against
/// <see cref="Capture.TestPatternScreenCapturer"/> instead.
/// </summary>
public interface IScreenCapturer : IDisposable
{
    CapturedFrame CaptureFrame();
}
