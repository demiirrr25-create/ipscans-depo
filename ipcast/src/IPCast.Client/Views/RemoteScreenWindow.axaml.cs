using System.Runtime.InteropServices;
using Avalonia;
using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Media.Imaging;
using Avalonia.Platform;
using Avalonia.Threading;
using Avalonia.Interactivity;
using IPCast.RemoteDesktop;

namespace IPCast.Client.Views;

/// <summary>
/// Shows the peer's screen (spec §5) and forwards local pointer/keyboard input back to it (spec
/// §6), gated by whatever permissions the remote side actually granted - <see cref="RemoteDesktopSession"/>
/// silently drops anything not granted, so this window doesn't need its own permission checks.
/// </summary>
public partial class RemoteScreenWindow : Window
{
    private readonly RemoteDesktopSession _desktop;
    private WriteableBitmap? _bitmap;
    private bool _closed;
    private CapturedFrame? _pendingFrame;
    private readonly DispatcherTimer _renderTimer = new() { Interval = TimeSpan.FromMilliseconds(33) };
    private readonly HashSet<int> _pressedKeys = [];
    private bool _suppressEscapeKeyUp;
    private bool _updatingMonitors;

    public RemoteScreenWindow()
    {
        // Parameterless constructor required by the Avalonia XAML previewer/loader only.
        _desktop = null!;
        InitializeComponent();
    }

    public RemoteScreenWindow(RemoteDesktopSession desktop)
    {
        _desktop = desktop;
        InitializeComponent();

        _desktop.FrameReceived += OnFrameReceived;
        _desktop.AvailableMonitorsReceived += OnAvailableMonitorsReceived;
        Opened += async (_, _) => await SendSafely(() => _desktop.RequestAvailableMonitorsAsync());
        _renderTimer.Tick += (_, _) => RenderLatestFrame();
        _renderTimer.Start();
        _desktop.Closed += OnSessionClosed;
        ScreenImage.PointerMoved += OnPointerMoved;
        ScreenImage.PointerPressed += OnPointerPressed;
        ScreenImage.PointerReleased += OnPointerReleased;
        ScreenImage.PointerWheelChanged += OnPointerWheelChanged;
        KeyDown += OnKeyDown;
        KeyUp += OnKeyUp;
        Deactivated += async (_, _) => {
            foreach (var key in _pressedKeys.ToArray()) await SendSafely(() => _desktop.SendKeyEventAsync(key, false));
            _pressedKeys.Clear();
        };
        Closed += (_, _) => { _closed = true; _renderTimer.Stop(); Interlocked.Exchange(ref _pendingFrame, null); _desktop.FrameReceived -= OnFrameReceived; _desktop.AvailableMonitorsReceived -= OnAvailableMonitorsReceived; _desktop.Closed -= OnSessionClosed; _bitmap?.Dispose(); };
    }

    private sealed record MonitorOption(string DeviceName, string Label)
    {
        public override string ToString() => Label;
    }

    private void OnAvailableMonitorsReceived(IReadOnlyList<MonitorInfo> monitors) =>
        Dispatcher.UIThread.Post(() =>
        {
            if (_closed) return;
            _updatingMonitors = true;
            try
            {
                MonitorSelector.ItemsSource = monitors.Select(m => new MonitorOption(m.DeviceName, m.FriendlyName)).ToArray();
                MonitorSelector.IsVisible = monitors.Count > 1;
                MonitorSelector.SelectedIndex = monitors.Count > 0 ? 0 : -1;
            }
            finally { _updatingMonitors = false; }
        });

    private async void OnMonitorSelectionChanged(object? sender, SelectionChangedEventArgs e)
    {
        if (_updatingMonitors || MonitorSelector.SelectedItem is not MonitorOption selected) return;
        await SendSafely(() => _desktop.SelectMonitorAsync(selected.DeviceName));
    }

    private void OnSessionClosed() => Dispatcher.UIThread.Post(Close);

    private void OnFrameReceived(CapturedFrame frame) => Interlocked.Exchange(ref _pendingFrame, frame);

    private void RenderLatestFrame()
    {
            var frame = Interlocked.Exchange(ref _pendingFrame, null);
            if (frame is null) return;
            if (_closed) return;
            if (_bitmap is null || _bitmap.PixelSize.Width != frame.Width || _bitmap.PixelSize.Height != frame.Height)
            {
                _bitmap?.Dispose();
                _bitmap = new WriteableBitmap(
                    new PixelSize(frame.Width, frame.Height), new Avalonia.Vector(96, 96), PixelFormat.Bgra8888, AlphaFormat.Opaque);
                ScreenImage.Source = _bitmap;
            }

            using var fb = _bitmap.Lock();
            var rowBytes = frame.Width * 4;
            if (fb.RowBytes == rowBytes)
            {
                Marshal.Copy(frame.Bgra, 0, fb.Address, frame.Bgra.Length);
            }
            else
            {
                for (var y = 0; y < frame.Height; y++)
                {
                    Marshal.Copy(frame.Bgra, y * rowBytes, fb.Address + (y * fb.RowBytes), rowBytes);
                }
            }

            ScreenImage.InvalidateVisual();
    }

