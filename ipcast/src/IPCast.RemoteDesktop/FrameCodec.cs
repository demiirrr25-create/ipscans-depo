using System.Runtime.InteropServices;
using SkiaSharp;
using System.Collections.Generic;

namespace IPCast.RemoteDesktop;

/// <summary>
/// Encodes/decodes captured frames as JPEG using SkiaSharp (BSD/MIT-licensed, genuinely free for
/// commercial use - deliberately not SixLabors.ImageSharp 3+, which requires a paid commercial
/// license for a for-profit product like this one). Cross-platform, tested in this sandbox even
/// though screen capture/input injection themselves are Windows-only.
/// Frames are treated as fully opaque (<see cref="SKAlphaType.Opaque"/>): screen captures have no
/// meaningful alpha channel, and treating it as premultiplied would risk an all-zero alpha byte
/// (common from GDI's GetDIBits) making everything decode as invisible.
/// 
/// Enhanced with adaptive quality support for dynamic bandwidth adaptation.
/// </summary>
public static class FrameCodec
{
    /// <summary>
    /// Encodes a captured frame as JPEG with optional adaptive quality scaling.
    /// </summary>
    /// <param name="frame">The captured frame to encode</param>
    /// <param name="quality">JPEG quality (0-100). If quality < 0, adaptive quality is used based on network conditions.</param>
    /// <param name="maxDimension">Maximum dimension for scaling (0 = no scaling)</param>
    /// <param name="estimatedBandwidth">Estimated available bandwidth in bytes/sec for adaptive quality (0 = ignore)</param>
    /// <returns>Encoded JPEG bytes</returns>
    public static byte[] EncodeJpeg(CapturedFrame frame, int quality = 70, int maxDimension = 0, int estimatedBandwidth = 0)
    {
        // If adaptive quality is requested (quality < 0) and we have bandwidth info, calculate optimal quality
        int effectiveQuality = quality;
        if (quality < 0 && estimatedBandwidth > 0)
        {
            effectiveQuality = CalculateOptimalQuality(frame.Width, frame.Height, estimatedBandwidth);
            effectiveQuality = Math.Clamp(effectiveQuality, 10, 95); // Clamp to reasonable range
        }
        else if (quality < 0)
        {
            effectiveQuality = 70; // Fallback if no bandwidth info
        }

        var info = new SKImageInfo(frame.Width, frame.Height, SKColorType.Bgra8888, SKAlphaType.Opaque);
        using var bitmap = new SKBitmap(info);
        Marshal.Copy(frame.Bgra, 0, bitmap.GetPixels(), frame.Bgra.Length);
        var scale = maxDimension > 0 ? Math.Min(1d, (double)maxDimension / Math.Max(frame.Width, frame.Height)) : 1d;
        using var resized = scale < 1 ? bitmap.Resize(new SKImageInfo(Math.Max(1, (int)(frame.Width * scale)), Math.Max(1, (int)(frame.Height * scale)), SKColorType.Bgra8888, SKAlphaType.Opaque), new SKSamplingOptions(SKFilterMode.Linear)) : null;
        using var image = SKImage.FromBitmap(resized ?? bitmap);
        using var data = image.Encode(SKEncodedImageFormat.Jpeg, effectiveQuality);
        return data.ToArray();
    }

    /// <summary>
    /// Calculates optimal JPEG quality based on frame size and available bandwidth.
    /// </summary>
    /// <param name="width">Frame width in pixels</param>
    /// <param name="height">Frame height in pixels</param>
    /// <param name="bandwidthBytesPerSec">Available bandwidth in bytes per second</param>
    /// <returns>Optimal JPEG quality (0-100)</returns>
    private static int CalculateOptimalQuality(int width, int height, int bandwidthBytesPerSec)
    {
        // Base calculation: estimate bytes needed for uncompressed frame
        // BGRA format: 4 bytes per pixel
        int uncompressedBytes = width * height * 4;
        
        // JPEG compression ratio varies with quality:
        // Quality 100: ~2-3x compression
        // Quality 50: ~10-15x compression  
        // Quality 10: ~20-50x compression
        // We'll use a simplified model
        
        // Target: use no more than 60% of available bandwidth for video to leave room for other traffic
        int targetBandwidth = (int)(bandwidthBytesPerSec * 0.6);
        
        // Assume we want at least 5 FPS for usability
        int targetFps = 5;
        int targetBytesPerFrame = targetBandwidth / targetFps;
        
        // Calculate required compression ratio
        if (targetBytesPerFrame <= 0) return 10; // Very low quality if no bandwidth
        
        double compressionRatio = (double)uncompressedBytes / targetBytesPerFrame;
        
        // Map compression ratio to quality (simplified mapping)
        // This is approximate - real implementation would use a lookup table or more sophisticated model
        if (compressionRatio >= 50) return 10;
        else if (compressionRatio >= 30) return 20;
        else if (compressionRatio >= 20) return 30;
        else if (compressionRatio >= 15) return 40;
        else if (compressionRatio >= 10) return 50;
        else if (compressionRatio >= 8) return 60;
        else if (compressionRatio >= 6) return 70;
        else if (compressionRatio >= 4) return 80;
        else return 90; // High quality if lots of bandwidth
    }

