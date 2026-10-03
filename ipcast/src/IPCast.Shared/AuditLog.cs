using System.Text.Json;

namespace IPCast.Shared;

public enum AuditEvent { ApplicationStarted, ApplicationStopped, ConnectionStarted, ConnectionEnded, AuthenticationFailed, FileTransferred, PermissionChanged, ApplicationError }
public enum AuditLevel { Info, Warning, Error, Debug }
public sealed class AuditLog
{
    public static AuditLog Default { get; } = new(Path.Combine(AppPaths.GetAppDataDirectory(), "logs"));
    private readonly object _gate = new();
    public string DirectoryPath { get; }
    public AuditLog(string directory) => DirectoryPath = directory;
    public void Export(string destination, string version)
    {
        lock (_gate)
        {
            using var output = new FileStream(destination, FileMode.CreateNew, FileAccess.Write);
            using var zip = new System.IO.Compression.ZipArchive(output, System.IO.Compression.ZipArchiveMode.Create);
            using (var writer = new StreamWriter(zip.CreateEntry("system.json").Open()))
                writer.Write(JsonSerializer.Serialize(new { version, os = Environment.OSVersion.VersionString,
                    architecture = System.Runtime.InteropServices.RuntimeInformation.ProcessArchitecture.ToString() }));
            foreach (var name in new[] { "ipcast.jsonl", "ipcast.1.jsonl", "ipcast.2.jsonl", "ipcast.3.jsonl", "ipcast.4.jsonl" })
            {
                var path = Path.Combine(DirectoryPath, name);
                if (!File.Exists(path)) continue;
                using var input = File.OpenRead(path);
                using var entry = zip.CreateEntry(name).Open();
                input.CopyTo(entry);
            }
        }
    }
    public void Write(AuditEvent eventName, AuditLevel level = AuditLevel.Info, string? deviceId = null, Exception? error = null)
    {
        try
        {
            lock (_gate)
            {
                Directory.CreateDirectory(DirectoryPath);
                var path = Path.Combine(DirectoryPath, "ipcast.jsonl");
                if (File.Exists(path) && new FileInfo(path).Length >= 1024 * 1024)
                {
                    for (var i = 4; i >= 1; i--)
                    {
                        var previous = Path.Combine(DirectoryPath, $"ipcast.{i}.jsonl");
                        if (i == 4) { if (File.Exists(previous)) File.Delete(previous); }
                        else if (File.Exists(previous)) File.Move(previous, Path.Combine(DirectoryPath, $"ipcast.{i + 1}.jsonl"));
                    }
                    File.Move(path, Path.Combine(DirectoryPath, "ipcast.1.jsonl"));
                }
                // Do not serialize exception messages, paths, credentials, clipboard or file content.
                var record = new
                {
                    timestamp = DateTimeOffset.UtcNow, level = level.ToString().ToUpperInvariant(),
                    eventName = eventName.ToString(),
                    deviceId = DeviceId.TryParse(deviceId ?? "", out var parsed) ? parsed.Raw : null,
                    exceptionType = error?.GetType().Name
                };
                File.AppendAllText(path, JsonSerializer.Serialize(record) + Environment.NewLine);
            }
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException) { }
    }
}
