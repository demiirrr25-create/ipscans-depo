using IPCast.RemoteDesktop;
using Xunit;

namespace IPCast.Tests;

public class AdaptiveQualityControllerTests
{
    [Fact]
    public void CongestionReducesQualityAndRecoveryRequiresSustainedFastWrites()
    {
        var controller = new AdaptiveQualityController();
        var interval = TimeSpan.FromMilliseconds(50);
        for (var i = 0; i < 20; i++) controller.ObserveWrite(TimeSpan.FromMilliseconds(100), interval);
        Assert.Equal(30, controller.Quality);
        for (var i = 0; i < 7; i++) controller.ObserveWrite(TimeSpan.FromMilliseconds(5), interval);
        Assert.Equal(30, controller.Quality);
        controller.ObserveWrite(TimeSpan.FromMilliseconds(5), interval);
        Assert.Equal(32, controller.Quality);
        Assert.Equal(70, new AdaptiveQualityController().Quality);
        for (var i = 0; i < 1000; i++) controller.ObserveWrite(TimeSpan.FromMilliseconds(5), interval);
        Assert.Equal(85, controller.Quality);
    }

    [Fact]
    public void BandwidthBudgetIncludesBase64Overhead()
    {
        var budget = StreamingProfile.FrameBudget(TimeSpan.FromMilliseconds(50), 3000, 4256);
        Assert.Equal(TimeSpan.FromSeconds(1), budget);
    }
}
