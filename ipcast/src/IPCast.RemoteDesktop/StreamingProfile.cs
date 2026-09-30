namespace IPCast.RemoteDesktop;

public sealed record StreamingProfile(int MaxDimension, int Quality, int FramesPerSecond)
{
    public static StreamingProfile FromName(string? name) => name switch
    {
        "Speed" => new(1280, 45, 20),
        "Quality" => new(2560, 80, 15),
        _ => new(1600, 60, 20)
    };
}
