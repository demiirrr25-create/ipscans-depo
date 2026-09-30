using System.Net;
using System.Net.Sockets;
using System.Net.WebSockets;
using System.Security.Cryptography;
using System.Text.Json;
using IPCast.FileTransfer;
using IPCast.Network;
using IPCast.Network.Protocol;
using IPCast.Server;
using IPCast.Shared;

namespace IPCast.Tests;

public class WebSocketRelayTests
{
    [Theory]
    [InlineData("wss://relay.example/relay", true)]
    [InlineData("ws://127.0.0.1:8080/relay", true)]
    [InlineData("ws://relay.example/relay", false)]
    [InlineData("https://relay.example/relay", false)]
    [InlineData("wss://user:password@relay.example/relay", false)]
    [InlineData("wss://relay.example/relay?token=secret", false)]
    [InlineData("192.168.1.10:9876", true)]
    public void RelayAddress_ValidatesTransport(string input, bool valid)
        => Assert.Equal(valid, RelayAddress.TryParse(input, out _));

    [Fact]
    public async Task WebSocketRelay_TlsClipboardLargeFrameFileAndReconnect()
    {
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(40));
        var ct = timeout.Token;
        await using var app = RelayWebHost.Create([], 0);
        await app.StartAsync(ct);
        var httpUrl = app.Urls.Single().Replace("[::]", "127.0.0.1").Replace("0.0.0.0", "127.0.0.1");
        using var http = new HttpClient();
        Assert.Contains("ipcast-websocket-v1", await http.GetStringAsync(httpUrl + "/healthz", ct));
        Assert.Equal(HttpStatusCode.BadRequest, (await http.GetAsync(httpUrl + "/relay", ct)).StatusCode);
        Assert.True(RelayAddress.TryParse(httpUrl.Replace("http:", "ws:") + "/relay", out var address));
        var hostId = DeviceId.FromValidatedRaw("123456789");
        var viewerId = DeviceId.FromValidatedRaw("987654321");
        using var certificate = TestCertificateFactory.CreateSelfSigned();
        using var udp = new UdpClient(new IPEndPoint(IPAddress.Loopback, 0));
        var discoveryPort = ((IPEndPoint)udp.Client.LocalEndPoint!).Port;
        udp.Close();
        await using var service = new IPCastService(hostId, certificate, discoveryPort);
        var permissions = ConnectionPermissions.Clipboard | ConnectionPermissions.FileTransfer;
        service.OnConnectionRequested = _ => Task.FromResult(new ConnectionDecision(true, permissions));
        var incoming = System.Threading.Channels.Channel.CreateUnbounded<RemoteSession>();
        service.SessionEstablished += session => incoming.Writer.TryWrite(session);
        service.RelayServerAddress = address;
        service.Start();
        var connector = new IPCastConnector(viewerId) {
            VerifyPeerCertificateAsync = (_, fingerprint) => Task.FromResult(fingerprint == certificate.GetCertHashString(HashAlgorithmName.SHA256))
        };
        var directory = Path.Combine(Path.GetTempPath(), "IPCastWebSocket_" + Guid.NewGuid());
        Directory.CreateDirectory(directory);
        try
        {
            for (var attempt = 0; attempt < 2; attempt++)
            {
                using var raw = await RelayClient.ConnectViaRelayAsync(address!, viewerId.Raw, hostId.Raw, ct);
                var result = await connector.ConnectAsync(raw, hostId, permissions, ct: ct);
                Assert.True(result.Success, result.Error);
                using var viewer = result.Session!;
                using var host = await incoming.Reader.ReadAsync(ct);
                var data = RandomNumberGenerator.GetBytes(2 * 1024 * 1024);
                var frameSend = MessageStream.WriteAsync(host.Stream, MessageType.ScreenFrame, new ScreenFrameMessage(1920, 1080, "test", data), ct);
                var (frameType, frame) = await MessageStream.ReadAsync(viewer.Stream, ct);
                await frameSend;
                Assert.Equal(MessageType.ScreenFrame, frameType);
                Assert.Equal(data, frame.Deserialize<ScreenFrameMessage>()!.Data);
                await using var senderLoop = new SessionMessageLoop(viewer);
                await using var receiverLoop = new SessionMessageLoop(host);
                var clipboard = new TaskCompletionSource<string>(TaskCreationOptions.RunContinuationsAsynchronously);
                receiverLoop.ClipboardTextReceived += value => clipboard.TrySetResult(value);
                var target = Path.Combine(directory, "received.bin");
                using var receiver = new FileReceiver(receiverLoop, host) { OnFileOffered = _ => Task.FromResult(FileOfferDecision.AcceptTo(target)) };
                senderLoop.Start(); receiverLoop.Start();
                await senderLoop.SendClipboardTextAsync("Türkçe pano", ct);
                Assert.Equal("Türkçe pano", await clipboard.Task.WaitAsync(ct));
                var source = Path.Combine(directory, "source.bin");
                await File.WriteAllBytesAsync(source, data, ct);
                var sent = await new FileSender().SendFileAsync(senderLoop, viewer, source, ct: ct);
                Assert.True(sent.Success, sent.Error);
                Assert.Equal(SHA256.HashData(data), SHA256.HashData(await File.ReadAllBytesAsync(target, ct)));
            }
        }
        finally { Directory.Delete(directory, true); await app.StopAsync(CancellationToken.None); }
    }

    [Fact]
    public async Task WebSocketRelay_RejectsBrowserOrigin()
    {
        await using var app = RelayWebHost.Create([], 0);
        await app.StartAsync();
        try
        {
            var url = app.Urls.Single().Replace("[::]", "127.0.0.1").Replace("0.0.0.0", "127.0.0.1").Replace("http:", "ws:");
            using var socket = new ClientWebSocket();
            socket.Options.SetRequestHeader("Origin", "https://untrusted.example");
            using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(5));
            await Assert.ThrowsAsync<WebSocketException>(() => socket.ConnectAsync(new Uri(url + "/relay"), timeout.Token));
        }
        finally { await app.StopAsync(); }
    }
}
