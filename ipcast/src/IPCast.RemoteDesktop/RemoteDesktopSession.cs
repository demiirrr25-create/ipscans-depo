using System.Text.Json;
using System.Diagnostics;
using System.Collections.Concurrent;
using IPCast.Network;
using IPCast.Network.Protocol;

namespace IPCast.RemoteDesktop;

/// <summary>
/// Runs the screen-share/remote-control side of an established session (spec §5/§6). Whichever
/// side accepted the incoming connection (<c>RemoteSession.IsInitiator == false</c>) is the one
/// being viewed/controlled and calls <see cref="StartSharing"/>; the side that pressed Connect
/// (<c>IsInitiator == true</c>) is the viewer and receives frames via <see cref="FrameReceived"/>.
/// </summary>
public sealed class RemoteDesktopSession : IDisposable
{
    private readonly SessionMessageLoop _loop;
    private readonly RemoteSession _session;
    private IInputInjector? _sharingInjector;
    private IScreenCapturer? _sharingCapturer;
    private CancellationTokenSource? _captureCts;
    private Task? _captureLoop;
    private int _disposed;
    private readonly Lock _inputLock = new();
    private readonly HashSet<int> _heldKeys = [];
    private readonly HashSet<int> _heldButtons = [];
    public event Action? Closed;
    
    // Enhanced properties for multi-monitor and display modes
    private MonitorInfo _currentMonitor = MonitorInfo.Primary;
    private DisplayMode _displayMode = DisplayMode.AutoAdapt;
    private readonly Dictionary<string, MonitorInfo> _availableMonitors = new Dictionary<string, MonitorInfo>();
    private bool _isMultiMonitorAware = false;

    public RemoteDesktopSession(SessionMessageLoop loop, RemoteSession session)
    {
        _loop = loop;
        _session = session;
        _loop.MessageReceived += OnMessageReceived;
    }

    /// <summary>Raised on the viewer side with each decoded frame from the peer.</summary>
    public event Action<CapturedFrame>? FrameReceived;
    public event Action<Exception>? Faulted;
    
    /// <summary>Raised when monitor information is updated</summary>
    public event Action<MonitorInfo>? MonitorChanged;
    /// <summary>Raised when display mode is changed</summary>
    public event Action<DisplayMode>? DisplayModeChanged;

    /// <summary>
    /// Starts capturing and streaming this device's screen to the peer, and applies input events the peer sends back.
    /// </summary>
    /// <param name="capturer">The screen capturer to use</param>
    /// <param name="injector">The input injector to use</param>
    /// <param name="frameInterval">Target time between frames</param>
    /// <param name="jpegQuality">JPEG quality (0-100). Use negative values for adaptive quality.</param>
    /// <param name="maxDimension">Maximum dimension for scaling (0 = no scaling)</param>
    /// <param name="maxBytesPerSecond">Maximum bandwidth to use for video (0 = no limit)</param>
    /// <param name="monitorInfo">Specific monitor to capture (null = primary monitor)</param>
    /// <param name="displayMode">How to display the captured frame</param>
    public void StartSharing(IScreenCapturer capturer, IInputInjector injector, TimeSpan frameInterval, int jpegQuality = 70, int maxDimension = 0, int maxBytesPerSecond = 0, MonitorInfo? monitorInfo = null, DisplayMode displayMode = DisplayMode.AutoAdapt)
    {
        if (!_session.GrantedPermissions.HasFlag(ConnectionPermissions.ViewScreen))
        {
            throw new InvalidOperationException("This session wasn't granted ViewScreen.");
        }

        _sharingCapturer = capturer;
        _sharingInjector = injector;
        _currentMonitor = monitorInfo ?? MonitorInfo.Primary;
        _displayMode = displayMode;
        _captureCts = new CancellationTokenSource();
        var token = _captureCts.Token;
        _captureLoop = Task.Run(() => RunCaptureLoopAsync(capturer, frameInterval, jpegQuality, maxDimension, maxBytesPerSecond, token));
    }

    /// <summary>
    /// Gets the list of available monitors on the system.
    /// </summary>
    public IReadOnlyDictionary<string, MonitorInfo> AvailableMonitors => _availableMonitors.AsReadOnly();

    /// <summary>
    /// Updates the list of available monitors. Call this when monitor configuration changes.
    /// </summary>
    public void UpdateAvailableMonitors(IEnumerable<MonitorInfo> monitors)
    {
        lock (_inputLock)
        {
            _availableMonitors.Clear();
            foreach (var monitor in monitors)
            {
                _availableMonitors[monitor.DeviceName] = monitor;
            }
            
            _isMultiMonitorAware = _availableMonitors.Count > 1;
            
            // If current monitor is no longer available, fall back to primary
            if (!_availableMonitors.ContainsKey(_currentMonitor.DeviceName))
            {
                _currentMonitor = MonitorInfo.Primary;
            }
            
            MonitorChanged?.Invoke(_currentMonitor);
        }
    }

