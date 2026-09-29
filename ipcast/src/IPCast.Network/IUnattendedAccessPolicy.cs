namespace IPCast.Network;

/// <summary>
/// Authenticates unattended-access (spec §9) connection attempts. Implemented in IPCast.Security
/// (wrapping the persisted password hash) and passed into <see cref="IPCastHost"/> so the network
/// layer never needs to know how passwords are stored/hashed.
/// </summary>
public interface IUnattendedAccessPolicy
{
    /// <summary>Returns the permissions to grant if <paramref name="password"/> is correct and unattended access is enabled; otherwise null.</summary>
    ConnectionPermissions? TryAuthenticate(string password);
}
