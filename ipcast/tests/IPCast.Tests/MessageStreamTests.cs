using System.Net;
using System.Net.Sockets;
using System.Text.Json;
using IPCast.Network.Protocol;
using Xunit;

namespace IPCast.Tests;

public class MessageStreamTests
{
    [Fact]
    public async Task WriteThenRead_RoundTripsMessageOverRealSocket()
    {
        using var listener = new TcpListener(IPAddress.Loopback, 0);
        listener.Start();
        var port = ((IPEndPoint)listener.LocalEndpoint).Port;

        using var client = new TcpClient();
        var acceptTask = listener.AcceptTcpClientAsync();
        await client.ConnectAsync(IPAddress.Loopback, port);
        using var server = await acceptTask;

        var sent = new HelloMessage("847293615", "1.0.0-test");
        await MessageStream.WriteAsync(client.GetStream(), MessageType.Hello, sent);

        var (type, payload) = await MessageStream.ReadAsync(server.GetStream());

        Assert.Equal(MessageType.Hello, type);
        var received = payload.Deserialize<HelloMessage>();
        Assert.Equal(sent, received);
    }

    [Fact]
    public async Task ReadAsync_ThrowsWhenRemoteClosesMidMessage()
    {
        using var listener = new TcpListener(IPAddress.Loopback, 0);
        listener.Start();
        var port = ((IPEndPoint)listener.LocalEndpoint).Port;

        using var client = new TcpClient();
        var acceptTask = listener.AcceptTcpClientAsync();
        await client.ConnectAsync(IPAddress.Loopback, port);
        using var server = await acceptTask;

        client.Dispose(); // close before sending anything

        await Assert.ThrowsAsync<EndOfStreamException>(() => MessageStream.ReadAsync(server.GetStream()));
    }
}
