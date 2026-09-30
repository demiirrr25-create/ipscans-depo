using System.Text.Json;
using IPCast.Shared;

namespace IPCast.Client.Persistence;

public sealed record Preferences(string RelayAddress = "", bool ClipboardSync = true);

public sealed class PreferencesStore
{
    private readonly string _path = Path.Combine(AppPaths.GetAppDataDirectory(), "preferences.json");

    public Preferences Load()
    {
        try { return JsonSerializer.Deserialize<Preferences>(File.ReadAllText(_path)) ?? new(); }
        catch (Exception ex) when (ex is IOException or JsonException or UnauthorizedAccessException) { return new(); }
    }

    public void Save(Preferences preferences)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(_path)!);
        File.WriteAllText(_path + ".tmp", JsonSerializer.Serialize(preferences));
        File.Move(_path + ".tmp", _path, overwrite: true);
    }
}
