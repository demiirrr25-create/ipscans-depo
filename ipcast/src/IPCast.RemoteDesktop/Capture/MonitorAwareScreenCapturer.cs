using System.Runtime.InteropServices;
using System.Runtime.Versioning;
using System.Drawing;

namespace IPCast.RemoteDesktop.Capture;

/// <summary>
/// Captures screen content from a specific monitor using GDI BitBlt.
/// Windows-only, written per the documented Win32 API contract.
/// </summary>
[SupportedOSPlatform("windows")]
public sealed class MonitorAwareScreenCapturer : IMonitorAwareCapturer, IScreenCapturer
{
    public MonitorAwareScreenCapturer()
    {
        if (!OperatingSystem.IsWindows())
        {
            throw new PlatformNotSupportedException($"{nameof(MonitorAwareScreenCapturer)} requires Windows.");
        }
    }

    /// <summary>
    /// Captures the entire virtual desktop (all monitors combined).
    /// </summary>
    public CapturedFrame CaptureFrame()
    {
        return CaptureFrameFromMonitor(GetVirtualMonitor());
    }

    /// <summary>
    /// Captures a specific monitor.
    /// </summary>
    /// <param name="monitor">The monitor to capture</param>
    /// <param name="ct">Cancellation token</param>
    public async Task<CapturedFrame?> CaptureFrameAsync(MonitorInfo monitor, CancellationToken ct)
    {
        // Note: This implementation doesn't actually use the cancellation token during the capture
        // operation because GDI operations are not easily cancelable mid-operation.
        // In a more sophisticated implementation, we might check the token before and after.
        if (ct.IsCancellationRequested)
        {
            return null;
        }
        
        try
        {
            return CaptureFrameFromMonitor(monitor);
        }
        catch (Exception)
        {
            return null; // Indicate failure
        }
    }

    /// <summary>
    /// Gets information about all available monitors.
    /// </summary>
    public IEnumerable<MonitorInfo> GetAvailableMonitors()
    {
        var monitors = new List<MonitorInfo>();
        
        // Get virtual screen dimensions (combined bounds of all monitors)
        int virtualWidth = NativeMethods.GetSystemMetrics(NativeMethods.SM_CXVIRTUALSCREEN);
        int virtualHeight = NativeMethods.GetSystemMetrics(NativeMethods.SM_CYVIRTUALSCREEN);
        int virtualX = NativeMethods.GetSystemMetrics(NativeMethods.SM_XVIRTUALSCREEN);
        int virtualY = NativeMethods.GetSystemMetrics(NativeMethods.SM_YVIRTUALSCREEN);
        
        // Add the virtual screen as a monitor (for backward compatibility)
        monitors.Add(new MonitorInfo(
            "\\\\.\\DISPLAY_VIRTUAL",
            "Virtual Screen (All Monitors)",
            virtualX, virtualY, virtualWidth, virtualHeight
        ));
        
        // Enumerate actual display monitors
        bool enumResult = NativeMethods.EnumDisplayMonitors(
            IntPtr.Zero, 
            IntPtr.Zero, 
            MonitorEnumProc,
            IntPtr.Zero
        );
        
        if (!enumResult)
        {
            // If enumeration fails, fall back to just the virtual screen
            return monitors;
        }
        
        return monitors;
    }

    private bool MonitorEnumProc(IntPtr hMonitor, IntPtr hdcMonitor, ref NativeMethods.RECT lprcMonitor, IntPtr dwData)
    {
        // Get monitor information
        var monitorInfo = new NativeMethods.MONITORINFOEX();
        monitorInfo.cbSize = Marshal.SizeOf<NativeMethods.MONITORINFOEX>();
        
        if (NativeMethods.GetMonitorInfo(hMonitor, ref monitorInfo))
        {
            // Create a friendly name from the device name
            string deviceName = monitorInfo.szDevice.TrimEnd((char)0);
            string friendlyName = deviceName;
            
            // Try to make it more user-friendly
            if (deviceName.StartsWith("\\\\.\\DISPLAY", StringComparison.OrdinalIgnoreCase))
            {
                if (int.TryParse(deviceName.Substring("\\\\.\\DISPLAY".Length), out int displayNum))
                {
                    friendlyName = $"Monitor {displayNum}";
                }
            }
            
            // Add the monitor
            monitors.Add(new MonitorInfo(
                deviceName,
                friendlyName,
                monitorInfo.rcMonitor.left,
                monitorInfo.rcMonitor.top,
                monitorInfo.rcMonitor.right - monitorInfo.rcMonitor.left,
                monitorInfo.rcMonitor.bottom - monitorInfo.rcMonitor.top
            ));
        }
        
        return true; // Continue enumeration
    }

