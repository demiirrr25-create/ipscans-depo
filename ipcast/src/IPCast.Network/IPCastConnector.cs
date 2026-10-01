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
            return await RunHandshakeAsync(client, remoteDeviceId, requestedPermissions, password, ct).ConfigureAwait(false);
        }
        catch (Exception ex) when (IsExpectedConnectFailure(ex))
        {
            client.Dispose();
            return ConnectResult.Failed($"Couldn't connect: {ex.Message}");
        }
    }

    /// <summary>
    /// Same as <see cref="ConnectAsync"/> but reaches the peer through a relay server (spec
    /// §12-13) instead of a direct LAN connection - a fallback for when LAN discovery can't find
    /// the target because it's on a different network. Everything after the raw byte pipe is
    /// identical: TLS, then the same Hello/ConnectionRequest/ConnectionDecision handshake.
    /// </summary>
    public async Task<ConnectResult> ConnectViaRelayAsync(
        IPEndPoint relayEndpoint,
        DeviceId remoteDeviceId,
        ConnectionPermissions requestedPermissions,
        string? password = null,
        CancellationToken ct = default)
    {
        TcpClient client;
        try
        {
            (client, _) = await RelayClient
                .ConnectViaRelayAsync(relayEndpoint, _localDeviceId.Raw, remoteDeviceId.Raw, ct)
                .ConfigureAwait(false);
        }
        catch (Exception ex) when (IsExpectedConnectFailure(ex))
        {
            return ConnectResult.Failed($"Couldn't reach the relay server: {ex.Message}");
        }

        try
        {
            return await RunHandshakeAsync(client, remoteDeviceId, requestedPermissions, password, ct).ConfigureAwait(false);
        }
        catch (Exception ex) when (IsExpectedConnectFailure(ex))
        {
            client.Dispose();
            return ConnectResult.Failed($"Couldn't connect: {ex.Message}");
        }
    }

    private async Task<ConnectResult> RunHandshakeAsync(
        TcpClient client,
        DeviceId remoteDeviceId,
        ConnectionPermissions requestedPermissions,
        string? password,
        CancellationToken ct)
    {
        var sslStream = new SslStream(client.GetStream(), leaveInnerStreamOpen: false, TlsPolicy.AcceptAnyCertificate);
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
            client.Dispose();
            return ConnectResult.Failed("The remote device sent an unexpected response.");
        }

        var decision = payload.Deserialize<ConnectionDecisionMessage>()!;
        if (!decision.Accepted)
        {
            client.Dispose();
            return ConnectResult.Reject(decision.Reason ?? "The remote device declined the connection.");
        }

        var session = new RemoteSession(remoteDeviceId, client, stream, decision.GrantedPermissions, isInitiator: true);
        return ConnectResult.Succeeded(session);
    }

    private static bool IsExpectedConnectFailure(Exception ex) =>
        ex is SocketException or IOException or InvalidDataException or OperationCanceledException or AuthenticationException;
}
