using System.Security.Cryptography;
using IPCast.FileTransfer;
using IPCast.Network;
using IPCast.Shared;
using Xunit;

namespace IPCast.Tests;

public class FileTransferTests : IAsyncDisposable
{
    private readonly DeviceId _hostId = DeviceId.FromValidatedRaw("333444555");
    private readonly DeviceId _clientId = DeviceId.FromValidatedRaw("666777888");
    private readonly string _tempDirectory = Path.Combine(Path.GetTempPath(), "IPCastFileTransferTests_" + Guid.NewGuid());
    private IPCastHost? _host;

    public async ValueTask DisposeAsync()
    {
        if (_host is not null)
        {
            await _host.DisposeAsync();
        }

        if (Directory.Exists(_tempDirectory))
        {
            Directory.Delete(_tempDirectory, recursive: true);
        }
    }

    [Fact]
    public async Task SendFileAsync_TransfersMultiChunkFileWithMatchingHash()
    {
        Directory.CreateDirectory(_tempDirectory);
        var sourcePath = Path.Combine(_tempDirectory, "source.bin");
        var destinationPath = Path.Combine(_tempDirectory, "received.bin");

        // A few chunks' worth of random bytes (chunk size is 256 KiB) so this actually exercises
        // multi-chunk transfer, not just a single-message edge case.
        var randomBytes = new byte[700 * 1024];
        RandomNumberGenerator.Fill(randomBytes);
        await File.WriteAllBytesAsync(sourcePath, randomBytes);

        var (initiator, acceptor, host) = await SessionTestHelper.EstablishSessionAsync(
            _hostId, _clientId, ConnectionPermissions.FileTransfer);
        _host = host;

        await using var initiatorLoop = new SessionMessageLoop(initiator);
        await using var acceptorLoop = new SessionMessageLoop(acceptor);

        var receiver = new FileReceiver(acceptorLoop, acceptor)
        {
            OnFileOffered = _ => Task.FromResult(FileOfferDecision.AcceptTo(destinationPath)),
        };
        var receivedTcs = new TaskCompletionSource<string>();
        receiver.FileReceived += path => receivedTcs.TrySetResult(path);

        initiatorLoop.Start();
        acceptorLoop.Start();

        var sender = new FileSender();
        var progressReports = new List<FileTransferProgress>();
        var result = await sender.SendFileAsync(
            initiatorLoop, initiator, sourcePath, new SynchronousProgress<FileTransferProgress>(progressReports.Add));

        Assert.True(result.Success, result.Error);
        await receivedTcs.Task.WaitAsync(TimeSpan.FromSeconds(5));

        var expectedHash = SHA256.HashData(randomBytes);
        var actualHash = SHA256.HashData(await File.ReadAllBytesAsync(destinationPath));
        Assert.Equal(expectedHash, actualHash);
        Assert.NotEmpty(progressReports);
        Assert.Equal(randomBytes.Length, progressReports[^1].BytesTransferred);

        initiator.Dispose();
        acceptor.Dispose();
    }

    [Fact]
    public async Task SendFileAsync_FailsWhenPermissionNotGranted()
    {
        Directory.CreateDirectory(_tempDirectory);
        var sourcePath = Path.Combine(_tempDirectory, "source.bin");
        await File.WriteAllBytesAsync(sourcePath, [1, 2, 3]);

        var (initiator, acceptor, host) = await SessionTestHelper.EstablishSessionAsync(
            _hostId, _clientId, ConnectionPermissions.ViewScreen);
        _host = host;

        var sender = new FileSender();
        var result = await sender.SendFileAsync(new SessionMessageLoop(initiator), initiator, sourcePath);

        Assert.False(result.Success);
        Assert.Contains("wasn't granted", result.Error);

        initiator.Dispose();
        acceptor.Dispose();
    }

    [Fact]
    public async Task SendFileAsync_ReportsRejectionReason()
    {
        Directory.CreateDirectory(_tempDirectory);
        var sourcePath = Path.Combine(_tempDirectory, "source.bin");
        await File.WriteAllBytesAsync(sourcePath, [1, 2, 3, 4]);

        var (initiator, acceptor, host) = await SessionTestHelper.EstablishSessionAsync(
            _hostId, _clientId, ConnectionPermissions.FileTransfer);
        _host = host;

        await using var initiatorLoop = new SessionMessageLoop(initiator);
        await using var acceptorLoop = new SessionMessageLoop(acceptor);
        _ = new FileReceiver(acceptorLoop, acceptor)
        {
            OnFileOffered = _ => Task.FromResult(FileOfferDecision.Reject("No thanks.")),
        };

        initiatorLoop.Start();
        acceptorLoop.Start();

        var result = await new FileSender().SendFileAsync(initiatorLoop, initiator, sourcePath);

        Assert.False(result.Success);
        Assert.Equal("No thanks.", result.Error);

        initiator.Dispose();
        acceptor.Dispose();
    }
}

/// <summary>
/// IProgress&lt;T&gt;.Report normally marshals through SynchronizationContext (async, possibly
/// deferred) - tests need the callback to run synchronously so assertions right after awaiting
/// SendFileAsync can rely on every report having already been recorded.
/// </summary>
internal sealed class SynchronousProgress<T>(Action<T> callback) : IProgress<T>
{
    public void Report(T value) => callback(value);
}
