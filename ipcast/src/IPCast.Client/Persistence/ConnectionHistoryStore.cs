using System.Text.Json;
using System.Text.Json.Serialization;
using IPCast.Shared;

namespace IPCast.Client.Persistence;

public sealed record ConnectionHistoryEntry(
    [property: JsonPropertyName("timestampUtc")] DateTimeOffset TimestampUtc,
    [property: JsonPropertyName("remoteId")] string RemoteId,
    [property: JsonPropertyName("direction")] string Direction, // "Outgoing" or "Incoming"
    [property: JsonPropertyName("status")] string Status) // "Connected", "Rejected", "Failed"
{
    [JsonIgnore]
    public string DisplayTimestamp => TimestampUtc.ToLocalTime().ToString("MMM d, HH:mm");
}

/// <summary>
/// Persists recent connection attempts (spec §19 Recent Connections, §27 Connection Log) so users
/// can see - and clear - a history of who connected to what and when, including failed attempts.
/// </summary>
public sealed class ConnectionHistoryStore
{
    private const int MaxEntries = 50;
    private static readonly JsonSerializerOptions SerializerOptions = new() { WriteIndented = true };

    private readonly string _filePath;

    public ConnectionHistoryStore(string? directory = null)
    {
        directory ??= AppPaths.GetAppDataDirectory();
        _filePath = Path.Combine(directory, "connection-history.json");
    }

    public IReadOnlyList<ConnectionHistoryEntry> GetAll()
    {
        if (!File.Exists(_filePath))
        {
            return [];
        }

        try
        {
            var entries = JsonSerializer.Deserialize<List<ConnectionHistoryEntry>>(File.ReadAllText(_filePath));
            return entries ?? [];
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or JsonException)
        {
            return [];
        }
    }

    public void Add(ConnectionHistoryEntry entry)
    {
        var entries = GetAll().ToList();
        entries.Insert(0, entry);
        if (entries.Count > MaxEntries)
        {
            entries.RemoveRange(MaxEntries, entries.Count - MaxEntries);
        }

        Save(entries);
    }

    public void Clear() => Save([]);

    private void Save(List<ConnectionHistoryEntry> entries)
    {
        var directory = Path.GetDirectoryName(_filePath)!;
        Directory.CreateDirectory(directory);
        var json = JsonSerializer.Serialize(entries, SerializerOptions);

        var tempPath = _filePath + ".tmp";
        File.WriteAllText(tempPath, json);
        File.Move(tempPath, _filePath, overwrite: true);
    }
}
