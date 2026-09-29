using System.Net;
using IPCast.Network;
using IPCast.Shared;

namespace IPCast.Tests;

/// <summary>Shared helper for tests that need a real, established (TLS-handshaked) session pair over loopback.</summary>
internal static class SessionTestHelper
{
    public static async Task<(RemoteSession Initiator, RemoteSession Acceptor, IPCastHost Host)> EstablishSessionAsync(
        DeviceId hostId, DeviceId clientId, ConnectionPermissions granted)
    {
        var host = new IPCastHost(TestCertificateFactory.CreateSelfSigned(), port: 0);
        var sessionEstablished = new TaskCompletionSource<RemoteSession>();
        host.SessionEstablished += session => sessionEstablished.TrySetResult(session);
        host.OnConnectionRequested = _ => Task.FromResult(new ConnectionDecision(true, granted));
        host.Start();

        var connector = new IPCastConnector(clientId);
        var result = await connector.ConnectAsync(new IPEndPoint(IPAddress.Loopback, host.Port), hostId, granted);
        if (!result.Success)
        {
            throw new InvalidOperationException($"Test setup failed to connect: {result.Error}");
        }

        var acceptorSession = await sessionEstablished.Task.WaitAsync(TimeSpan.FromSeconds(5));
        return (result.Session!, acceptorSession, host);
    }
}
