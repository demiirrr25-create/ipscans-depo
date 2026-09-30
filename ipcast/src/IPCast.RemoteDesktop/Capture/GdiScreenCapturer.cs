using System.Runtime.InteropServices;
using System.Runtime.Versioning;

namespace IPCast.RemoteDesktop.Capture;

/// <summary>
/// Captures the whole virtual desktop via classic GDI BitBlt. Windows-only, written per the
/// documented Win32 API contract but NOT runtime-verified in this project's Linux dev sandbox -
/// this repo's windows-latest CI (.github/workflows/build-ipcast.yml) is what actually exercises
/// this class; verify there (or on a real Windows machine) before relying on it.
/// </summary>
[SupportedOSPlatform("windows")]
public sealed class GdiScreenCapturer : IScreenCapturer
{
    private const int SM_XVIRTUALSCREEN = 76;
    private const int SM_YVIRTUALSCREEN = 77;
    private const int SM_CXVIRTUALSCREEN = 78;
    private const int SM_CYVIRTUALSCREEN = 79;
    private const uint SRCCOPY = 0x00CC0020;
    private const int BI_RGB = 0;
    private const uint DIB_RGB_COLORS = 0;

    public GdiScreenCapturer()
    {
        if (!OperatingSystem.IsWindows())
        {
            throw new PlatformNotSupportedException($"{nameof(GdiScreenCapturer)} requires Windows.");
        }
    }

    public CapturedFrame CaptureFrame()
    {
        var originX = NativeMethods.GetSystemMetrics(SM_XVIRTUALSCREEN);
        var originY = NativeMethods.GetSystemMetrics(SM_YVIRTUALSCREEN);
        var width = NativeMethods.GetSystemMetrics(SM_CXVIRTUALSCREEN);
        var height = NativeMethods.GetSystemMetrics(SM_CYVIRTUALSCREEN);

        var desktopDc = NativeMethods.GetDC(IntPtr.Zero);
        if (desktopDc == IntPtr.Zero)
        {
            throw new InvalidOperationException("GetDC failed.");
        }

        var memoryDc = NativeMethods.CreateCompatibleDC(desktopDc);
        var bitmap = NativeMethods.CreateCompatibleBitmap(desktopDc, width, height);
        var oldBitmap = NativeMethods.SelectObject(memoryDc, bitmap);

        try
        {
            if (!NativeMethods.BitBlt(memoryDc, 0, 0, width, height, desktopDc, originX, originY, SRCCOPY))
            {
                throw new InvalidOperationException("BitBlt failed.");
            }

            var header = new NativeMethods.BITMAPINFOHEADER
            {
                biSize = (uint)Marshal.SizeOf<NativeMethods.BITMAPINFOHEADER>(),
                biWidth = width,
                biHeight = -height, // negative = top-down DIB, matching CapturedFrame's contract
                biPlanes = 1,
                biBitCount = 32,
                biCompression = BI_RGB,
                biSizeImage = (uint)(width * height * 4),
            };

            // GetDIBits requires that the bitmap is not selected into a DC.
            NativeMethods.SelectObject(memoryDc, oldBitmap);

            var buffer = new byte[width * height * 4];
            var pinned = GCHandle.Alloc(buffer, GCHandleType.Pinned);
            try
            {
                var scanLines = NativeMethods.GetDIBits(
                    memoryDc, bitmap, 0, (uint)height, pinned.AddrOfPinnedObject(), ref header, DIB_RGB_COLORS);
                if (scanLines == 0)
                {
                    throw new InvalidOperationException("GetDIBits failed.");
                }
            }
            finally
            {
                pinned.Free();
            }

            return new CapturedFrame(width, height, buffer);
        }
        finally
        {
            NativeMethods.SelectObject(memoryDc, oldBitmap);
            NativeMethods.DeleteObject(bitmap);
            NativeMethods.DeleteDC(memoryDc);
            NativeMethods.ReleaseDC(IntPtr.Zero, desktopDc);
        }
    }

    public void Dispose()
    {
        // Every GDI handle used by CaptureFrame is created and torn down within that single call.
    }

    private static class NativeMethods
    {
        [DllImport("user32.dll")]
        public static extern int GetSystemMetrics(int index);

        [DllImport("user32.dll")]
        public static extern IntPtr GetDC(IntPtr hWnd);

        [DllImport("user32.dll")]
        public static extern int ReleaseDC(IntPtr hWnd, IntPtr hDc);

        [DllImport("gdi32.dll")]
        public static extern IntPtr CreateCompatibleDC(IntPtr hDc);

        [DllImport("gdi32.dll")]
        public static extern IntPtr CreateCompatibleBitmap(IntPtr hDc, int width, int height);

        [DllImport("gdi32.dll")]
        public static extern IntPtr SelectObject(IntPtr hDc, IntPtr hObject);

        [DllImport("gdi32.dll")]
        public static extern bool DeleteObject(IntPtr hObject);

        [DllImport("gdi32.dll")]
        public static extern bool DeleteDC(IntPtr hDc);

        [DllImport("gdi32.dll")]
        public static extern bool BitBlt(
            IntPtr hDcDest, int xDest, int yDest, int width, int height,
            IntPtr hDcSrc, int xSrc, int ySrc, uint rop);

        [DllImport("gdi32.dll")]
        public static extern int GetDIBits(
            IntPtr hDc, IntPtr hBitmap, uint startScan, uint scanLines,
            IntPtr bits, ref BITMAPINFOHEADER info, uint usage);

        [StructLayout(LayoutKind.Sequential)]
        public struct BITMAPINFOHEADER
        {
            public uint biSize;
            public int biWidth;
            public int biHeight;
            public ushort biPlanes;
            public ushort biBitCount;
            public int biCompression;
            public uint biSizeImage;
            public int biXPelsPerMeter;
            public int biYPelsPerMeter;
            public uint biClrUsed;
            public uint biClrImportant;
        }
    }
}
