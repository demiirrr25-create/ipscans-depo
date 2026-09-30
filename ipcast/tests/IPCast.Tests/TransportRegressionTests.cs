using System.Net;
using System.Net.Sockets;
using System.Text.Json;
using IPCast.Network;
using IPCast.Network.Protocol;
using IPCast.Server;
using IPCast.Shared;

namespace IPCast.Tests;

public class TransportRegressionTests
{
    [Fact]
    public async Task ConcurrentFrameClipboardAndFileWrites_DoNotInterleave()
    {
        using var wire = new YieldingStream();
        var writes = Enumerable.Range(0, 90).Select(i => MessageStream.WriteAsync(wire,
            i % 2 == 0 ? MessageType.ClipboardText : MessageType.FileChunk,
            new { Index = i, Data = new string('x', 10000) }));
        await Task.WhenAll(writes);
        wire.Position = 0;
        var indices = new HashSet<int>();
        for (var i = 0; i < 90; i++)
        {
            var (_, payload) = await MessageStream.ReadAsync(wire);
            Assert.Equal(10000, payload.GetProperty("Data").GetString()!.Length);
            indices.Add(payload.GetProperty("Index").GetInt32());
        }
        Assert.Equal(90, indices.Count);
    }

    [Fact]
    public async Task LargeScreenFrame_RoundTripsAboveOldOneMiBLimit()
    {
        using var stream = new MemoryStream();
        var data = new byte[2 * 1024 * 1024];
        await MessageStream.WriteAsync(stream, MessageType.ScreenFrame, new ScreenFrameMessage(1920, 1080, "jpeg", data));
        stream.Position = 0;
        var (_, payload) = await MessageStream.ReadAsync(stream);
        Assert.Equal(data.Length, payload.Deserialize<ScreenFrameMessage>()!.Data.Length);
    }

    [Theory]
    [InlineData("192.168.1.20", 0, false)]
    [InlineData("192.168.1.20:0", 9876, false)]
    [InlineData("192.168.1.20:70000", 9876, false)]
    [InlineData("192.168.1.20:45000", 0, true)]
    [InlineData("[::1]:45000", 0, true)]
    [InlineData("192.168.1.20", 9876, true)]
    public void EndpointParsing_RejectsMissingOrInvalidDirectPort(string input, int defaultPort, bool valid)
        => Assert.Equal(valid, IPCastService.TryParseEndpoint(input, defaultPort, out _));

    [Fact]
    public async Task RelayListener_AcceptsOneSidedConnection_ThenRunsTlsAndPermissionHandshake()
    {
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(15));
        await using var relay = new RelayServer();
        relay.Start();
        var endpoint = new IPEndPoint(IPAddress.Loopback, relay.Port);
        var hostId = DeviceId.FromValidatedRaw("123456789");
        var viewerId = DeviceId.FromValidatedRaw("987654321");
        using var certificate = TestCertificateFactory.CreateSelfSigned();
        await using var service = new IPCastService(hostId, certificate, FreeUdpPort());
        var accepted = new TaskCompletionSource<RemoteSession>(TaskCreationOptions.RunContinuationsAsynchronously);
        service.OnConnectionRequested = _ => Task.FromResult(new ConnectionDecision(true, ConnectionPermissions.Clipboard));
        service.SessionEstablished += session => accepted.TrySetResult(session);
        service.RelayServerEndpoint = endpoint;
        service.Start();

        // Start() registers the idle receiving device; only the viewer needs to press Connect.
        using var relayStream = await RelayClient.ConnectViaRelayAsync(endpoint, viewerId.Raw, hostId.Raw, timeout.Token);
        var result = await new IPCastConnector(viewerId).ConnectAsync(relayStream, hostId, ConnectionPermissions.Clipboard, ct: timeout.Token);
        Assert.True(result.Success, result.Error);
        using var viewer = result.Session!;
        using var host = await accepted.Task.WaitAsync(timeout.Token);
        await MessageStream.WriteAsync(viewer.Stream, MessageType.ClipboardText, new ClipboardTextMessage("relay works"), timeout.Token);
        var (_, message) = await MessageStream.ReadAsync(host.Stream, timeout.Token);
        Assert.Equal("relay works", message.Deserialize<ClipboardTextMessage>()!.Text);
    }

    [Fact]
    public async Task DirectConnection_ReportsActualRemoteIdentity()
    {
        using var certificate = TestCertificateFactory.CreateSelfSigned();
        var hostId = DeviceId.FromValidatedRaw("123456789");
        await using var host = new IPCastHost(certificate) { LocalDeviceId = hostId };
        host.OnConnectionRequested = _ => Task.FromResult(new ConnectionDecision(true, ConnectionPermissions.Clipboard));
        var accepted = new TaskCompletionSource<RemoteSession>();
        host.SessionEstablished += session => accepted.TrySetResult(session);
        host.Start();
        var viewerId = DeviceId.FromValidatedRaw("987654321");
        var result = await new IPCastConnector(viewerId).ConnectAsync(new IPEndPoint(IPAddress.Loopback, host.Port), viewerId, ConnectionPermissions.Clipboard);
        Assert.True(result.Success, result.Error);
        using var viewer = result.Session!;
        using var receiver = await accepted.Task.WaitAsync(TimeSpan.FromSeconds(5));
        Assert.Equal(hostId, viewer.RemoteDeviceId);
    }

    private static int FreeUdpPort()
    {
        using var socket = new UdpClient(new IPEndPoint(IPAddress.Loopback, 0));
        return ((IPEndPoint)socket.Client.LocalEndPoint!).Port;
    }

    private sealed class YieldingStream : MemoryStream
    {
        public override async ValueTask WriteAsync(ReadOnlyMemory<byte> buffer, CancellationToken ct = default)
        {
            await Task.Yield();
            await base.WriteAsync(buffer, ct);
            await Task.Yield();
        }
    }
}
