using IPCast.FileTransfer;
using IPCast.Network;
using IPCast.Shared;

namespace IPCast.Tests;

public class EmptyFileTests
{
    [Fact]
    public async Task EmptyFile_IsClosedAndAcknowledged_AndNextTransferWorks()
    {
        var directory = Path.Combine(Path.GetTempPath(), "IPCastEmptyFile_" + Guid.NewGuid());
        Directory.CreateDirectory(directory);
        try
        {
            var source = Path.Combine(directory, "empty.txt");
            var target = Path.Combine(directory, "received.txt");
            await File.WriteAllBytesAsync(source, []);
            var (initiator, acceptor, host) = await SessionTestHelper.EstablishSessionAsync(
                DeviceId.FromValidatedRaw("123123123"), DeviceId.FromValidatedRaw("456456456"), ConnectionPermissions.FileTransfer);
            await using var hostLifetime = host;
            using var initiatorLifetime = initiator;
            using var acceptorLifetime = acceptor;
            await using var senderLoop = new SessionMessageLoop(initiator);
            await using var receiverLoop = new SessionMessageLoop(acceptor);
            using var receiver = new FileReceiver(receiverLoop, acceptor) {
                OnFileOffered = _ => Task.FromResult(FileOfferDecision.AcceptTo(target))
            };
            senderLoop.Start(); receiverLoop.Start();
            var sender = new FileSender();
            var first = await sender.SendFileAsync(senderLoop, initiator, source);
            Assert.True(first.Success, first.Error);
            Assert.Equal(0, new FileInfo(target).Length);
            await File.WriteAllTextAsync(source, "next transfer");
            var second = await sender.SendFileAsync(senderLoop, initiator, source);
            Assert.True(second.Success, second.Error);
            Assert.Equal("next transfer", await File.ReadAllTextAsync(target));
        }
        finally { Directory.Delete(directory, recursive: true); }
    }
}
