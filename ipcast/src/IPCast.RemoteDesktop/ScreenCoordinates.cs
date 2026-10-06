namespace IPCast.RemoteDesktop;

/// <summary>Maps viewer coordinates into the displayed image, excluding letterboxing.</summary>
public static class ScreenCoordinates
{
    public static bool TryNormalize(double x, double y, double viewWidth, double viewHeight,
        double imageWidth, double imageHeight, DisplayMode mode, out double normalizedX, out double normalizedY)
    {
        normalizedX = normalizedY = 0;
        if (!double.IsFinite(x) || !double.IsFinite(y) ||
            !double.IsFinite(viewWidth) || !double.IsFinite(viewHeight) ||
            viewWidth <= 0 || viewHeight <= 0 || imageWidth <= 0 || imageHeight <= 0)
            return false;
        double width = viewWidth, height = viewHeight;
        if (mode is DisplayMode.Fit or DisplayMode.AutoAdapt or DisplayMode.Fullscreen)
        {
            var scale = Math.Min(viewWidth / imageWidth, viewHeight / imageHeight);
            if (mode == DisplayMode.AutoAdapt) scale = Math.Min(1, scale);
            width = imageWidth * scale;
            height = imageHeight * scale;
        }
        normalizedX = (x - (viewWidth - width) / 2) / width;
        normalizedY = (y - (viewHeight - height) / 2) / height;
        return normalizedX >= 0 && normalizedX <= 1 && normalizedY >= 0 && normalizedY <= 1;
    }
}
