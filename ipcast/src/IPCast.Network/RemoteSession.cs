using System.Net.Sockets;
using IPCast.Shared;

namespace IPCast.Network;

/// <summary>An established, handshake-completed connection to a remote IPCast device.</summary>
public sealed class RemoteSession : IDisposable
{
    private readonly IDisposable? _ownerToDispose;

    public RemoteSession(
        DeviceId remoteDeviceId,
        TcpClient? client,
        Stream stream,
        ConnectionPermissions grantedPermissions,
        bool isInitiator,
        IDisposable? ownerToDispose = null)
    {
        RemoteDeviceId = remoteDeviceId;
        Client = client;
        Stream = stream;
        GrantedPermissions = grantedPermissions;
        IsInitiator = isInitiator;
        _ownerToDispose = ownerToDispose;
    }

    public DeviceId RemoteDeviceId { get; }
    public TcpClient? Client { get; }

    /// <summary>The TLS-encrypted stream (<see cref="System.Net.Security.SslStream"/>) to read/write session messages on.</summary>
    public Stream Stream { get; }
    public ConnectionPermissions GrantedPermissions { get; }

    /// <summary>True if this side placed the connection (pressed Connect); false if it accepted an incoming one.</summary>
    public bool IsInitiator { get; }

    public void Dispose()
    {
        Stream.Dispose();
        Client?.Dispose();
        _ownerToDispose?.Dispose();
    }
}
