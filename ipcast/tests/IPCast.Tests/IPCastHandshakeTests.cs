using System.Net;
using System.Net.Security;
using IPCast.Network;
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
}
