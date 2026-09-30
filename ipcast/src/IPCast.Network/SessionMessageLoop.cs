using System.Text.Json;
using IPCast.Network.Protocol;

namespace IPCast.Network;

/// <summary>
/// Runs the receive loop for an established <see cref="RemoteSession"/> and dispatches messages
/// exchanged after the initial handshake (currently: clipboard sync; screen frames and input
/// events join this same loop in a later phase).
/// </summary>
public sealed class SessionMessageLoop : IAsyncDisposable
{
    private readonly RemoteSession _session;
    private readonly CancellationTokenSource _cts = new();
    private Task? _loopTask;

    public SessionMessageLoop(RemoteSession session)
    {
        _session = session;
    }

    /// <summary>Raised when the peer pushes clipboard text - only for sessions granted <see cref="ConnectionPermissions.Clipboard"/>.</summary>
    public event Action<string>? ClipboardTextReceived;

    /// <summary>
    /// Raised for every message this loop doesn't already have a specific event for (e.g. file
    /// transfer), so higher-level features can plug into the same connection without
    /// <see cref="SessionMessageLoop"/> needing to know about them.
    /// </summary>
    public event Action<MessageType, JsonElement>? MessageReceived;

    /// <summary>Raised when the receive loop stops because of an error (as opposed to a clean Bye/cancellation).</summary>
    public event Action<Exception>? Faulted;
    public event Action? Ended;

    public void Start()
    {
        _loopTask = RunAsync(_cts.Token);
    }

    private async Task RunAsync(CancellationToken ct)
    {
        try
        {
            while (!ct.IsCancellationRequested)
            {
                var (type, payload) = await MessageStream.ReadAsync(_session.Stream, ct).ConfigureAwait(false);
                Dispatch(type, payload);
            }
        }
        catch (OperationCanceledException)
        {
            // Normal shutdown via DisposeAsync.
        }
        catch (Exception ex) { Faulted?.Invoke(ex); }
        finally { Ended?.Invoke(); }
    }

    private void Dispatch(MessageType type, JsonElement payload)
    {
        switch (type)
        {
            case MessageType.ClipboardText:
                if (_session.GrantedPermissions.HasFlag(ConnectionPermissions.Clipboard))
                {
                    var message = payload.Deserialize<ClipboardTextMessage>();
                    if (message is not null)
                    {
                        ClipboardTextReceived?.Invoke(message.Text);
                    }
                }

                break;

            case MessageType.Bye:
                _cts.Cancel();
                return; // don't also fall through to MessageReceived below
        }

        MessageReceived?.Invoke(type, payload);
    }

    /// <summary>Sends any message type on this session's stream - used by features layered on top (file transfer, etc.).</summary>
    public Task SendAsync(MessageType type, object payload, CancellationToken ct = default) =>
        MessageStream.WriteAsync(_session.Stream, type, payload, ct);

    public Task SendClipboardTextAsync(string text, CancellationToken ct = default) =>
        _session.GrantedPermissions.HasFlag(ConnectionPermissions.Clipboard)
            ? SendAsync(MessageType.ClipboardText, new ClipboardTextMessage(text), ct)
            : Task.CompletedTask;

    public async ValueTask DisposeAsync()
    {
        await _cts.CancelAsync().ConfigureAwait(false);

        if (_loopTask is not null)
        {
            try
            {
                await _loopTask.ConfigureAwait(false);
            }
            catch (Exception)
            {
                // RunAsync already reports its own failures via Faulted; nothing more to do here.
            }
        }

        _cts.Dispose();
    }
}