    private async void OnPointerMoved(object? sender, PointerEventArgs e)
    {
        var bounds = ScreenImage.Bounds;
        if (bounds.Width <= 0 || bounds.Height <= 0)
        {
            return;
        }

        var pos = e.GetPosition(ScreenImage);
        if (_bitmap is null) return;
        var scale = Math.Min(bounds.Width / _bitmap.PixelSize.Width, bounds.Height / _bitmap.PixelSize.Height);
        var width = _bitmap.PixelSize.Width * scale;
        var height = _bitmap.PixelSize.Height * scale;
        var x = (pos.X - (bounds.Width - width) / 2) / width;
        var y = (pos.Y - (bounds.Height - height) / 2) / height;
        if (x < 0 || x > 1 || y < 0 || y > 1) return;
        await SendSafely(() => _desktop.SendMouseMoveAsync(x, y));
    }

    private async void OnPointerPressed(object? sender, PointerPressedEventArgs e)
    {
        var button = e.GetCurrentPoint(ScreenImage).Properties.PointerUpdateKind switch
        {
            PointerUpdateKind.LeftButtonPressed => 0,
            PointerUpdateKind.RightButtonPressed => 1,
            PointerUpdateKind.MiddleButtonPressed => 2,
            _ => -1,
        };

        if (button >= 0)
        {
            ScreenImage.Focus();
            e.Pointer.Capture(ScreenImage);
            await SendSafely(() => _desktop.SendMouseButtonAsync(button, isDown: true));
            e.Handled = true;
        }
    }

    private async void OnPointerReleased(object? sender, PointerReleasedEventArgs e)
    {
        var button = e.InitialPressMouseButton switch
        {
            MouseButton.Left => 0,
            MouseButton.Right => 1,
            MouseButton.Middle => 2,
            _ => -1,
        };

        if (button >= 0)
        {
            await SendSafely(() => _desktop.SendMouseButtonAsync(button, isDown: false));
            e.Pointer.Capture(null);
            e.Handled = true;
        }
    }

    private async void OnPointerWheelChanged(object? sender, PointerWheelEventArgs e) =>
        await SendSafely(() => _desktop.SendMouseWheelAsync((int)(e.Delta.Y * 120)));

    private async void OnKeyDown(object? sender, KeyEventArgs e)
    {
        if (e.Key == Key.F11 || (e.Key == Key.Escape && WindowState == WindowState.FullScreen))
        {
            _suppressEscapeKeyUp = e.Key == Key.Escape;
            ToggleFullScreen();
            e.Handled = true;
            return;
        }
        var key = AvaloniaKeyToVirtualKey(e.Key);
        if (key == 0) return;
        _pressedKeys.Add(key);
        await SendSafely(() => _desktop.SendKeyEventAsync(key, isDown: true));
        e.Handled = true;
    }

    private async void OnKeyUp(object? sender, KeyEventArgs e)
    {
        if (e.Key == Key.F11 || e.Key == Key.Escape && _suppressEscapeKeyUp)
        {
            if (e.Key == Key.Escape) _suppressEscapeKeyUp = false;
            e.Handled = true;
            return;
        }
        var key = AvaloniaKeyToVirtualKey(e.Key);
        if (key == 0) return;
        _pressedKeys.Remove(key);
        await SendSafely(() => _desktop.SendKeyEventAsync(key, isDown: false));
        e.Handled = true;
    }

    private void OnToggleFullScreenClick(object? sender, RoutedEventArgs e) => ToggleFullScreen();

    private void OnDisconnectClick(object? sender, RoutedEventArgs e) => Close();

    private void OnToggleToolbarClick(object? sender, RoutedEventArgs e)
    {
        var show = !Toolbar.IsVisible;
        Toolbar.IsVisible = show;
        ShowToolbarButton.IsVisible = !show;
    }

    private void ToggleFullScreen()
    {
        WindowState = WindowState == WindowState.FullScreen ? WindowState.Normal : WindowState.FullScreen;
        FullScreenButton.Content = WindowState == WindowState.FullScreen ? "Exit full screen" : "Full screen";
    }

    private async Task SendSafely(Func<Task> send)
    {
        if (_closed) return;
        try { await send(); }
        catch (Exception) { Title = "IPCast — connection closed"; }
    }

    // Avalonia's Key enum numeric values are aligned with Win32 virtual-key codes for the common
    // alphanumeric/function keys, but this hasn't been exhaustively verified against every key on
    // a real Windows machine - flagged the same way as the rest of Phase 3's Windows-only pieces.
    private static int AvaloniaKeyToVirtualKey(Key key) => Avalonia.Win32.Input.KeyInterop.VirtualKeyFromKey(key);
}
