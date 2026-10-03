using System.Net;
using System.Security.Cryptography;
using System.Text.Json;
using IPCast.Network;
using Xunit;

namespace IPCast.Tests;
public class GitHubUpdaterTests
{
    private static JsonElement Release(string digest, string url = "https://github.com/demiirrr25-create/ipscans-depo/releases/download/ipcast-v2.2.0/IPCast-2.2.0-Setup.exe")
        => JsonSerializer.SerializeToElement(new { draft = false, prerelease = false, tag_name = "ipcast-v2.2.0", body = "Notes",
            assets = new[] { new { name = "IPCast-2.2.0-Setup.exe", browser_download_url = url, digest, size = 2048 } } });
    [Fact]
    public void RejectsDowngradeMissingDigestAndForeignDownload()
    {
        var digest = "sha256:" + new string('a', 64);
        Assert.Null(GitHubUpdater.ParseRelease(Release(digest), new Version(2, 3, 0)));
        Assert.Throws<InvalidDataException>(() => GitHubUpdater.ParseRelease(Release(""), new Version(2, 1, 0)));
        Assert.Throws<InvalidDataException>(() => GitHubUpdater.ParseRelease(Release(digest, "https://example.com/malware.exe"), new Version(2, 1, 0)));
    }
    private sealed class Handler(byte[] bytes) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) =>
            Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new ByteArrayContent(bytes) });
    }
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task OnlyMatchingDownloadSurvivesVerification(bool tampered)
    {
        var bytes = new byte[2048]; Random.Shared.NextBytes(bytes); bytes[0] = (byte)'M'; bytes[1] = (byte)'Z';
        var digest = Convert.ToHexString(SHA256.HashData(bytes));
        var update = GitHubUpdater.ParseRelease(Release("sha256:" + digest), new Version(2, 1, 0))!;
        if (tampered) bytes[123] ^= 1;
        using var updater = new GitHubUpdater(new Handler(bytes));
        var directory = Directory.CreateTempSubdirectory("ipcast-update-test-").FullName;
        try
        {
            if (tampered)
            {
                await Assert.ThrowsAsync<InvalidDataException>(() => updater.DownloadAsync(update, directory));
                Assert.Empty(Directory.GetFiles(directory));
            }
            else
            {
                var file = await updater.DownloadAsync(update, directory);
                await GitHubUpdater.VerifyFileAsync(file, update);
                await File.AppendAllTextAsync(file, "tampered");
                await Assert.ThrowsAsync<InvalidDataException>(() => GitHubUpdater.VerifyFileAsync(file, update));
            }
        }
        finally { Directory.Delete(directory, true); }
    }
}
