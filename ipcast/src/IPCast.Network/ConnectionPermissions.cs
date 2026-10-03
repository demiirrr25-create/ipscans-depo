namespace IPCast.Network;

/// <summary>
/// The set of capabilities a remote party can request/be granted for a session (spec §10:
/// the user must be able to choose exactly which of these to allow before a connection proceeds).
/// </summary>
[Flags]
public enum ConnectionPermissions
{
    None = 0,
    ViewScreen = 1 << 0,
    ControlMouse = 1 << 1,
    ControlKeyboard = 1 << 2,
    Clipboard = 1 << 3,
    FileTransfer = 1 << 4,
    SystemInformation = 1 << 5,
    RemoteRestart = 1 << 6,
    Chat = 1 << 7,
    Recording = 1 << 8,
    TcpTunnel = 1 << 9,
}
