using System.Runtime.InteropServices;

namespace IPCast.RemoteDesktop;

/// <summary>
/// Injects mouse/keyboard input into the local machine. The only real implementation
/// (<see cref="Input.SendInputInjector"/>) is Windows-only (user32 SendInput) - this interface
/// exists so the rest of the pipeline can be built and tested cross-platform against
/// <see cref="Input.RecordingInputInjector"/> instead.
/// 
/// Enhanced to support comprehensive input as per specification item 8:
/// - All mouse buttons and scroll
/// - Keyboard combinations and special keys
/// - Windows key handling
/// - Alt+Tab and Ctrl+Alt+Del support
/// - Keyboard layout management
/// - Clipboard synchronization
/// </summary>
public interface IInputInjector
{
    // Mouse input
    /// <param name="normalizedX">0.0-1.0 across the screen width.</param>
    /// <param name="normalizedY">0.0-1.0 across the screen height.</param>
    void MoveMouse(double normalizedX, double normalizedY);
    
    /// <param name="button">0=left, 1=right, 2=middle.</param>
    /// <param name="isDown">true for press, false for release</param>
    void MouseButton(int button, bool isDown);
    
    /// <param name="delta">Scroll delta (positive = up/away from user)</param>
    void MouseWheel(int delta);
    
    /// <summary>
    /// Performs a drag operation from start to end position.
    /// </summary>
    /// <param name="startX">Start X position (0.0-1.0)</param>
    /// <param name="startY">Start Y position (0.0-1.0)</param>
    /// <param name="endX">End X position (0.0-1.0)</param>
    /// <param name="endY">End Y position (0.0-1.0)</param>
    /// <param name="button">Mouse button to use for drag (0=left, 1=right, 2=middle)</param>
    void Drag(double startX, double startY, double endX, double endY, int button = 0);
    
    // Keyboard input
    /// <param name="virtualKeyCode">Windows virtual-key code</param>
    /// <param name="isDown">true for press, false for release</param>
    void KeyEvent(int virtualKeyCode, bool isDown);
    
    /// <summary>
    /// Sends a character taking into account the current keyboard layout.
    /// </summary>
    /// <param name="character">The character to send</param>
    void SendCharacter(char character);
    
    /// <summary>
    /// Sends a string taking into account the current keyboard layout.
    /// </summary>
    /// <param name="text">The text to send</param>
    void SendString(string text);
    
    // Special key combinations
    /// <summary>
    /// Sends the Alt+Tab key combination to switch applications.
    /// </summary>
    void SendAltTab();
    
    /// <summary>
    /// Sends the Ctrl+Alt+Del key combination (secure attention sequence).
    /// Note: This may be blocked by Windows security policies in some contexts.
    /// </summary>
    void SendCtrlAltDel();
    
    /// <summary>
    /// Sends the Windows key (opens Start menu).
    /// </summary>
    void SendWindowsKey();
    
    /// <summary>
    /// Sends the Windows key + L (lock workstation).
    /// </summary>
    void SendWindowsLock();
    
    // Advanced input features
    /// <summary>
    /// Sets the mouse cursor position and optionally clicks.
    /// </summary>
    /// <param name="normalizedX">X position (0.0-1.0)</param>
    /// <param name="normalizedY">Y position (0.0-1.0)</param>
    /// <param name="click">If true, performs a left click after moving</param>
    void SetCursorPosition(double normalizedX, double normalizedY, bool click = false);
    
    /// <summary>
    /// Performs a mouse click at the current position.
    /// </summary>
    /// <param name="button">Mouse button (0=left, 1=right, 2=middle)</param>
    /// <param name="clickCount">Number of clicks (1=single, 2=double, etc.)</param>
    void Click(int button = 0, int clickCount = 1);
    
    // Keyboard layout management
    /// <summary>
    /// Gets the current keyboard layout identifier.
    /// </summary>
    string GetKeyboardLayout();
    
    /// <summary>
    /// Sets the keyboard layout (if supported by the underlying implementation).
    /// </summary>
    /// <param name="layoutId">Keyboard layout identifier</param>
    /// <returns>true if successful, false if not supported</returns>
    bool SetKeyboardLayout(string layoutId);
    
    // Clipboard synchronization
    /// <summary>
    /// Sets the clipboard text content.
    /// </summary>
    /// <param name="text">The text to place on the clipboard</param>
    void SetClipboardText(string text);
    
    /// <summary>
    /// Gets the current clipboard text content.
    /// </summary>
    /// <returns>The current clipboard text, or empty string if unavailable</returns>
    string GetClipboardText();
    
    // File clipboard (if supported by the underlying architecture)
    /// <summary>
    /// Sets files on the clipboard for paste operations.
    /// </summary>
    /// <param name="filePaths">Array of file paths to place on the clipboard</param>
    /// <returns>true if successful, false if not supported</returns>
    bool SetClipboardFiles(string[] filePaths);
    
    /// <summary>
    /// Gets files from the clipboard.
    /// </>
    /// <returns>Array of file paths from the clipboard, or empty array if unavailable/not supported</returns>
    string[] GetClipboardFiles();
}