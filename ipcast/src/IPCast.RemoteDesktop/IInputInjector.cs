namespace IPCast.RemoteDesktop;

/// <summary>
/// Injects mouse/keyboard input into the local machine. The only real implementation
/// (<see cref="Input.SendInputInjector"/>) is Windows-only (user32 SendInput) - this interface
/// exists so the rest of the pipeline can be built and tested cross-platform against
/// <see cref="Input.RecordingInputInjector"/> instead.
/// </summary>
public interface IInputInjector
{
    /// <param name="normalizedX">0.0-1.0 across the screen width.</param>
    /// <param name="normalizedY">0.0-1.0 across the screen height.</param>
    void MoveMouse(double normalizedX, double normalizedY);

    /// <param name="button">0=left, 1=right, 2=middle.</param>
    void MouseButton(int button, bool isDown);

    void MouseWheel(int delta);

    void KeyEvent(int virtualKeyCode, bool isDown);
}
