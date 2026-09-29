using System.Text.Json;
using System.Text.Json.Serialization;
using IPCast.Shared;

namespace IPCast.Client.Persistence;

public sealed record FavoriteDevice(
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("deviceId")] string DeviceId,
    [property: JsonPropertyName("lastConnectedUtc")] DateTimeOffset? LastConnectedUtc)
{
    [JsonIgnore]
    public string FormattedId => DeviceId.Length == 9 ? $"{DeviceId[..3]} {DeviceId[3..6]} {DeviceId[6..9]}" : DeviceId;

    [JsonIgnore]
    public string LastConnectedDisplay => LastConnectedUtc is { } t ? t.ToLocalTime().ToString("MMM d, HH:mm") : "Never";
}

/// <summary>Persists saved devices (spec §20 My Devices/Favorites) so users don't have to re-type a remote ID every time.</summary>
public sealed class FavoriteDevicesStore
{
    private static readonly JsonSerializerOptions SerializerOptions = new() { WriteIndented = true };

    private readonly string _filePath;

    public FavoriteDevicesStore(string? directory = null)
    {
        directory ??= AppPaths.GetAppDataDirectory();
        _filePath = Path.Combine(directory, "favorite-devices.json");
    }

    public IReadOnlyList<FavoriteDevice> GetAll()
    {
        if (!File.Exists(_filePath))
        {
            return [];
        }

        try
        {
            var entries = JsonSerializer.Deserialize<List<FavoriteDevice>>(File.ReadAllText(_filePath));
            return entries ?? [];
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or JsonException)
        {
            return [];
        }
    }

    public void Add(string name, string deviceId)
    {
        var entries = GetAll().Where(d => d.DeviceId != deviceId).ToList();
        entries.Add(new FavoriteDevice(name, deviceId, LastConnectedUtc: null));
        Save(entries);
    }

    public void Remove(string deviceId) => Save(GetAll().Where(d => d.DeviceId != deviceId).ToList());

    public void NotifyConnected(string deviceId)
    {
        var entries = GetAll()
            .Select(d => d.DeviceId == deviceId ? d with { LastConnectedUtc = DateTimeOffset.UtcNow } : d)
            .ToList();
        Save(entries);
    }

    private void Save(List<FavoriteDevice> entries)
    {
        var directory = Path.GetDirectoryName(_filePath)!;
        Directory.CreateDirectory(directory);
        var json = JsonSerializer.Serialize(entries, SerializerOptions);

        var tempPath = _filePath + ".tmp";
        File.WriteAllText(tempPath, json);
        File.Move(tempPath, _filePath, overwrite: true);
    }
}
