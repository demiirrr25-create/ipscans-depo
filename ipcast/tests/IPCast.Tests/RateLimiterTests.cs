using IPCast.Network;

namespace IPCast.Tests;

public class RateLimiterTests
{
    [Fact]
    public void IsAllowed_FailsClosedWhenTrackingCapacityIsReached()
    {
        var limiter = new RateLimiter(maxAttempts: 1, window: TimeSpan.FromMinutes(5));

        for (var i = 0; i < 4096; i++)
        {
            var key = $"source-{i}";
            Assert.True(limiter.TryBeginAttempt(key));
            limiter.CompleteAttempt(key, failed: true);
            Assert.False(limiter.TryBeginAttempt(key));
        }

        Assert.False(limiter.TryBeginAttempt("new-source"));
    }

    [Fact]
    public void IsAllowed_TracksDifferentKeysIndependently()
    {
        var limiter = new RateLimiter(maxAttempts: 1, window: TimeSpan.FromMinutes(5));

        Assert.True(limiter.TryBeginAttempt("first-source"));
        limiter.CompleteAttempt("first-source", failed: true);

        Assert.False(limiter.TryBeginAttempt("first-source"));
        Assert.True(limiter.TryBeginAttempt("second-source"));
    }

    [Fact]
    public void TryBeginAttempt_ReservesSlotsForConcurrentAttempts()
    {
        var limiter = new RateLimiter(maxAttempts: 2, window: TimeSpan.FromMinutes(5));

        Assert.True(limiter.TryBeginAttempt("source"));
        Assert.True(limiter.TryBeginAttempt("source"));
        Assert.False(limiter.TryBeginAttempt("source"));

        limiter.CompleteAttempt("source", failed: true);
        Assert.False(limiter.TryBeginAttempt("source"));

        limiter.CompleteAttempt("source", failed: false);
        Assert.True(limiter.TryBeginAttempt("source"));
        limiter.CompleteAttempt("source", failed: true);
        Assert.False(limiter.TryBeginAttempt("source"));
    }

    [Fact]
    public void CompleteAttempt_SuccessDoesNotCountAsFailure()
    {
        var limiter = new RateLimiter(maxAttempts: 1, window: TimeSpan.FromMinutes(5));

        Assert.True(limiter.TryBeginAttempt("source"));
        limiter.CompleteAttempt("source", failed: false);

        Assert.True(limiter.TryBeginAttempt("source"));
    }
}
