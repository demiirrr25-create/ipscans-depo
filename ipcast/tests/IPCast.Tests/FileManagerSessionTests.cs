using IPCast.FileTransfer;
using IPCast.Network;
using IPCast.Shared;
using Xunit;

namespace IPCast.Tests;

public class FileManagerSessionTests
{
    [Fact]
    public async Task SharedFolderIsOptInAndRpcTransfersVerifiedFileOverTls()
    {
        var root = Path.Combine(Path.GetTempPath(), "ipcast-manager-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(root);
        try
        {
            var sourceRoot = Directory.CreateDirectory(Path.Combine(root, "source")).FullName;
            var targetRoot = Directory.CreateDirectory(Path.Combine(root, "target")).FullName;
            var data = new byte[350000]; Random.Shared.NextBytes(data);
            await File.WriteAllBytesAsync(Path.Combine(sourceRoot, "payload.bin"), data);
            var (viewer, sharer, host) = await SessionTestHelper.EstablishSessionAsync(
                DeviceId.FromValidatedRaw("123456789"), DeviceId.FromValidatedRaw("987654321"), ConnectionPermissions.FileTransfer);
            await using (host)
            using (viewer) using (sharer)
            {
                await using var sendLoop = new SessionMessageLoop(viewer);
                await using var receiveLoop = new SessionMessageLoop(sharer);
                await using var client = new FileManagerSession(sendLoop, viewer);
                await using var server = new FileManagerSession(receiveLoop, sharer);
                sendLoop.Start(); receiveLoop.Start();
                await Assert.ThrowsAsync<IOException>(() => client.RequestAsync(new("", "list")));
                server.ShareFolder(targetRoot);
                var source = new SharedFileSystem(sourceRoot);
                await ManagedFileCopy.CopyAsync((r, _) => Task.FromResult(source.Execute(r)), client.RequestAsync,
                    "payload.bin", "received.bin", true);
                Assert.Equal(data, await File.ReadAllBytesAsync(Path.Combine(targetRoot, "received.bin")));
                var listing = await client.RequestAsync(new("", "list"));
                Assert.Single(listing.Entries!);
                server.ShareFolder(null);
                await Assert.ThrowsAsync<IOException>(() => client.RequestAsync(new("", "read", "received.bin")));
            }
        }
        finally { Directory.Delete(root, true); }
    }
}