    private CapturedFrame CaptureFrameFromMonitor(MonitorInfo monitor)
    {
        // Calculate the capture rectangle based on the monitor
        int originX = monitor.Bounds.X;
        int originY = monitor.Bounds.Y;
        int width = monitor.Bounds.Width;
        int height = monitor.Bounds.Height;

        if (width <= 0 || height <= 0)
        {
            throw new InvalidOperationException($"Invalid monitor dimensions: {width}x{height}");
        }

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
            if (!NativeMethods.BitBlt(memoryDc, 0, 0, width, height, desktopDc, originX, originY, NativeMethods.SRCCOPY))
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
                biCompression = NativeMethods.BI_RGB,
                biSizeImage = (uint)(width * height * 4),
            };

            // GetDIBits requires that the bitmap is not selected into a DC.
            NativeMethods.SelectObject(memoryDc, oldBitmap);

            var buffer = new byte[width * height * 4];
            var pinned = GCHandle.Alloc(buffer, GCHandleType.Pinned);
            try
            {
                var scanLines = NativeMethods.GetDIBits(
                    memoryDc, bitmap, 0, (uint)height, pinned.AddrOfPinnedObject(), ref header, NativeMethods.DIB_RGB_COLORS);
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

    private MonitorInfo GetVirtualMonitor()
    {
        int virtualWidth = NativeMethods.GetSystemMetrics(NativeMethods.SM_CXVIRTUALSCREEN);
        int virtualHeight = NativeMethods.GetSystemMetrics(NativeMethods.SM_CYVIRTUALSCREEN);
        int virtualX = NativeMethods.GetSystemMetrics(NativeMethods.SM_XVIRTUALSCREEN);
        int virtualY = NativeMethods.GetSystemMetrics(NativeMethods.SM_YVIRTUALSCREEN);
        
        return new MonitorInfo(
            "\\\\.\\DISPLAY_VIRTUAL",
            "Virtual Screen (All Monitors)",
            virtualX, virtualY, virtualWidth, virtualHeight
        );
    }

    private static class NativeMethods
    {
        [DllImport("user32.dll")]
        public static extern int GetSystemMetrics(int nIndex);

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
            IntPtr hdcDest, int nXDest, int nYDest, int nWidth, int nHeight,
            IntPtr hdcSrc, int nXSrc, int nYSrc, uint dwRop);

        [DllImport("gdi32.dll")]
        public static extern int GetDIBits(
            IntPtr hdc, IntPtr hbmp, uint nStartScan, uint cScanLines,
            IntPtr lpvBits, ref BITMAPINFOHEADER lpbmiClr, uint wUsage);

        [DllImport("user32.dll")]
        public static extern bool GetMonitorInfo(IntPtr hmonitor, ref MONITORINFOEX lpmi);

        [DllImport("user32.dll")]
        public static extern bool EnumDisplayMonitors(
            IntPtr hdc, IntPtr lprcClip, 
            MonitorEnumProc lpfnEnum, IntPtr dwData);

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

        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Auto)]
        public struct MONITORINFOEX
        {
            public uint cbSize;
            public RECT rcMonitor;
            public RECT rcWork;
            public uint dwFlags;
            [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)]
            public string szDevice;
        }

        [StructLayout(LayoutKind.Sequential)]
        public struct RECT
        {
            public int left;
            public int top;
            public int right;
            public int bottom;
        }

        public delegate bool MonitorEnumProc(IntPtr hMonitor, IntPtr hdcMonitor, ref RECT lprcMonitor, IntPtr dwData);

        // Virtual screen metrics
        public const int SM_XVIRTUALSCREEN = 76;
        public const int SM_YVIRTUALSCREEN = 77;
        public const int SM_CXVIRTUALSCREEN = 78;
        public const int SM_CYVIRTUALSCREEN = 79;

        public const uint SRCCOPY = 0x00CC0020;
        public const uint BI_RGB = 0;
        public const uint DIB_RGB_COLORS = 0;
    }
}