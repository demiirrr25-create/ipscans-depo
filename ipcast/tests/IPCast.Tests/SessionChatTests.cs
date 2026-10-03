using IPCast.Network;
using IPCast.Network.Protocol;
using IPCast.Shared;
using Xunit;

namespace IPCast.Tests;

public class SessionChatTests
{
    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task ChatRequiresPermissionOnSendAndReceive(bool allowed)
    {
        var permission = allowed ? ConnectionPermissions.Chat : ConnectionPermissions.ViewScreen;
        var (viewer, sharer, host) = await SessionTestHelper.EstablishSessionAsync(
            DeviceId.FromValidatedRaw("123456789"), DeviceId.FromValidatedRaw("987654321"), permission);
        await using (host)
        using (viewer) using (sharer)
        {
            await using var sender = new SessionMessageLoop(viewer);
            await using var receiver = new SessionMessageLoop(sharer);
            using var outgoing = new SessionChat(sender, viewer);
            using var incoming = new SessionChat(receiver, sharer);
            var received = new TaskCompletionSource<string>(TaskCreationOptions.RunContinuationsAsynchronously);
            incoming.MessageReceived += text => received.TrySetResult(text);
            sender.Start(); receiver.Start();
            if (allowed)
            {
                await outgoing.SendAsync("Merhaba — IPCast");
                Assert.Equal("Merhaba — IPCast", await received.Task.WaitAsync(TimeSpan.FromSeconds(5)));
                await Assert.ThrowsAsync<ArgumentException>(() => outgoing.SendAsync(new string('a', 4001)));
            }
            else
            {
                await Assert.ThrowsAsync<InvalidOperationException>(() => outgoing.SendAsync("Denied"));
                await sender.SendAsync(MessageType.ChatText, new ChatTextMessage("Bypass attempt"));
                await sender.MeasureLatencyAsync(); // Confirms the preceding packet was processed.
                Assert.False(received.Task.IsCompleted);
            }
        }
    }
}
