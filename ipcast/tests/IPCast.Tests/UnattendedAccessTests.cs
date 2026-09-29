using System.Net;
using IPCast.Network;
using IPCast.Security;
using IPCast.Shared;
using Xunit;

namespace IPCast.Tests;

public class UnattendedAccessTests : IAsyncDisposable
{
    private readonly DeviceId _hostId = DeviceId.FromValidatedRaw("444555666");
    private readonly DeviceId _clientId = DeviceId.FromValidatedRaw("777888999");
    private readonly string _tempDirectory = Path.Combine(Path.GetTempPath(), "IPCastUnattendedTests_" + Guid.NewGuid());
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

    private IPCastHost CreateHostWithPolicy(UnattendedAccessStore store, bool alsoAttachInteractiveHandler = false)
    {
        var host = new IPCastHost(TestCertificateFactory.CreateSelfSigned(), port: 0)
        {
            UnattendedAccessPolicy = new UnattendedAccessPolicy(store),
        };

        if (alsoAttachInteractiveHandler)
        {
            // Should never actually be invoked for a password-authenticated attempt - that's the point of unattended access.
            host.OnConnectionRequested = _ => throw new InvalidOperationException("Interactive handler should not run for unattended access.");
        }

        host.Start();
        _host = host;
        return host;
    }

    [Fact]
    public async Task ConnectAsync_SucceedsWithCorrectPassword_WithoutInteractivePrompt()
    {
        var store = new UnattendedAccessStore(_tempDirectory);
        store.Enable("correct horse battery staple");
        var host = CreateHostWithPolicy(store, alsoAttachInteractiveHandler: true);

        var connector = new IPCastConnector(_clientId);
        var result = await connector.ConnectAsync(
            new IPEndPoint(IPAddress.Loopback, host.Port), _hostId, ConnectionPermissions.None,
            password: "correct horse battery staple");

        Assert.True(result.Success);
        Assert.True(result.Session!.GrantedPermissions.HasFlag(ConnectionPermissions.ViewScreen));
        result.Session.Dispose();
    }

    [Fact]
    public async Task ConnectAsync_FailsWithWrongPassword()
    {
        var store = new UnattendedAccessStore(_tempDirectory);
        store.Enable("correct horse battery staple");
        var host = CreateHostWithPolicy(store);

        var connector = new IPCastConnector(_clientId);
        var result = await connector.ConnectAsync(
            new IPEndPoint(IPAddress.Loopback, host.Port), _hostId, ConnectionPermissions.None, password: "wrong password");

        Assert.False(result.Success);
        Assert.Equal("Incorrect password.", result.Error);
    }

    [Fact]
    public async Task ConnectAsync_FailsWhenUnattendedAccessDisabled()
    {
        var store = new UnattendedAccessStore(_tempDirectory);
        store.Enable("correct horse battery staple");
        store.Disable();
        var host = CreateHostWithPolicy(store);

        var connector = new IPCastConnector(_clientId);
        var result = await connector.ConnectAsync(
            new IPEndPoint(IPAddress.Loopback, host.Port), _hostId, ConnectionPermissions.None,
            password: "correct horse battery staple");

        Assert.False(result.Success);
    }

    [Fact]
    public async Task ConnectAsync_IsRateLimitedAfterRepeatedFailures()
    {
        var store = new UnattendedAccessStore(_tempDirectory);
        store.Enable("correct horse battery staple");
        var host = CreateHostWithPolicy(store);
        var endpoint = new IPEndPoint(IPAddress.Loopback, host.Port);

        for (var i = 0; i < 5; i++)
        {
            var attempt = await new IPCastConnector(_clientId).ConnectAsync(
                endpoint, _hostId, ConnectionPermissions.None, password: "wrong");
            Assert.Equal("Incorrect password.", attempt.Error);
        }

        var finalAttempt = await new IPCastConnector(_clientId).ConnectAsync(
            endpoint, _hostId, ConnectionPermissions.None, password: "correct horse battery staple");

        Assert.False(finalAttempt.Success);
        Assert.Equal("Too many attempts. Try again later.", finalAttempt.Error);
    }
}
