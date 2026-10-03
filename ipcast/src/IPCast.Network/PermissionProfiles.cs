namespace IPCast.Network;

public static class PermissionProfiles
{
    public static IReadOnlyList<string> Names { get; } = ["Full access", "Screen sharing", "File transfer", "Support"];
    public static ConnectionPermissions ForName(string? name) => name switch
    {
        "Screen sharing" => ConnectionPermissions.ViewScreen | ConnectionPermissions.Chat,
        "File transfer" => ConnectionPermissions.FileTransfer | ConnectionPermissions.Chat,
        "Support" => ConnectionPermissions.ViewScreen | ConnectionPermissions.ControlMouse |
            ConnectionPermissions.ControlKeyboard | ConnectionPermissions.Clipboard | ConnectionPermissions.Chat,
        _ => ConnectionPermissions.ViewScreen | ConnectionPermissions.ControlMouse | ConnectionPermissions.ControlKeyboard |
            ConnectionPermissions.Clipboard | ConnectionPermissions.FileTransfer | ConnectionPermissions.Chat | ConnectionPermissions.Recording |
            ConnectionPermissions.SystemInformation | ConnectionPermissions.RemoteRestart | ConnectionPermissions.TcpTunnel
    };
}
