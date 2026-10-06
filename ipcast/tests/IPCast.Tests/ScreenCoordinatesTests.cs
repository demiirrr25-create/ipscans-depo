using IPCast.RemoteDesktop;
using Xunit;

namespace IPCast.Tests;

public class ScreenCoordinatesTests
{
    [Theory]
    [InlineData(DisplayMode.Fit, 500, 125, true, 0.5, 0)]
    [InlineData(DisplayMode.Fit, 500, 100, false, 0.5, -0.033333333)]
    [InlineData(DisplayMode.Stretch, 500, 100, true, 0.5, 0.1)]
    [InlineData(DisplayMode.AutoAdapt, 500, 200, false, 0.5, -0.125)]
    [InlineData(DisplayMode.AutoAdapt, 500, 500, true, 0.5, 0.5)]
    public void MapsImageAndRejectsBars(DisplayMode mode, double x, double y, bool accepted, double expectedX, double expectedY)
    {
        var result = ScreenCoordinates.TryNormalize(x, y, 1000, 1000, 640, 480, mode, out var nx, out var ny);
        Assert.Equal(accepted, result);
        Assert.Equal(expectedX, nx, 3);
        Assert.Equal(expectedY, ny, 3);
    }
}
