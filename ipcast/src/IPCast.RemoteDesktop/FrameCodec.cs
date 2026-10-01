using System.Runtime.InteropServices;
using SkiaSharp;

namespace IPCast.RemoteDesktop;

/// <summary>
/// Encodes/decodes captured frames as JPEG using SkiaSharp (BSD/MIT-licensed, genuinely free for
/// commercial use - deliberately not SixLabors.ImageSharp 3+, which requires a paid commercial
/// license for a for-profit product like this one). Cross-platform, tested in this sandbox even
/// though screen capture/input injection themselves are Windows-only.
/// Frames are treated as fully opaque (<see cref="SKAlphaType.Opaque"/>): screen captures have no
/// meaningful alpha channel, and treating it as premultiplied would risk an all-zero alpha byte
/// (common from GDI's GetDIBits) making everything decode as invisible.
/// </summary>
public static class FrameCodec
{
    public static byte[] EncodeJpeg(CapturedFrame frame, int quality = 70, int maxDimension = 0)
    {
        var info = new SKImageInfo(frame.Width, frame.Height, SKColorType.Bgra8888, SKAlphaType.Opaque);
        using var bitmap = new SKBitmap(info);
        Marshal.Copy(frame.Bgra, 0, bitmap.GetPixels(), frame.Bgra.Length);
        var scale = maxDimension > 0 ? Math.Min(1d, (double)maxDimension / Math.Max(frame.Width, frame.Height)) : 1d;
        using var resized = scale < 1 ? bitmap.Resize(new SKImageInfo(Math.Max(1, (int)(frame.Width * scale)), Math.Max(1, (int)(frame.Height * scale)), SKColorType.Bgra8888, SKAlphaType.Opaque), new SKSamplingOptions(SKFilterMode.Linear)) : null;
        using var image = SKImage.FromBitmap(resized ?? bitmap);
        using var data = image.Encode(SKEncodedImageFormat.Jpeg, quality);
        return data.ToArray();
    }

    public static CapturedFrame DecodeJpeg(byte[] jpegBytes)
    {
        using var decoded = SKBitmap.Decode(jpegBytes) ?? throw new InvalidDataException("Not a valid JPEG frame.");

        var bgra = decoded;
        SKBitmap? converted = null;
        if (decoded.ColorType != SKColorType.Bgra8888)
        {
            converted = decoded.Copy(SKColorType.Bgra8888) ?? throw new InvalidDataException("Couldn't convert decoded frame to BGRA.");
            bgra = converted;
        }

        try
        {
            var buffer = new byte[bgra.Width * bgra.Height * 4];
            Marshal.Copy(bgra.GetPixels(), buffer, 0, buffer.Length);
            return new CapturedFrame(bgra.Width, bgra.Height, buffer);
        }
        finally
        {
            converted?.Dispose();
        }
    }
}