    /// <summary>
    /// Sets the current monitor to capture.
    /// </summary>
    public bool SetCurrentMonitor(string deviceName)
    {
        lock (_inputLock)
        {
            if (_availableMonitors.ContainsKey(deviceName))
            {
                _currentMonitor = _availableMonitors[deviceName];
                MonitorChanged?.Invoke(_currentMonitor);
                return true;
            }
            return false;
        }
    }

    /// <summary>
    /// Sets the display mode for how frames should be presented.
    /// </summary>
    public void SetDisplayMode(DisplayMode mode)
    {
        lock (_inputLock)
        {
            _displayMode = mode;
            DisplayModeChanged?.Invoke(_displayMode);
        }
    }

    /// <summary>Starts capturing and streaming this device's screen to the peer, and applies input events the peer sends back.</summary>
    private async Task RunCaptureLoopAsync(IScreenCapturer capturer, TimeSpan frameInterval, int jpegQuality, int maxDimension, int maxBytesPerSecond, CancellationToken ct)
    {
        try
        {
            CapturedFrame? previous = null;
            var lastSent = Stopwatch.StartNew();
            int consecutiveUnchangedFrames = 0;
            const int MaxUnchangedFramesBeforeFullRefresh = 100; // Send full frame every 100 frames to prevent drift
            
            // Adaptive quality state
            int effectiveJpegQuality = jpegQuality;
            int consecutiveBandwidthUpdates = 0;
            
            while (!ct.IsCancellationRequested)
            {
                var started = Stopwatch.GetTimestamp();
                var budget = frameInterval;
                
                // Capture frame from the selected monitor
                var frame = await CaptureFrameAsync(capturer, ct);
                if (frame == null) continue; // Skip if capture failed
                
                // Apply display mode transformations
                var displayFrame = ApplyDisplayMode(frame);
                
                // Do not encode/send an unchanged desktop repeatedly. A periodic full
                // refresh retains compatibility with older clients and avoids drift.
                bool isUnchanged = previous != null && 
                                  previous.Width == displayFrame.Width && 
                                  previous.Height == displayFrame.Height &&
                                  displayFrame.Bgra.AsSpan().SequenceEqual(previous.Bgra);
                                  
                bool needsFullRefresh = consecutiveUnchangedFrames >= MaxUnchangedFramesBeforeFullRefresh;
                
                if (previous == null || !isUnchanged || needsFullRefresh)
                {
                    // Calculate effective quality (adaptive or fixed)
                    if (effectiveJpegQuality < 0)
                    {
                        // For adaptive quality, we'd need bandwidth feedback from the network layer
                        // This would be implemented by updating effectiveJpegQuality based on network metrics
                        // For now, use the base adaptive quality calculation
                        effectiveJpegQuality = FrameCodec.Adaptive.GetCurrentQuality();
                    }
                    
                    var jpeg = FrameCodec.EncodeJpeg(displayFrame, effectiveJpegQuality, maxDimension);
                    
                    // Apply display mode scaling to the frame dimensions sent to receiver
                    var (displayWidth, displayHeight) = ApplyDisplayModeScaling(displayFrame.Width, displayFrame.Height);
                    
                    await _loop.SendAsync(MessageType.ScreenFrame, new ScreenFrameMessage(displayWidth, displayHeight, "jpeg", jpeg), ct).ConfigureAwait(false);
                    lastSent.Restart();
                    consecutiveUnchangedFrames = 0; // Reset counter when we send a frame
                }
                else
                {
                    consecutiveUnchangedFrames++;
                    // Still need to account for time even when not sending
                }
                
                previous = displayFrame;
                
                // Encoding and transport time count toward the frame budget. Awaiting
                // each write prevents an unbounded outgoing frame queue.
                var remaining = budget - Stopwatch.GetElapsedTime(started);
                if (remaining > TimeSpan.Zero) await Task.Delay(remaining, ct).ConfigureAwait(false);
            }
        }
        catch (OperationCanceledException)
        {
            // Normal shutdown via Dispose.
        }
        catch (Exception ex) { Faulted?.Invoke(ex); }
        finally { capturer.Dispose(); }
    }

    /// <summary>
    /// Captures a frame from the specified monitor.
    /// </summary>
    private async Task<CapturedFrame?> CaptureFrameAsync(IScreenCapturer capturer, CancellationToken ct)
    {
        try
        {
            // If we have a monitor-aware capturer, use it
            if (_isMultiMonitorAware && capturer is IMonitorAwareCapturer monitorAware)
            {
                return await monitorAware.CaptureFrameAsync(_currentMonitor, ct);
            }
            else
            {
                // Fall back to standard capture (captures virtual desktop)
                // In a real implementation, we'd crop to the specific monitor bounds
                return await Task.Run(() => capturer.CaptureFrame(), ct);
            }
        }
        catch (Exception)
        {
            return null; // Indicate capture failure
        }
    }

