namespace IPCast.Network.Protocol;

public enum MessageType
{
    Hello,
    ConnectionRequest,
    ConnectionDecision,
    Ping,
    Pong,
    Bye,
    ClipboardText,
    FileOffer,
    FileOfferResponse,
    FileChunk,
    ScreenFrame,
    MouseMove,
    MouseButton,
    MouseWheel,
    KeyEvent,
}

/// <summary>Sent immediately after connecting so the remote side knows who's talking to it.</summary>
public sealed record HelloMessage(string DeviceId, string AppVersion);

/// <summary>Asks the remote device for permission to start a session (spec §4/§10). Password is set only for unattended-access (spec §9) attempts.</summary>
public sealed record ConnectionRequestMessage(string FromDeviceId, ConnectionPermissions RequestedPermissions, string? Password = null);

/// <summary>The remote user's answer to a ConnectionRequestMessage.</summary>
public sealed record ConnectionDecisionMessage(bool Accepted, ConnectionPermissions GrantedPermissions, string? Reason);

/// <summary>Round-trip latency probe (spec §14: "Ping: 24 ms").</summary>
public sealed record PingMessage(long Sequence, DateTimeOffset SentAtUtc);

public sealed record PongMessage(long Sequence);

/// <summary>Graceful session teardown notice.</summary>
public sealed record ByeMessage(string? Reason);

/// <summary>Pushes this device's clipboard text to the peer (spec §8: clipboard sync, text only for now).</summary>
public sealed record ClipboardTextMessage(string Text);

/// <summary>Announces a file transfer before sending any bytes (spec §7); the peer must accept it first.</summary>
public sealed record FileOfferMessage(string TransferId, string FileName, long FileSizeBytes);

/// <summary>The receiving side's answer to a <see cref="FileOfferMessage"/>.</summary>
public sealed record FileOfferResponseMessage(string TransferId, bool Accepted, string? Reason);

/// <summary>One chunk of file data. <see cref="Data"/> is JSON-encoded as base64 by System.Text.Json.</summary>
public sealed record FileChunkMessage(string TransferId, long Offset, byte[] Data, bool IsLast);

/// <summary>
/// One encoded screen frame from the shared device to the viewer (spec §5). Coordinates for input
/// messages below are normalized (0.0-1.0) against this frame's <see cref="Width"/>/<see cref="Height"/>,
/// so the two sides' actual screen resolutions never need to match.
/// </summary>
public sealed record ScreenFrameMessage(int Width, int Height, string Codec, byte[] Data);

/// <summary>Moves the remote mouse cursor to a normalized (0.0-1.0, 0.0-1.0) position (spec §6).</summary>
public sealed record MouseMoveMessage(double NormalizedX, double NormalizedY);

/// <summary>Presses or releases a mouse button (spec §4/§6). 0=left, 1=right, 2=middle.</summary>
public sealed record MouseButtonMessage(int Button, bool IsDown);

/// <summary>Scrolls the mouse wheel (spec §6). Positive = up/away from the user.</summary>
public sealed record MouseWheelMessage(int Delta);

/// <summary>Presses or releases a key, identified by its Windows virtual-key code (spec §6).</summary>
public sealed record KeyEventMessage(int VirtualKeyCode, bool IsDown);
