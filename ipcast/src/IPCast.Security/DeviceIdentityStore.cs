using System.Text.Json;
using System.Text.Json.Serialization;
using IPCast.Shared;

namespace IPCast.Security;

internal sealed class DeviceIdentityRecord
{
    [JsonPropertyName("deviceId")]
    public string DeviceId { get; set; } = string.Empty;

    [JsonPropertyName("createdUtc")]
    public DateTimeOffset CreatedUtc { get; set; }
}

/// <summary>
/// Persists the device's IPCast ID to local disk so the same ID survives app restarts,
/// as required by the product spec ("ID kalıcı olsun").
/// </summary>
public sealed class DeviceIdentityStore
{
    private static readonly JsonSerializerOptions SerializerOptions = new() { WriteIndented = true };

    private readonly string _filePath;

    /// <param name="directory">
    /// Directory to store the identity file in. Defaults to <see cref="AppPaths.GetAppDataDirectory"/>.
    /// Overridable so tests can point at a temp directory instead of the real user profile.
    /// </param>
    public DeviceIdentityStore(string? directory = null)
    {
        directory ??= AppPaths.GetAppDataDirectory();
        _filePath = Path.Combine(directory, "device-identity.json");
    }

    /// <summary>
    /// Loads the persisted device ID, or generates and persists a new one if none exists yet
    /// (or the existing file is missing/corrupt).
    /// </summary>
    public DeviceId LoadOrCreate()
    {
        if (TryLoad(out var existing))
        {
            return existing;
        }

        var generated = SecureIdGenerator.Generate();
        Save(generated);
        return generated;
    }

    private bool TryLoad(out DeviceId deviceId)
    {
        deviceId = default;

        if (!File.Exists(_filePath))
        {
            return false;
        }

        try
        {
            var json = File.ReadAllText(_filePath);
            var record = JsonSerializer.Deserialize<DeviceIdentityRecord>(json);
            return record is not null && DeviceId.TryParse(record.DeviceId, out deviceId);
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or JsonException)
        {
            // Corrupt or unreadable identity file: fall through and let the caller generate a new one.
            return false;
        }
    }

    private void Save(DeviceId deviceId)
    {
        var directory = Path.GetDirectoryName(_filePath)!;
        Directory.CreateDirectory(directory);

        var record = new DeviceIdentityRecord { DeviceId = deviceId.Raw, CreatedUtc = DateTimeOffset.UtcNow };
        var json = JsonSerializer.Serialize(record, SerializerOptions);

        // Write to a temp file then move into place so a crash mid-write can't corrupt the identity file.
        var tempPath = _filePath + ".tmp";
        File.WriteAllText(tempPath, json);
        File.Move(tempPath, _filePath, overwrite: true);
    }
}