    /// <summary>
    /// Applies display mode transformations to a frame.
    /// </summary>
    private CapturedFrame ApplyDisplayMode(CapturedFrame frame)
    {
        // In a full implementation, this would apply transformations like:
        // - Original: No change
        // - Fit: Scale to fit within view while maintaining aspect ratio
        // - Stretch: Stretch to fill view (may distort aspect ratio)
        // - Auto Adapt: Automatically choose best fit based on content and view size
        // - Fullscreen: Fill entire view, possibly cropping
        // 
        // For now, we return the frame as-is and handle scaling in the network layer
        // via the scale factor in ScreenFrameMessage
        return frame;
    }

    /// <summary>
    /// Applies display mode scaling to frame dimensions for network transmission.
    /// Returns the dimensions that should be sent in the ScreenFrameMessage.
    /// </summary>
    private (int width, int height) ApplyDisplayModeScaling(int width, int height)
    {
        // Apply display mode scaling logic here
        // For now, return original dimensions - actual scaling would be handled
        // by the receiver based on display mode and view size
        return (width, height);
    }

    private void OnMessageReceived(MessageType type, JsonElement payload)
    {
        lock (_inputLock)
        {
        if (_disposed != 0) return;
        switch (type)
        {
            case MessageType.ScreenFrame when _session.GrantedPermissions.HasFlag(ConnectionPermissions.ViewScreen):
                var frameMessage = payload.Deserialize<ScreenFrameMessage>();
                if (frameMessage is not null)
                {
                    FrameReceived?.Invoke(FrameCodec.DecodeJpeg(frameMessage.Data));
                }

                break;

            case MessageType.MouseMove when CanControlMouse():
                var moveMessage = payload.Deserialize<MouseMoveMessage>();
                if (moveMessage is not null)
                {
                    _sharingInjector!.MoveMouse(moveMessage.NormalizedX, moveMessage.NormalizedY);
                }

                break;

            case MessageType.MouseButton when CanControlMouse():
                var buttonMessage = payload.Deserialize<MouseButtonMessage>();
                if (buttonMessage is not null)
                {
                    _sharingInjector!.MouseButton(buttonMessage.Button, buttonMessage.IsDown);
                    if (buttonMessage.IsDown) _heldButtons.Add(buttonMessage.Button); else _heldButtons.Remove(buttonMessage.Button);
                }

                break;

            case MessageType.MouseWheel when CanControlMouse():
                var wheelMessage = payload.Deserialize<MouseWheelMessage>();
                if (wheelMessage is not null)
                {
                    _sharingInjector!.MouseWheel(wheelMessage.Delta);
                }

                break;

            case MessageType.KeyEvent when CanControlKeyboard():
                var keyMessage = payload.Deserialize<KeyEventMessage>();
                if (keyMessage is not null)
                {
                    _sharingInjector!.KeyEvent(keyMessage.VirtualKeyCode, keyMessage.IsDown);
                    if (keyMessage.IsDown) _heldKeys.Add(keyMessage.VirtualKeyCode); else _heldKeys.Remove(keyMessage.VirtualKeyCode);
                }

                break;
                
                // Handle monitor and display mode messages from viewer
            case MessageType.MonitorRequest when _session.GrantedPermissions.HasFlag(ConnectionPermissions.ViewScreen):
                var monitorRequest = payload.Deserialize<MonitorRequestMessage>();
                if (monitorRequest is not null && SetCurrentMonitor(monitorRequest.MonitorId))
                {
                    // Acknowledge the monitor change
                    _ = _loop.SendAsync(MessageType.MonitorResponse, new MonitorResponseMessage(true, _currentMonitor.DeviceName), default);
                }
                else
                {
                    // Failed to set monitor
                    _ = _loop.SendAsync(MessageType.MonitorResponse, new MonitorResponseMessage(false, null), default);
                }
                break;
                
            case MessageType.DisplayModeRequest when _session.GrantedPermissions.HasFlag(ConnectionPermissions.ViewScreen):
                var displayModeRequest = payload.Deserialize<DisplayModeRequestMessage>();
                if (displayModeRequest is not null)
                {
                    SetDisplayMode(displayModeRequest.Mode);
                    // Acknowledge the display mode change
                    _ = _loop.SendAsync(MessageType.DisplayModeResponse, new DisplayModeResponseMessage(true, _displayMode), default);
                }
                else
                {
                    // Failed to set display mode
                    _ = _loop.SendAsync(MessageType.DisplayModeResponse, new DisplayModeResponseMessage(false, DisplayMode.Original), default);
                }
                break;
        }
        }
    }

