using System.Text.Json;
using System.Text.Json.Serialization;
using IPCast.Shared;

namespace IPCast.Client.Persistence;

public enum StreamQuality
{
    Auto,
    Low,
    Medium,
    High,
}

public sealed record IPCastSettings(StreamQuality Quality, int FramesPerSecond)
{
    public static IPCastSettings Default { get; } = new(StreamQuality.Auto, 0);

    public bool IsValid => Enum.IsDefined(Quality) && FramesPerSecond is 0 or 15 or 30 or 60;
}

public sealed record FrameRateOption(string Label, int FramesPerSecond)
{
    public static IReadOnlyList<FrameRateOption> All { get; } =
    [
        new("Auto", 0),
        new("15 FPS", 15),
        new("30 FPS", 30),
        new("60 FPS", 60),
    ];
}

public sealed class IPCastSettingsStore
{
    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        WriteIndented = true,
        Converters = { new JsonStringEnumConverter() },
    };

    private readonly string _filePath;

    public IPCastSettingsStore(string? directory = null)
    {
        directory ??= AppPaths.GetAppDataDirectory();
        _filePath = Path.Combine(directory, "settings.json");
    }

    public IPCastSettings Load()
    {
        if (!File.Exists(_filePath))
        {
            return IPCastSettings.Default;
        }

        try
        {
            var settings = JsonSerializer.Deserialize<IPCastSettings>(File.ReadAllText(_filePath), SerializerOptions);
            return settings is { IsValid: true } ? settings : IPCastSettings.Default;
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or JsonException)
        {
            return IPCastSettings.Default;
        }
    }

    public void Save(IPCastSettings settings)
    {
        ArgumentNullException.ThrowIfNull(settings);
        if (!settings.IsValid)
        {
            throw new ArgumentOutOfRangeException(nameof(settings), "The selected stream settings are not supported.");
        }

        Directory.CreateDirectory(Path.GetDirectoryName(_filePath)!);
        var tempPath = _filePath + ".tmp";
        File.WriteAllText(tempPath, JsonSerializer.Serialize(settings, SerializerOptions));
        File.Move(tempPath, _filePath, overwrite: true);
    }
}