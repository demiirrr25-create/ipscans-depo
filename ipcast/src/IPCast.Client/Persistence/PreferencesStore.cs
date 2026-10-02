using System.Text.Json;
using IPCast.Shared;

namespace IPCast.Client.Persistence;

public sealed record Preferences(
    string RelayAddress = Preferences.DefaultRelayAddress,
    bool ClipboardSync = true,
    string StreamingMode = "Balanced",
    bool LaunchAtStartup = false)
{
    public const string DefaultRelayAddress = "wss://p01--ipcast-relay--d5n8c99gjxdn.code.run/relay";
}

public sealed class PreferencesStore
{
    private readonly string _path;

    public PreferencesStore(string? directory = null)
        => _path = Path.Combine(directory ?? AppPaths.GetAppDataDirectory(), "preferences.json");

    public Preferences Load()
    {
        // The distributed client manages its relay. Migrate old empty/invalid/custom
        // endpoints in memory without discarding unrelated user preferences.
        try { return (JsonSerializer.Deserialize<Preferences>(File.ReadAllText(_path)) ?? new()) with { RelayAddress = Preferences.DefaultRelayAddress }; }
        catch (Exception ex) when (ex is IOException or JsonException or UnauthorizedAccessException) { return new(); }
    }

    public void Save(Preferences preferences)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(_path)!);
        File.WriteAllText(_path + ".tmp", JsonSerializer.Serialize(preferences with { RelayAddress = Preferences.DefaultRelayAddress }));
        File.Move(_path + ".tmp", _path, overwrite: true);
    }
}
