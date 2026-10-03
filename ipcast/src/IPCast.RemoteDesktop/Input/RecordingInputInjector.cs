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
    public List<string> SpecialActions { get; } = [];
    public string ClipboardText { get; private set; } = string.Empty;
    public string[] ClipboardFiles { get; private set; } = [];
    public string KeyboardLayout { get; private set; } = string.Empty;

    public void MoveMouse(double normalizedX, double normalizedY) => MouseMoves.Add(new RecordedMouseMove(normalizedX, normalizedY));

    public void MouseButton(int button, bool isDown) => MouseButtons.Add(new RecordedMouseButton(button, isDown));

    public void MouseWheel(int delta) => MouseWheelDeltas.Add(delta);

    public void KeyEvent(int virtualKeyCode, bool isDown) => KeyEvents.Add(new RecordedKeyEvent(virtualKeyCode, isDown));

    public void Drag(double startX, double startY, double endX, double endY, int button = 0)
    {
        MoveMouse(startX, startY);
        MouseButton(button, true);
        MoveMouse(endX, endY);
        MouseButton(button, false);
    }

    public void SendCharacter(char character) => SpecialActions.Add($"Character:{character}");
    public void SendString(string text) { foreach (var character in text) SendCharacter(character); }
    public void SendAltTab() => SpecialActions.Add("AltTab");
    public void SendCtrlAltDel() => SpecialActions.Add("CtrlAltDel");
    public void SendWindowsKey() => SpecialActions.Add("WindowsKey");
    public void SendWindowsLock() => SpecialActions.Add("WindowsLock");
    public void SetCursorPosition(double normalizedX, double normalizedY, bool click = false)
    {
        MoveMouse(normalizedX, normalizedY);
        if (click) Click();
    }

    public void Click(int button = 0, int clickCount = 1)
    {
        for (var i = 0; i < clickCount; i++)
        {
            MouseButton(button, true);
            MouseButton(button, false);
        }
    }

    public string GetKeyboardLayout() => KeyboardLayout;
    public bool SetKeyboardLayout(string layoutId) { KeyboardLayout = layoutId; return true; }
    public void SetClipboardText(string text) => ClipboardText = text;
    public string GetClipboardText() => ClipboardText;
    public bool SetClipboardFiles(string[] filePaths) { ClipboardFiles = [.. filePaths]; return true; }
    public string[] GetClipboardFiles() => [.. ClipboardFiles];
}
