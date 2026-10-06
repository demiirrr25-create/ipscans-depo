using System.Text.Json;
using System.Diagnostics;
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
    private int _started;
    private readonly SemaphoreSlim _probeGate = new(1, 1);
    private TaskCompletionSource<long>? _probe;
    private long _probeSequence;

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
        if (Interlocked.Exchange(ref _started, 1) != 0)
            throw new InvalidOperationException("The session receive loop has already started.");
        var token = _cts.Token;
        _loopTask = Task.Run(() => RunAsync(token));
    }

    private async Task RunAsync(CancellationToken ct)
    {
        try
        {
            while (!ct.IsCancellationRequested)
            {
                var (type, payload) = await MessageStream.ReadAsync(_session.Stream, ct).ConfigureAwait(false);
                await DispatchAsync(type, payload, ct).ConfigureAwait(false);
            }
        }
        catch (OperationCanceledException)
        {
            // Normal shutdown via DisposeAsync.
        }
        catch (Exception ex) { Faulted?.Invoke(ex); }
        finally { Ended?.Invoke(); }
    }

    private async Task DispatchAsync(MessageType type, JsonElement payload, CancellationToken ct)
    {
        switch (type)
        {
            case MessageType.Ping:
                var ping = payload.Deserialize<PingMessage>();
                if (ping is not null)
                    await SendAsync(MessageType.Pong, new PongMessage(ping.Sequence), ct).ConfigureAwait(false);
                return;
            case MessageType.Pong:
                var pong = payload.Deserialize<PongMessage>();
                if (pong?.Sequence == Interlocked.Read(ref _probeSequence))
                    Volatile.Read(ref _probe)?.TrySetResult(Stopwatch.GetTimestamp());
                return;
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

    public async Task<TimeSpan> MeasureLatencyAsync(CancellationToken ct = default)
    {
        using var lifetime = CancellationTokenSource.CreateLinkedTokenSource(ct, _cts.Token);
        lifetime.CancelAfter(TimeSpan.FromSeconds(5));
        await _probeGate.WaitAsync(lifetime.Token).ConfigureAwait(false);
        try
        {
            var probe = new TaskCompletionSource<long>(TaskCreationOptions.RunContinuationsAsynchronously);
            Interlocked.Increment(ref _probeSequence);
            Volatile.Write(ref _probe, probe);
            var started = Stopwatch.GetTimestamp();
            await SendAsync(MessageType.Ping, new PingMessage(Interlocked.Read(ref _probeSequence), DateTimeOffset.UtcNow), lifetime.Token).ConfigureAwait(false);
            var received = await probe.Task.WaitAsync(lifetime.Token).ConfigureAwait(false);
            return Stopwatch.GetElapsedTime(started, received);
        }
        finally
        {
            Volatile.Write(ref _probe, null);
            _probeGate.Release();
        }
    }

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
