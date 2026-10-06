namespace IPCast.RemoteDesktop;

/// <summary>Session-local JPEG quality adjustment based on transport backpressure.</summary>
public sealed class AdaptiveQualityController
{
    private int _fastWrites;
    public int Quality { get; private set; } = 70;

    public void ObserveWrite(TimeSpan duration, TimeSpan frameInterval)
    {
        if (duration < TimeSpan.Zero || frameInterval <= TimeSpan.Zero)
            throw new ArgumentOutOfRangeException(nameof(duration));

        if (duration.TotalMilliseconds > frameInterval.TotalMilliseconds * 1.5)
        {
            Quality = Math.Max(30, Quality - 5);
            _fastWrites = 0;
        }
        else if (duration.TotalMilliseconds < frameInterval.TotalMilliseconds * 0.5)
        {
            if (++_fastWrites >= 8)
            {
                Quality = Math.Min(85, Quality + 2);
                _fastWrites = 0;
            }
        }
        else
        {
            _fastWrites = 0;
        }
    }
}
