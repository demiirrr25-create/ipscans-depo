using System.Net;
using IPCast.Network;
using IPCast.Server;
using Xunit;

namespace IPCast.Tests;

public class RelayServerTests : IAsyncDisposable
{
    private RelayServer? _server;

    public async ValueTask DisposeAsync()
    {
        if (_server is not null)
        {
            await _server.DisposeAsync();
        }
    }

    [Fact]
    public async Task TwoClients_ArePairedAndCanExchangeRawBytesBothWays()
    {
        _server = new RelayServer(port: 0);
        _server.Start();
        var relayEndpoint = new IPEndPoint(IPAddress.Loopback, _server.Port);

        var aTask = RelayClient.ConnectViaRelayAsync(relayEndpoint, "111111111", "222222222");
        var bTask = RelayClient.ConnectViaRelayAsync(relayEndpoint, "222222222", "111111111");

        await Task.WhenAll(aTask, bTask).WaitAsync(TimeSpan.FromSeconds(5));
        using var streamA = await aTask;
        using var streamB = await bTask;

        var messageFromA = "hello from A"u8.ToArray();
        await streamA.WriteAsync(messageFromA);
        await streamA.FlushAsync();

        var buffer = new byte[messageFromA.Length];
        var read = 0;
        while (read < buffer.Length)
        {
            read += await streamB.ReadAsync(buffer.AsMemory(read)).AsTask().WaitAsync(TimeSpan.FromSeconds(5));
        }

        Assert.Equal(messageFromA, buffer);

        var messageFromB = "hello back from B"u8.ToArray();
        await streamB.WriteAsync(messageFromB);
        await streamB.FlushAsync();

        var buffer2 = new byte[messageFromB.Length];
        read = 0;
        while (read < buffer2.Length)
        {
            read += await streamA.ReadAsync(buffer2.AsMemory(read)).AsTask().WaitAsync(TimeSpan.FromSeconds(5));
        }

        Assert.Equal(messageFromB, buffer2);
    }

    [Fact]
    public async Task PairingIsScopedToMatchingDeviceIds_NotFirstComeFirstServed()
    {
        _server = new RelayServer(port: 0);
        _server.Start();
        var relayEndpoint = new IPEndPoint(IPAddress.Loopback, _server.Port);

        // A third, unrelated client registers first but for a different pair - it must not get
        // matched with either A or B below.
        var strangerTask = RelayClient.ConnectViaRelayAsync(relayEndpoint, "999999999", "888888888");

        var aTask = RelayClient.ConnectViaRelayAsync(relayEndpoint, "333333333", "444444444");
        var bTask = RelayClient.ConnectViaRelayAsync(relayEndpoint, "444444444", "333333333");

        await Task.WhenAll(aTask, bTask).WaitAsync(TimeSpan.FromSeconds(5));
        using var streamA = await aTask;
        using var streamB = await bTask;

        var payload = "only for the right pair"u8.ToArray();
        await streamA.WriteAsync(payload);
        await streamA.FlushAsync();

        var buffer = new byte[payload.Length];
        var read = 0;
        while (read < buffer.Length)
        {
            read += await streamB.ReadAsync(buffer.AsMemory(read)).AsTask().WaitAsync(TimeSpan.FromSeconds(5));
        }

        Assert.Equal(payload, buffer);
        Assert.False(strangerTask.IsCompleted, "The unrelated stranger should still be waiting for its own pair, not matched with A/B.");
    }
}
