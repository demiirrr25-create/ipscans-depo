using System.Net;
using System.Net.Sockets;
using IPCast.Network;
using IPCast.Shared;
using Xunit;

namespace IPCast.Tests;
public class TunnelSessionTests
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task ForwardAndReverseCarryBytesAndReleasePort(bool reverse)
    {
        var (a, b, host) = await SessionTestHelper.EstablishSessionAsync(
            DeviceId.FromValidatedRaw("111222333"), DeviceId.FromValidatedRaw("444555666"), ConnectionPermissions.TcpTunnel);
        await using var ownedHost = host;
        using var ownerA = a; using var ownerB = b;
        await using var loopA = new SessionMessageLoop(a); await using var loopB = new SessionMessageLoop(b);
        using var tunnelsA = new TunnelSession(loopA, a); using var tunnelsB = new TunnelSession(loopB, b);
        tunnelsB.Approve = _ => Task.FromResult(true);
        loopA.Start(); loopB.Start();
        using var destination = new TcpListener(IPAddress.Loopback, 0); destination.Start();
        var destinationPort = ((IPEndPoint)destination.LocalEndpoint).Port;
        using var reservation = new TcpListener(IPAddress.Loopback, 0); reservation.Start();
        var listenPort = ((IPEndPoint)reservation.LocalEndpoint).Port; reservation.Stop();
        await tunnelsA.CreateAsync(reverse, listenPort, "127.0.0.1", destinationPort);
        using var caller = new TcpClient(); await caller.ConnectAsync(IPAddress.Loopback, listenPort);
        using var callee = await destination.AcceptTcpClientAsync().WaitAsync(TimeSpan.FromSeconds(5));
        var bytes = new byte[100000]; Random.Shared.NextBytes(bytes);
        await caller.GetStream().WriteAsync(bytes);
        var received = new byte[bytes.Length];
        await callee.GetStream().ReadExactlyAsync(received).AsTask().WaitAsync(TimeSpan.FromSeconds(10));
        Assert.Equal(bytes, received);
        await callee.GetStream().WriteAsync(new byte[] { 1, 2, 3 });
        var response = new byte[3];
        await caller.GetStream().ReadExactlyAsync(response).AsTask().WaitAsync(TimeSpan.FromSeconds(5));
        Assert.Equal(new byte[] { 1, 2, 3 }, response);
        await tunnelsA.StopAsync(Assert.Single(tunnelsA.Active).Id);
    }

    [Fact]
    public async Task MissingPermissionCannotCreateTunnel()
    {
        using var session = new RemoteSession(DeviceId.FromValidatedRaw("111222333"), null, new MemoryStream(), ConnectionPermissions.None, true);
        await using var loop = new SessionMessageLoop(session);
        using var tunnels = new TunnelSession(loop, session);
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => tunnels.CreateAsync(false, 12345, "localhost", 80));
    }
}
