using System.Net;
using System.Net.Security;
using System.Net.Sockets;
using System.Security.Authentication;
using System.Text.Json;
using IPCast.Network.Protocol;
using IPCast.Shared;

namespace IPCast.Network;

/// <summary>Places outbound connections to other IPCast devices (spec §4: the "CONNECT" flow).</summary>
public sealed class IPCastConnector
{
    private const string AppVersion = "1.0.0-phase2";

    private readonly DeviceId _localDeviceId;

    public IPCastConnector(DeviceId localDeviceId)
    {
        _localDeviceId = localDeviceId;
    }

    public async Task<ConnectResult> ConnectAsync(
        IPEndPoint remoteEndpoint,
        DeviceId remoteDeviceId,
        ConnectionPermissions requestedPermissions,
        string? password = null,
        CancellationToken ct = default)
    {
        var client = new TcpClient();
        try
        {
            await client.ConnectAsync(remoteEndpoint.Address, remoteEndpoint.Port, ct).ConfigureAwait(false);
            return await ConnectAsync(
                client.GetStream(),
                remoteDeviceId,
                requestedPermissions,
                password,
                client: client,
                ct: ct).ConfigureAwait(false);
        }
        catch (Exception ex) when (ex is SocketException or IOException or InvalidDataException
            or OperationCanceledException or System.Security.Authentication.AuthenticationException)
        {
            client.Dispose();
            return ConnectResult.Failed($"Couldn't connect: {ex.Message}");
        }
    }

    public async Task<ConnectResult> ConnectAsync(
        Stream rawStream,
        DeviceId remoteDeviceId,
        ConnectionPermissions requestedPermissions,
        string? password = null,
        TcpClient? client = null,
        IDisposable? ownerToDispose = null,
        CancellationToken ct = default)
    {
        try
        {
            var sslStream = new SslStream(rawStream, leaveInnerStreamOpen: false, TlsPolicy.AcceptAnyCertificate);
            await sslStream.AuthenticateAsClientAsync(
                new SslClientAuthenticationOptions
                {
                    TargetHost = remoteDeviceId.Raw,
                    EnabledSslProtocols = SslProtocols.None,
                },
                ct).ConfigureAwait(false);
            Stream stream = sslStream;

            await MessageStream.WriteAsync(stream, MessageType.Hello, new HelloMessage(_localDeviceId.Raw, AppVersion), ct)
                .ConfigureAwait(false);
            await MessageStream.WriteAsync(
                stream,
                MessageType.ConnectionRequest,
                new ConnectionRequestMessage(_localDeviceId.Raw, requestedPermissions, password),
                ct).ConfigureAwait(false);

            var (type, payload) = await MessageStream.ReadAsync(stream, ct).ConfigureAwait(false);
            if (type != MessageType.ConnectionDecision)
            {
                client?.Dispose();
                ownerToDispose?.Dispose();
                rawStream.Dispose();
                return ConnectResult.Failed("The remote device sent an unexpected response.");
            }

            var decision = payload.Deserialize<ConnectionDecisionMessage>()!;
            if (!decision.Accepted)
            {
                client?.Dispose();
                ownerToDispose?.Dispose();
                rawStream.Dispose();
                return ConnectResult.Reject(decision.Reason ?? "The remote device declined the connection.");
            }

            var session = new RemoteSession(
                remoteDeviceId,
                client,
                stream,
                decision.GrantedPermissions,
                isInitiator: true,
                ownerToDispose: ownerToDispose);
            return ConnectResult.Succeeded(session);
        }
        catch (Exception ex) when (ex is SocketException or IOException or InvalidDataException
            or OperationCanceledException or System.Security.Authentication.AuthenticationException)
        {
            client?.Dispose();
            ownerToDispose?.Dispose();
            rawStream.Dispose();
            return ConnectResult.Failed($"Couldn't connect: {ex.Message}");
        }
    }
}
