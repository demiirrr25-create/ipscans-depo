using System.Net;
using System.Security.Cryptography;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace IPCast.Network;

public sealed record AvailableUpdate(Version Version, string Notes, Uri Url, string Sha256, long Size);

/// <summary>Updates trust GitHub's HTTPS release API and server-computed asset digest. This is integrity
/// verification, not Authenticode publisher signing. Unsigned installation requires an explicit UI action.</summary>
public sealed partial class GitHubUpdater : IDisposable
{
    private const string Repository = "demiirrr25-create/ipscans-depo";
    private readonly HttpClient _http;
    public GitHubUpdater(HttpMessageHandler? handler = null)
    {
        _http = new HttpClient(handler ?? new HttpClientHandler { AllowAutoRedirect = false }) { Timeout = TimeSpan.FromMinutes(10) };
        _http.DefaultRequestHeaders.UserAgent.ParseAdd("IPCast-Updater/2.1");
    }
    [GeneratedRegex(@"^ipcast-v(\d+\.\d+\.\d+)$")]
    private static partial Regex TagPattern();
    public static AvailableUpdate? ParseRelease(JsonElement release, Version current)
    {
        if (release.GetProperty("draft").GetBoolean() || release.GetProperty("prerelease").GetBoolean()) return null;
        var tag = release.GetProperty("tag_name").GetString() ?? "";
        var match = TagPattern().Match(tag);
        if (!match.Success || !Version.TryParse(match.Groups[1].Value, out var version) || version <= current) return null;
        var expectedName = $"IPCast-{version}-Setup.exe";
        foreach (var asset in release.GetProperty("assets").EnumerateArray())
        {
            if (asset.GetProperty("name").GetString() != expectedName) continue;
            var expected = $"https://github.com/{Repository}/releases/download/{tag}/{expectedName}";
            if (asset.GetProperty("browser_download_url").GetString() != expected) throw new InvalidDataException("Unexpected update source.");
            var digest = asset.TryGetProperty("digest", out var value) ? value.GetString() : null;
            var size = asset.GetProperty("size").GetInt64();
            if (digest is null || !digest.StartsWith("sha256:", StringComparison.Ordinal) || digest.Length != 71 ||
                !digest[7..].All(Uri.IsHexDigit) || size is < 1024 or > 1073741824)
                throw new InvalidDataException("The update has no valid GitHub SHA-256 digest or size.");
            return new(version, release.TryGetProperty("body", out var body) ? body.GetString() ?? "" : "",
                new Uri(expected), digest[7..].ToLowerInvariant(), size);
        }
        return null;
    }
    public async Task<AvailableUpdate?> CheckAsync(Version current, CancellationToken ct = default)
    {
        using var response = await _http.GetAsync($"https://api.github.com/repos/{Repository}/releases?per_page=30", HttpCompletionOption.ResponseHeadersRead, ct);
        response.EnsureSuccessStatusCode();
        await using var input = await response.Content.ReadAsStreamAsync(ct);
        using var limited = new MemoryStream();
        var buffer = new byte[8192];
        int count;
        while ((count = await input.ReadAsync(buffer, ct)) != 0)
        {
            if (limited.Length + count > 2 * 1024 * 1024) throw new InvalidDataException("Release response is too large.");
            await limited.WriteAsync(buffer.AsMemory(0, count), ct);
        }
        using var releases = JsonDocument.Parse(limited.ToArray());
        return releases.RootElement.EnumerateArray().Select(r => ParseRelease(r, current))
            .OfType<AvailableUpdate>().OrderByDescending(r => r.Version).FirstOrDefault();
    }
    private async Task<HttpResponseMessage> OpenDownloadAsync(Uri url, CancellationToken ct)
    {
        for (var i = 0; i < 6; i++)
        {
            if (url.Scheme != "https" || url.Host is not ("github.com" or "release-assets.githubusercontent.com" or "objects.githubusercontent.com"))
                throw new InvalidDataException("Update redirect is not a trusted HTTPS asset host.");
            var response = await _http.GetAsync(url, HttpCompletionOption.ResponseHeadersRead, ct);
            if (response.StatusCode is HttpStatusCode.Moved or HttpStatusCode.Redirect or HttpStatusCode.TemporaryRedirect or HttpStatusCode.PermanentRedirect)
            {
                var location = response.Headers.Location; response.Dispose();
                if (location is null) throw new InvalidDataException("Invalid update redirect.");
                url = location.IsAbsoluteUri ? location : new Uri(url, location);
                continue;
            }
            response.EnsureSuccessStatusCode();
            return response;
        }
        throw new InvalidDataException("Too many update redirects.");
    }
    public async Task<string> DownloadAsync(AvailableUpdate update, string directory, IProgress<double>? progress = null, CancellationToken ct = default)
    {
        Directory.CreateDirectory(directory);
        var path = Path.Combine(directory, $"IPCast-{update.Version}-{Guid.NewGuid():N}-Setup.exe");
        try
        {
            using var response = await OpenDownloadAsync(update.Url, ct);
            if (response.Content.Headers.ContentLength is { } size && size != update.Size) throw new InvalidDataException("Update size mismatch.");
            await using var input = await response.Content.ReadAsStreamAsync(ct);
            await using (var output = new FileStream(path, FileMode.CreateNew, FileAccess.Write, FileShare.None, 65536, true))
            {
                using var hash = IncrementalHash.CreateHash(HashAlgorithmName.SHA256);
                var buffer = new byte[65536]; long total = 0;
                int count;
                while ((count = await input.ReadAsync(buffer, ct)) != 0)
                {
                    total += count;
                    if (total > update.Size) throw new InvalidDataException("Update exceeds the announced size.");
                    hash.AppendData(buffer, 0, count);
                    await output.WriteAsync(buffer.AsMemory(0, count), ct);
                    progress?.Report((double)total / update.Size * 100);
                }
                if (total != update.Size || !Convert.ToHexString(hash.GetHashAndReset()).Equals(update.Sha256, StringComparison.OrdinalIgnoreCase))
                    throw new InvalidDataException("Update integrity check failed. Installation was blocked.");
            }
            return path;
        }
        catch { if (File.Exists(path)) File.Delete(path); throw; }
    }
    public static async Task VerifyFileAsync(string path, AvailableUpdate update)
    {
        using var stream = File.OpenRead(path);
        if (stream.Length != update.Size || !Convert.ToHexString(await SHA256.HashDataAsync(stream)).Equals(update.Sha256, StringComparison.OrdinalIgnoreCase))
            throw new InvalidDataException("Update changed after download. Installation was blocked.");
        stream.Position = 0;
        if (stream.ReadByte() != 'M' || stream.ReadByte() != 'Z') throw new InvalidDataException("Invalid Windows executable.");
    }
    public void Dispose() => _http.Dispose();
}
