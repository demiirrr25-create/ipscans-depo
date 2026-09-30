using IPCast.RemoteDesktop;
using Xunit;

namespace IPCast.Tests;

public class FrameCodecTests
{
    [Theory]
    [InlineData(1920, 1080, 1280, 1280, 720)]
    [InlineData(1080, 1920, 1280, 720, 1280)]
    [InlineData(640, 480, 1600, 640, 480)]
    public void StreamingResize_PreservesAspectRatioAndDoesNotUpscale(int width, int height, int limit, int expectedWidth, int expectedHeight)
    {
        var frame = MakeGradientFrame(width, height);
        var jpeg = FrameCodec.EncodeJpeg(frame, 60, limit);
        var decoded = FrameCodec.DecodeJpeg(jpeg);
        Assert.Equal(expectedWidth, decoded.Width);
        Assert.Equal(expectedHeight, decoded.Height);
        if (width > limit || height > limit) Assert.True(jpeg.Length < FrameCodec.EncodeJpeg(frame, 70).Length);
    }

    [Fact]
    public void EncodeThenDecode_RoundTripsDimensions()
    {
        var frame = MakeSolidColorFrame(64, 48, r: 200, g: 30, b: 30);

        var jpeg = FrameCodec.EncodeJpeg(frame, quality: 90);
        var decoded = FrameCodec.DecodeJpeg(jpeg);

        Assert.Equal(frame.Width, decoded.Width);
        Assert.Equal(frame.Height, decoded.Height);
        Assert.Equal(frame.Width * frame.Height * 4, decoded.Bgra.Length);
    }

    [Fact]
    public void EncodeThenDecode_PreservesApproximateColor()
    {
        // JPEG is lossy, so we check the decoded color is close to the original, not identical.
        var frame = MakeSolidColorFrame(32, 32, r: 10, g: 200, b: 40);

        var jpeg = FrameCodec.EncodeJpeg(frame, quality: 95);
        var decoded = FrameCodec.DecodeJpeg(jpeg);

        // BGRA byte order: [0]=B, [1]=G, [2]=R, [3]=A.
        var centerPixelOffset = ((decoded.Height / 2 * decoded.Width) + decoded.Width / 2) * 4;
        Assert.InRange(decoded.Bgra[centerPixelOffset + 2], 0, 40); // R should stay low
        Assert.InRange(decoded.Bgra[centerPixelOffset + 1], 170, 255); // G should stay high
    }

    [Fact]
    public void EncodeJpeg_ProducesSmallerOutputAtLowerQuality()
    {
        var frame = MakeGradientFrame(200, 150);

        var highQuality = FrameCodec.EncodeJpeg(frame, quality: 95);
        var lowQuality = FrameCodec.EncodeJpeg(frame, quality: 20);

        Assert.True(lowQuality.Length < highQuality.Length, "Lower JPEG quality should produce a smaller file.");
    }

    private static CapturedFrame MakeSolidColorFrame(int width, int height, byte r, byte g, byte b)
    {
        var buffer = new byte[width * height * 4];
        for (var i = 0; i < buffer.Length; i += 4)
        {
            buffer[i] = b;
            buffer[i + 1] = g;
            buffer[i + 2] = r;
            buffer[i + 3] = 255;
        }

        return new CapturedFrame(width, height, buffer);
    }

    private static CapturedFrame MakeGradientFrame(int width, int height)
    {
        var buffer = new byte[width * height * 4];
        for (var y = 0; y < height; y++)
        {
            for (var x = 0; x < width; x++)
            {
                var i = ((y * width) + x) * 4;
                buffer[i] = (byte)(x % 256);
                buffer[i + 1] = (byte)(y % 256);
                buffer[i + 2] = (byte)((x + y) % 256);
                buffer[i + 3] = 255;
            }
        }

        return new CapturedFrame(width, height, buffer);
    }
}
