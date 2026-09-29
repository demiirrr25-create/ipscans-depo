using System.Text.Json;
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

    public RemoteDesktopSession(SessionMessageLoop loop, RemoteSession session)
    {
        _loop = loop;
        _session = session;
        _loop.MessageReceived += OnMessageReceived;
    }

    /// <summary>Raised on the viewer side with each decoded frame from the peer.</summary>
    public event Action<CapturedFrame>? FrameReceived;

    /// <summary>Starts capturing and streaming this device's screen to the peer, and applies input events the peer sends back.</summary>
    public void StartSharing(IScreenCapturer capturer, IInputInjector injector, TimeSpan frameInterval, int jpegQuality = 70)
    {
        if (!_session.GrantedPermissions.HasFlag(ConnectionPermissions.ViewScreen))
        {
            throw new InvalidOperationException("This session wasn't granted ViewScreen.");
        }

        _sharingCapturer = capturer;
        _sharingInjector = injector;
        _captureCts = new CancellationTokenSource();
        _captureLoop = RunCaptureLoopAsync(capturer, frameInterval, jpegQuality, _captureCts.Token);
    }

    private async Task RunCaptureLoopAsync(IScreenCapturer capturer, TimeSpan frameInterval, int jpegQuality, CancellationToken ct)
    {
        try
        {
            while (!ct.IsCancellationRequested)
            {
                var frame = capturer.CaptureFrame();
                var jpeg = FrameCodec.EncodeJpeg(frame, jpegQuality);
                await _loop.SendAsync(MessageType.ScreenFrame, new ScreenFrameMessage(frame.Width, frame.Height, "jpeg", jpeg), ct)
                    .ConfigureAwait(false);
                await Task.Delay(frameInterval, ct).ConfigureAwait(false);
            }
        }
        catch (OperationCanceledException)
        {
            // Normal shutdown via Dispose.
        }
    }

    private void OnMessageReceived(MessageType type, JsonElement payload)
    {
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
                }

                break;
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

    public void Dispose()
    {
        _loop.MessageReceived -= OnMessageReceived;
        _captureCts?.Cancel();
        _captureCts?.Dispose();
        _sharingCapturer?.Dispose();
    }
}
