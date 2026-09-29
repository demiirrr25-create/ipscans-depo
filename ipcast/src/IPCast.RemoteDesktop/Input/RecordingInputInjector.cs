namespace IPCast.RemoteDesktop.Input;

public sealed record RecordedMouseMove(double NormalizedX, double NormalizedY);

public sealed record RecordedMouseButton(int Button, bool IsDown);

public sealed record RecordedKeyEvent(int VirtualKeyCode, bool IsDown);

/// <summary>Records every call instead of touching real input - lets tests verify the dispatch/permission pipeline without Windows.</summary>
public sealed class RecordingInputInjector : IInputInjector
{
    public List<RecordedMouseMove> MouseMoves { get; } = [];

    public List<RecordedMouseButton> MouseButtons { get; } = [];

    public List<int> MouseWheelDeltas { get; } = [];

    public List<RecordedKeyEvent> KeyEvents { get; } = [];

    public void MoveMouse(double normalizedX, double normalizedY) => MouseMoves.Add(new RecordedMouseMove(normalizedX, normalizedY));

    public void MouseButton(int button, bool isDown) => MouseButtons.Add(new RecordedMouseButton(button, isDown));

    public void MouseWheel(int delta) => MouseWheelDeltas.Add(delta);

    public void KeyEvent(int virtualKeyCode, bool isDown) => KeyEvents.Add(new RecordedKeyEvent(virtualKeyCode, isDown));
}
