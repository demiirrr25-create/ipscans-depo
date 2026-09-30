namespace IPCast.RemoteDesktop;

public sealed record StreamingProfile(int MaxDimension, int Quality, int FramesPerSecond, int BytesPerSecond)
{
    public static StreamingProfile FromName(string? name) => name switch
    {
        "Speed" => new(1280, 45, 20, 384 * 1024),
        "Quality" => new(2560, 80, 15, 2 * 1024 * 1024),
        _ => new(1600, 60, 20, 1024 * 1024)
    };

    // Account for JSON/base64 overhead. This is an average application-payload
    // budget, not a guarantee about physical link bandwidth or TLS overhead.
    public static TimeSpan FrameBudget(TimeSpan minimum, int jpegBytes, int bytesPerSecond)
        => bytesPerSecond <= 0 ? minimum : TimeSpan.FromSeconds(Math.Max(minimum.TotalSeconds, (jpegBytes * 4d / 3 + 256) / bytesPerSecond));
}
