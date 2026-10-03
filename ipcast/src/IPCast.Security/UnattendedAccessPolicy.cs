using IPCast.Network;

namespace IPCast.Security;

/// <summary>
/// Adapts the persisted <see cref="UnattendedAccessStore"/> to the <see cref="IUnattendedAccessPolicy"/>
/// interface the network layer expects, granting full standard remote-control permissions on a
/// correct password (enabling unattended access is itself the user's advance consent to that).
/// </summary>
public sealed class UnattendedAccessPolicy : IUnattendedAccessPolicy
{
    private const ConnectionPermissions GrantedOnSuccess =
        ConnectionPermissions.ViewScreen | ConnectionPermissions.ControlMouse |
        ConnectionPermissions.ControlKeyboard | ConnectionPermissions.Clipboard | ConnectionPermissions.FileTransfer;

    private readonly UnattendedAccessStore _store;

    public UnattendedAccessPolicy(UnattendedAccessStore store)
    {
        _store = store;
    }

    public ConnectionPermissions? TryAuthenticate(string password) =>
        TryAuthenticate(password, null);
    public ConnectionPermissions? TryAuthenticate(string password, string? oneTimeCode) =>
        _store.VerifyCredentials(password, oneTimeCode) ? GrantedOnSuccess : null;
}