    /// <summary>
    /// Encodes a captured frame as JPEG with automatic quality adjustment based on recent network performance.
    /// This version maintains state for adaptive quality adjustment over time.
    /// </summary>
    public static class Adaptive
    {
        // Quality adjustment parameters
        private const int MinQuality = 10;
        private const int MaxQuality = 95;
        private const int DefaultQuality = 70;
        private const double QualityAdjustmentFactor = 0.1; // How quickly to adapt (0-1)
        private const int BandwidthSampleSize = 10; // Number of samples to average
        
        private static readonly Queue<int> _bandwidthSamples = new Queue<int>();
        private static int _currentQuality = DefaultQuality;
        
        /// <summary>
        /// Updates the bandwidth estimate and adjusts quality accordingly.
        /// </summary>
        /// <param name="bandwidthBytesPerSec">Measured bandwidth in bytes per second</param>
        /// <param name="frameWidth">Current frame width</param>
        /// <param name="frameHeight">Current frame height</param>
        /// <returns>Recommended JPEG quality for next frame</returns>
        public static int UpdateBandwidthAndGetQuality(int bandwidthBytesPerSec, int frameWidth, int frameHeight)
        {
            // Add new sample and maintain sliding window
            _bandwidthSamples.Enqueue(bandwidthBytesPerSec);
            if (_bandwidthSamples.Count > BandwidthSampleSize)
            {
                _bandwidthSamples.Dequeue();
            }
            
            // Calculate average bandwidth
            if (_bandwidthSamples.Count == 0) return DefaultQuality;
            
            int avgBandwidth = (int)_bandwidthSamples.Average();
            
            // Calculate target quality based on average bandwidth
            int targetQuality = CalculateOptimalQuality(frameWidth, frameHeight, avgBandwidth);
            
            // Smoothly adjust current quality toward target quality
            // This prevents abrupt quality changes that could be distracting
            int qualityDiff = targetQuality - _currentQuality;
            int adjustment = (int)(qualityDiff * QualityAdjustmentFactor);
            if (adjustment != 0) // Ensure we make progress even when diff is small
            {
                adjustment = Math.Sign(adjustment) * Math.Max(1, Math.Abs(adjustment));
            }
            
            _currentQuality = Math.Clamp(_currentQuality + adjustment, MinQuality, MaxQuality);
            return _currentQuality;
        }
        
        /// <summary>
        /// Returns the quality selected from recent bandwidth samples.
        /// </summary>
        public static int GetCurrentQuality() => _currentQuality;

        /// <summary>Clears bandwidth samples before a new session.</summary>
        public static void Reset()
        {
            _bandwidthSamples.Clear();
            _currentQuality = DefaultQuality;
        }
    }

    /// <summary>Decodes a bounded JPEG frame into top-down BGRA pixels.</summary>
    public static CapturedFrame DecodeJpeg(byte[] jpeg)
    {
        ArgumentNullException.ThrowIfNull(jpeg);
        using var data = SKData.CreateCopy(jpeg);
        using var codec = SKCodec.Create(data) ?? throw new InvalidDataException("Invalid JPEG frame.");
        var sourceInfo = codec.Info;
        if (sourceInfo.Width <= 0 || sourceInfo.Height <= 0 ||
            sourceInfo.Width > 8192 || sourceInfo.Height > 8192 ||
            (long)sourceInfo.Width * sourceInfo.Height > 16_777_216)
        {
            throw new InvalidDataException("JPEG frame dimensions are out of range.");
        }

        var info = new SKImageInfo(sourceInfo.Width, sourceInfo.Height, SKColorType.Bgra8888, SKAlphaType.Opaque);
        using var bitmap = new SKBitmap(info);
        if (codec.GetPixels(info, bitmap.GetPixels()) != SKCodecResult.Success)
        {
            throw new InvalidDataException("JPEG frame could not be decoded.");
        }

        var pixels = new byte[checked(sourceInfo.Width * sourceInfo.Height * 4)];
        Marshal.Copy(bitmap.GetPixels(), pixels, 0, pixels.Length);
        return new CapturedFrame(sourceInfo.Width, sourceInfo.Height, pixels);
    }
}
