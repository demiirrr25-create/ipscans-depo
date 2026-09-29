using System.Runtime.InteropServices;
using Avalonia;
using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Media.Imaging;
using Avalonia.Platform;
using Avalonia.Threading;
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
        ScreenImage.PointerMoved += OnPointerMoved;
        ScreenImage.PointerPressed += OnPointerPressed;
        ScreenImage.PointerReleased += OnPointerReleased;
        ScreenImage.PointerWheelChanged += OnPointerWheelChanged;
        KeyDown += OnKeyDown;
        KeyUp += OnKeyUp;
        Closed += (_, _) => _desktop.FrameReceived -= OnFrameReceived;
    }

    private void OnFrameReceived(CapturedFrame frame)
    {
        Dispatcher.UIThread.Post(() =>
        {
            if (_bitmap is null || _bitmap.PixelSize.Width != frame.Width || _bitmap.PixelSize.Height != frame.Height)
            {
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
        });
    }

    private async void OnPointerMoved(object? sender, PointerEventArgs e)
    {
        var bounds = ScreenImage.Bounds;
        if (bounds.Width <= 0 || bounds.Height <= 0)
        {
            return;
        }

        var pos = e.GetPosition(ScreenImage);
        await _desktop.SendMouseMoveAsync(
            Math.Clamp(pos.X / bounds.Width, 0, 1), Math.Clamp(pos.Y / bounds.Height, 0, 1));
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
            await _desktop.SendMouseButtonAsync(button, isDown: true);
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
            await _desktop.SendMouseButtonAsync(button, isDown: false);
        }
    }

    private async void OnPointerWheelChanged(object? sender, PointerWheelEventArgs e) =>
        await _desktop.SendMouseWheelAsync((int)(e.Delta.Y * 120));

    private async void OnKeyDown(object? sender, KeyEventArgs e) =>
        await _desktop.SendKeyEventAsync(AvaloniaKeyToVirtualKey(e.Key), isDown: true);

    private async void OnKeyUp(object? sender, KeyEventArgs e) =>
        await _desktop.SendKeyEventAsync(AvaloniaKeyToVirtualKey(e.Key), isDown: false);

    // Avalonia's Key enum numeric values are aligned with Win32 virtual-key codes for the common
    // alphanumeric/function keys, but this hasn't been exhaustively verified against every key on
    // a real Windows machine - flagged the same way as the rest of Phase 3's Windows-only pieces.
    private static int AvaloniaKeyToVirtualKey(Key key) => (int)key;
}