    private bool CanControlMouse() => _sharingInjector is not null && _session.GrantedPermissions.HasFlag(ConnectionPermissions.ControlMouse);

    private bool CanControlKeyboard() => _sharingInjector is not null && _session.GrantedPermissions.HasFlag(ConnectionPermissions.ControlKeyboard);

    public Task SendMouseMoveAsync(double normalizedX, double normalizedY, CancellationToken ct = default) =>

        _loop.SendAsync(MessageType.MouseMove, new MouseMoveMessage(normalizedX, normalizedY), ct);

    public Task SendMouseButtonAsync(int button, bool isDown, CancellationToken ct = default) =>
        _loop.SendAsync(MessageType.MouseButton, new MouseButtonMessage(button, isDown), ct);

    public Task SendMouseWheelAsync(int delta, CancellationToken ct = default) =>
        _loop.SendAsync(MessageType.MouseWheel, new MouseWheelMessage(delta), ct);

    public Task SendKeyEventAsync(int virtualKeyCode, bool isDown, CancellationToken ct = default) =>
        _loop.SendAsync(MessageType.KeyEvent, new KeyEventMessage(virtualKeyCode, isDown), ct);

    // New methods for monitor and display mode control
    public Task RequestMonitorInfoAsync(CancellationToken ct = default) =>
        _loop.SendAsync(MessageType.MonitorInfoRequest, new MonitorInfoRequestMessage(), ct);

    public Task RequestAvailableMonitorsAsync(CancellationToken ct = default) =>
        _loop.SendAsync(MessageType.AvailableMonitorsRequest, new AvailableMonitorsRequestMessage(), ct);

    public void Dispose()
    {
        if (Interlocked.Exchange(ref _disposed, 1) != 0) return;
        _loop.MessageReceived -= OnMessageReceived;
        _captureCts?.Cancel();
        _captureCts?.Dispose();
        // Capture loop owns the capturer so it cannot be disposed during a frame.
        lock (_inputLock)
        {
            foreach (var key in _heldKeys) { try { _sharingInjector?.KeyEvent(key, false); } catch (Exception) { } }
            foreach (var button in _heldButtons) { try { _sharingInjector?.MouseButton(button, false); } catch (Exception) { } }
            _heldKeys.Clear(); _heldButtons.Clear();
        }
        Closed?.Invoke();
    }
}

// Message definitions for monitor and display mode control
public sealed record MonitorInfoRequestMessage();
public sealed record MonitorInfoResponseMessage(string JsonMonitors);
public sealed record AvailableMonitorsRequestMessage();
public sealed record AvailableMonitorsResponseMessage(string JsonMonitors);
public sealed record MonitorRequestMessage(string MonitorId);
public sealed record MonitorResponseMessage(bool Success, string? MonitorId);
public sealed record DisplayModeRequestMessage(DisplayMode Mode);
public sealed record DisplayModeResponseMessage(bool Success, DisplayMode Mode);

// Monitor information structure
public sealed record MonitorInfo
{
    public static MonitorInfo Primary => new MonitorInfo("\\\\.\\DISPLAY1", "Primary Monitor", 0, 0, 1920, 1080); // Placeholder
    
    public MonitorInfo(string deviceName, string friendlyName, int x, int y, int width, int height)
    {
        DeviceName = deviceName;
        FriendlyName = friendlyName;
        Bounds = new Rectangle(x, y, width, height);
    }
    
    public string DeviceName { get; }
    public string FriendlyName { get; }
    public Rectangle Bounds { get; }
    public int Width => Bounds.Width;
    public int Height => Bounds.Height;
    public int X => Bounds.X;
    public int Y => Bounds.Y;
}

// Simple rectangle structure
public sealed record Rectangle
{
    public Rectangle(int x, int y, int width, int height)
    {
        X = x;
        Y = y;
        Width = width;
        Height = height;
    }
    
    public int X { get; }
    public int Y { get; }
    public int Width { get; }
    public int Height { get; }
    public int Right => X + Width;
    public int Bottom => Y + Height;
}

// Interface for monitor-aware capturers
public interface IMonitorAwareCapturer
{
    Task<CapturedFrame?> CaptureFrameAsync(MonitorInfo monitor, CancellationToken ct);
}

// Display mode enumeration
public enum DisplayMode
{
    Original,      // No scaling, actual size
    Fit,           // Scale to fit within view while maintaining aspect ratio
    Stretch,       // Stretch to fill view (may distort aspect ratio)
    AutoAdapt,     // Automatically choose best fit
    Fullscreen     // Fill entire view, possibly cropping
}
