using System.Text.Json;
using System.Text.Json.Serialization;
using IPCast.Shared;

namespace IPCast.Security;

internal sealed class UnattendedAccessRecord
{
    [JsonPropertyName("enabled")]
    public bool Enabled { get; set; }

    [JsonPropertyName("salt")]
    public string Salt { get; set; } = string.Empty;

    [JsonPropertyName("hash")]
    public string Hash { get; set; } = string.Empty;

    [JsonPropertyName("iterations")]
    public int Iterations { get; set; }
}

/// <summary>Whether unattended access is currently enabled - never exposes the password itself.</summary>
public sealed record UnattendedAccessStatus(bool Enabled);

/// <summary>
/// Persists this device's unattended-access (spec §9) settings: whether it's enabled, and the
/// hashed+salted password required to connect without anyone at the keyboard to click Accept.
/// The password itself is never stored or logged in plaintext.
/// </summary>
public sealed class UnattendedAccessStore
{
    private const int MinimumPasswordLength = 8;

    private readonly string _filePath;
    private static readonly JsonSerializerOptions SerializerOptions = new() { WriteIndented = true };

    public UnattendedAccessStore(string? directory = null)
    {
        directory ??= AppPaths.GetAppDataDirectory();
        _filePath = Path.Combine(directory, "unattended-access.json");
    }

    public UnattendedAccessStatus GetStatus()
    {
        var record = TryLoad();
        return new UnattendedAccessStatus(record?.Enabled ?? false);
    }

    /// <summary>Enables unattended access with the given password. Throws <see cref="ArgumentException"/> if the password is too weak.</summary>
    public void Enable(string password)
    {
        if (string.IsNullOrEmpty(password) || password.Length < MinimumPasswordLength)
        {
            throw new ArgumentException($"Password must be at least {MinimumPasswordLength} characters.", nameof(password));
        }

        var (salt, hash) = PasswordHasher.Hash(password);
        Save(new UnattendedAccessRecord
        {
            Enabled = true,
            Salt = Convert.ToBase64String(salt),
            Hash = Convert.ToBase64String(hash),
            Iterations = PasswordHasher.DefaultIterations,
        });
    }

    public void Disable()
    {
        var record = TryLoad() ?? new UnattendedAccessRecord();
        record.Enabled = false;
        Save(record);
    }

    /// <summary>Verifies a password against the stored hash. Returns false if unattended access isn't enabled at all.</summary>
    public bool VerifyPassword(string password)
    {
        var record = TryLoad();
        if (record is null || !record.Enabled || string.IsNullOrEmpty(record.Hash))
        {
            return false;
        }

        try
        {
            var salt = Convert.FromBase64String(record.Salt);
            var expectedHash = Convert.FromBase64String(record.Hash);
            return PasswordHasher.Verify(password, salt, expectedHash, record.Iterations);
        }
        catch (FormatException)
        {
            return false;
        }
    }

    private UnattendedAccessRecord? TryLoad()
    {
        if (!File.Exists(_filePath))
        {
            return null;
        }

        try
        {
            return JsonSerializer.Deserialize<UnattendedAccessRecord>(File.ReadAllText(_filePath));
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or JsonException)
        {
            return null;
        }
    }

    private void Save(UnattendedAccessRecord record)
    {
        var directory = Path.GetDirectoryName(_filePath)!;
        Directory.CreateDirectory(directory);
        var json = JsonSerializer.Serialize(record, SerializerOptions);

        var tempPath = _filePath + ".tmp";
        File.WriteAllText(tempPath, json);
        File.Move(tempPath, _filePath, overwrite: true);
    }
}
