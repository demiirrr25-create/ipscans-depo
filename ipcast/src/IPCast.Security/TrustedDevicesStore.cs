using System.Text.Json;
using IPCast.Shared;

namespace IPCast.Security;

/// <summary>Certificates approved by the user after comparing fingerprints out of band.</summary>
public sealed class TrustedDevicesStore
{
    private readonly string _path;
    public TrustedDevicesStore(string? directory = null) => _path = Path.Combine(directory ?? AppPaths.GetAppDataDirectory(), "trusted-devices.json");
    private Dictionary<string, string> Read() => File.Exists(_path)
        ? JsonSerializer.Deserialize<Dictionary<string, string>>(File.ReadAllText(_path)) ?? [] : [];
    public string? GetFingerprint(string device) => Read().GetValueOrDefault(device);
    public void Remember(string device, string fingerprint)
    {
        var devices = Read();
        devices[device] = fingerprint;
        Directory.CreateDirectory(Path.GetDirectoryName(_path)!);
        File.WriteAllText(_path + ".tmp", JsonSerializer.Serialize(devices));
        File.Move(_path + ".tmp", _path, true);
    }
}
