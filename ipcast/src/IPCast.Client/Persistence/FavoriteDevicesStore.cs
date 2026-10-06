using System.Text.Json;
using System.Text.Json.Serialization;
using IPCast.Shared;

namespace IPCast.Client.Persistence;

public sealed record FavoriteDevice(
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("deviceId")] string DeviceId,
    [property: JsonPropertyName("lastConnectedUtc")] DateTimeOffset? LastConnectedUtc,
    [property: JsonPropertyName("macAddress")] string? MacAddress = null,
    [property: JsonPropertyName("group")] string Group = "Personal",
    [property: JsonPropertyName("tags")] string Tags = "",
    [property: JsonPropertyName("notes")] string Notes = "")
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
        var existing = GetAll().FirstOrDefault(d => d.DeviceId == deviceId);
        var entries = GetAll().Where(d => d.DeviceId != deviceId).ToList();
        entries.Add(existing is null ? new FavoriteDevice(name, deviceId, LastConnectedUtc: null) : existing with { Name = name });
        Save(entries);
    }

    public void SetDetails(string deviceId, string group, string tags, string notes) =>
        Save(GetAll().Select(d => d.DeviceId == deviceId ? d with
        {
            Group = string.IsNullOrWhiteSpace(group) ? "Personal" : group.Trim()[..Math.Min(group.Trim().Length, 80)],
            Tags = tags.Trim()[..Math.Min(tags.Trim().Length, 300)],
            Notes = notes.Trim()[..Math.Min(notes.Trim().Length, 2000)]
        } : d).ToList());

    public string Export() => JsonSerializer.Serialize(GetAll(), SerializerOptions);

    // Validate the entire import before touching the existing address book. Existing entries win.
    public int Import(string json)
    {
        if (json.Length > 2_000_000) throw new InvalidDataException("Address book is too large (maximum 2 MB).");
        var imported = JsonSerializer.Deserialize<List<FavoriteDevice>>(json)
            ?? throw new InvalidDataException("Choose an IPCast address book JSON file.");
        if (imported.Count > 5000) throw new InvalidDataException("An address book can import at most 5,000 devices.");
        var valid = new List<FavoriteDevice>();
        foreach (var entry in imported)
        {
            if (entry is null || !IPCast.Shared.DeviceId.TryParse(entry.DeviceId, out var id) ||
                string.IsNullOrWhiteSpace(entry.Name) || entry.Name.Length > 200 ||
                (entry.Group?.Length ?? 0) > 80 || (entry.Tags?.Length ?? 0) > 300 || (entry.Notes?.Length ?? 0) > 2000)
                throw new InvalidDataException("An entry has an invalid ID, name or details. Nothing was imported.");
            valid.Add(entry with { DeviceId = id.Raw, Name = entry.Name.Trim(), Group = string.IsNullOrWhiteSpace(entry.Group) ? "Personal" : entry.Group.Trim(), Tags = entry.Tags ?? "", Notes = entry.Notes ?? "" });
        }
        var entries = GetAll().ToList(); var ids = entries.Select(d => d.DeviceId).ToHashSet(); var count = 0;
        foreach (var entry in valid) if (ids.Add(entry.DeviceId)) { entries.Add(entry); count++; }
        Save(entries); return count;
    }

    public void Remove(string deviceId) => Save(GetAll().Where(d => d.DeviceId != deviceId).ToList());
    public void SetMacAddress(string deviceId, string mac) =>
        Save(GetAll().Select(d => d.DeviceId == deviceId ? d with { MacAddress = mac } : d).ToList());

    public void Rename(string deviceId, string newName)
    {
        var entries = GetAll()
            .Select(d => d.DeviceId == deviceId ? d with { Name = newName } : d)
            .ToList();
        Save(entries);
    }

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
