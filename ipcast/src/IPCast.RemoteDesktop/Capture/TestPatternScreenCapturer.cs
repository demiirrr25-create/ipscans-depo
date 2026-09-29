namespace IPCast.RemoteDesktop.Capture;

/// <summary>
/// Generates a simple animated test pattern instead of capturing a real screen - lets the rest of
/// the pipeline (encoding, transport, viewer rendering) be exercised end-to-end on any platform,
/// including this project's Linux dev sandbox, where the real Windows capturer can't run at all.
/// Never used unless explicitly opted into (see IPCAST_FAKE_CAPTURE in the Client) - on Windows
/// without that flag, the real <see cref="GdiScreenCapturer"/> is always used.
/// </summary>
public sealed class TestPatternScreenCapturer : IScreenCapturer
{
    private readonly int _width;
    private readonly int _height;
    private int _frame;

    public TestPatternScreenCapturer(int width = 640, int height = 360)
    {
        _width = width;
        _height = height;
    }

    public CapturedFrame CaptureFrame()
    {
        var buffer = new byte[_width * _height * 4];
        var offset = _frame * 4;
        _frame++;

        for (var y = 0; y < _height; y++)
        {
            for (var x = 0; x < _width; x++)
            {
                var i = (y * _width + x) * 4;
                var barIndex = ((x + offset) / 40) % 3;
                var (b, g, r) = barIndex switch
                {
                    0 => ((byte)220, (byte)60, (byte)60),
                    1 => ((byte)60, (byte)200, (byte)90),
                    _ => ((byte)60, (byte)120, (byte)230),
                };
                buffer[i] = b;
                buffer[i + 1] = g;
                buffer[i + 2] = r;
                buffer[i + 3] = 255;
            }
        }

        return new CapturedFrame(_width, _height, buffer);
    }

    public void Dispose()
    {
    }
}
