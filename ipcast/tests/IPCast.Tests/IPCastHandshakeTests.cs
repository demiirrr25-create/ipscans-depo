using System.Net;
using System.Net.Security;
using System.Net.Sockets;
using IPCast.Network;
using IPCast.Network.Protocol;
using IPCast.Shared;
using Xunit;

namespace IPCast.Tests;

public class IPCastHandshakeTests : IAsyncDisposable
{
    private readonly DeviceId _hostId = DeviceId.FromValidatedRaw("111222333");
    private readonly DeviceId _clientId = DeviceId.FromValidatedRaw("444555666");
    private IPCastHost? _host;

    public async ValueTask DisposeAsync()
    {
        if (_host is not null)
        {
            await _host.DisposeAsync();
        }
    }

    [Fact]
    public async Task ConnectAsync_SucceedsWhenHostAccepts()
    {
        _host = new IPCastHost(TestCertificateFactory.CreateSelfSigned(), port: 0);
        var accepted = new TaskCompletionSource<RemoteSession>(TaskCreationOptions.RunContinuationsAsynchronously);
        _host.SessionEstablished += session => accepted.TrySetResult(session);
        _host.OnConnectionRequested = _ => Task.FromResult(
            new ConnectionDecision(true, ConnectionPermissions.ViewScreen | ConnectionPermissions.ControlMouse));
        _host.Start();

        var connector = new IPCastConnector(_clientId);
        var result = await connector.ConnectAsync(
            new IPEndPoint(IPAddress.Loopback, _host.Port),
            _hostId,
            ConnectionPermissions.ViewScreen | ConnectionPermissions.ControlMouse | ConnectionPermissions.FileTransfer);

        Assert.True(result.Success, result.Error);
        using var hostSession = await accepted.Task.WaitAsync(TimeSpan.FromSeconds(5));
        Assert.NotNull(result.Session);
        Assert.Equal(ConnectionPermissions.ViewScreen | ConnectionPermissions.ControlMouse, result.Session!.GrantedPermissions);
        var sslStream = Assert.IsType<SslStream>(result.Session.Stream);
        Assert.True(sslStream.IsEncrypted);
        result.Session.Dispose();
    }

    [Fact]
    public async Task ConnectAsync_ReportsRejectionWithReason()
    {
        _host = new IPCastHost(TestCertificateFactory.CreateSelfSigned(), port: 0);
        _host.OnConnectionRequested = _ => Task.FromResult(ConnectionDecision.Reject("Not right now."));
        _host.Start();

        var connector = new IPCastConnector(_clientId);
        var result = await connector.ConnectAsync(
            new IPEndPoint(IPAddress.Loopback, _host.Port), _hostId, ConnectionPermissions.ViewScreen);

        Assert.False(result.Success);
        Assert.True(result.Rejected);
        Assert.Equal("Not right now.", result.Error);
    }

    [Fact]
    public async Task ConnectAsync_AutoRejectsWhenNoHandlerRegistered()
    {
        _host = new IPCastHost(TestCertificateFactory.CreateSelfSigned(), port: 0);
        _host.Start();

        var connector = new IPCastConnector(_clientId);
        var result = await connector.ConnectAsync(
            new IPEndPoint(IPAddress.Loopback, _host.Port), _hostId, ConnectionPermissions.ViewScreen);

        Assert.False(result.Success);
        Assert.True(result.Rejected);
    }

    [Fact]
    public async Task SessionEstablished_FiresOnHostSideWithRemoteId()
    {
        _host = new IPCastHost(TestCertificateFactory.CreateSelfSigned(), port: 0);
        _host.OnConnectionRequested = _ => Task.FromResult(new ConnectionDecision(true, ConnectionPermissions.ViewScreen));

        RemoteSession? hostSideSession = null;
        var sessionEstablished = new TaskCompletionSource();
        _host.SessionEstablished += session =>
        {
            hostSideSession = session;
            sessionEstablished.TrySetResult();
        };
        _host.Start();

        var connector = new IPCastConnector(_clientId);
        var result = await connector.ConnectAsync(
            new IPEndPoint(IPAddress.Loopback, _host.Port), _hostId, ConnectionPermissions.ViewScreen);
        Assert.True(result.Success);

        await sessionEstablished.Task.WaitAsync(TimeSpan.FromSeconds(5));

        Assert.NotNull(hostSideSession);
        Assert.Equal(_clientId, hostSideSession!.RemoteDeviceId);
        Assert.False(hostSideSession.IsInitiator);

        result.Session!.Dispose();
        hostSideSession.Dispose();
    }

