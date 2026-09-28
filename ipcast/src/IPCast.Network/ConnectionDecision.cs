using IPCast.Shared;

namespace IPCast.Network;

/// <summary>An inbound request awaiting the local user's accept/reject decision (spec §21).</summary>
public sealed record IncomingConnectionRequest(DeviceId RemoteDeviceId, ConnectionPermissions RequestedPermissions);

/// <summary>The local user's answer to an <see cref="IncomingConnectionRequest"/>.</summary>
public sealed record ConnectionDecision(bool Accepted, ConnectionPermissions GrantedPermissions, string? Reason = null)
{
    public static ConnectionDecision Reject(string reason) => new(false, ConnectionPermissions.None, reason);
}

/// <summary>Called for every inbound connection request; returns the user's decision.</summary>
public delegate Task<ConnectionDecision> ConnectionRequestHandler(IncomingConnectionRequest request);