    [Fact]
    public async Task ConnectAsync_CannotGrantPermissionsTheClientDidNotRequest()
    {
        _host = new IPCastHost(TestCertificateFactory.CreateSelfSigned(), port: 0);
        var accepted = new TaskCompletionSource<RemoteSession>(TaskCreationOptions.RunContinuationsAsynchronously);
        _host.SessionEstablished += session => accepted.TrySetResult(session);
        _host.OnConnectionRequested = _ => Task.FromResult(new ConnectionDecision(true,
            ConnectionPermissions.ViewScreen | ConnectionPermissions.ControlMouse | ConnectionPermissions.FileTransfer));
        _host.Start();

        var result = await new IPCastConnector(_clientId).ConnectAsync(
            new IPEndPoint(IPAddress.Loopback, _host.Port), _hostId, ConnectionPermissions.ViewScreen);

        Assert.True(result.Success, result.Error);
        using var hostSession = await accepted.Task.WaitAsync(TimeSpan.FromSeconds(5));
        Assert.Equal(ConnectionPermissions.ViewScreen, hostSession.GrantedPermissions);
        Assert.Equal(ConnectionPermissions.ViewScreen, result.Session!.GrantedPermissions);
        result.Session.Dispose();
    }

    [Fact]
    public async Task Handshake_RejectsConflictingClaimedDeviceIdsBeforePrompt()
    {
        _host = new IPCastHost(TestCertificateFactory.CreateSelfSigned(), port: 0);
        var prompted = false;
        _host.OnConnectionRequested = _ =>
        {
            prompted = true;
            return Task.FromResult(new ConnectionDecision(true, ConnectionPermissions.ViewScreen));
        };
        _host.Start();

        using var client = new TcpClient();
        await client.ConnectAsync(IPAddress.Loopback, _host.Port);
        using var stream = new SslStream(client.GetStream(), false, (_, _, _, _) => true);
        await stream.AuthenticateAsClientAsync(_hostId.Raw);
        await MessageStream.WriteAsync(stream, MessageType.Hello, new HelloMessage(_clientId.Raw, "test"));
        await MessageStream.WriteAsync(stream, MessageType.ConnectionRequest,
            new ConnectionRequestMessage("123123123", ConnectionPermissions.ViewScreen));

        await Assert.ThrowsAnyAsync<IOException>(async () =>
        {
            await MessageStream.ReadAsync(stream).WaitAsync(TimeSpan.FromSeconds(5));
        });
        Assert.False(prompted);
    }

    [Theory]
    [InlineData(ConnectionPermissions.ViewScreen | ConnectionPermissions.Clipboard, "111222333")]
    [InlineData(ConnectionPermissions.ViewScreen, "999888777")]
    public async Task ConnectorRejectsUntrustedDecision(ConnectionPermissions permissions, string claimedId)
    {
        using var listener = new TcpListener(IPAddress.Loopback, 0);
        listener.Start();
        using var certificate = TestCertificateFactory.CreateSelfSigned();
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(5));
        var server = Task.Run(async () =>
        {
            using var client = await listener.AcceptTcpClientAsync(timeout.Token);
            using var tls = new SslStream(client.GetStream(), false);
            await tls.AuthenticateAsServerAsync(new SslServerAuthenticationOptions { ServerCertificate = certificate }, timeout.Token);
            await MessageStream.ReadAsync(tls, timeout.Token);
            await MessageStream.ReadAsync(tls, timeout.Token);
            await MessageStream.WriteAsync(tls, MessageType.ConnectionDecision,
                new ConnectionDecisionMessage(true, permissions, null, claimedId), timeout.Token);
        });
        var result = await new IPCastConnector(_clientId).ConnectAsync(
            (IPEndPoint)listener.LocalEndpoint, _hostId, ConnectionPermissions.ViewScreen, ct: timeout.Token);
        await server;
        Assert.False(result.Success);
        Assert.True(result.Rejected);
        Assert.Null(result.Session);
    }
}
