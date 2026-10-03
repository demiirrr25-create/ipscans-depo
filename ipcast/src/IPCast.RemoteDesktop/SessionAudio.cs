using System.Text.Json;
using System.Threading.Channels;
using IPCast.Network;
using IPCast.Network.Protocol;

namespace IPCast.RemoteDesktop;

public interface ISystemAudio : IDisposable
{
    event Action<byte[]>? Captured;
    event Action<Exception>? Failed;
    void StartCapture();
    void StopCapture();
    void Play(byte[] pcm);
    void StopPlayback();
    float Volume { get; set; }
}
public sealed record AudioControlMessage(bool Enabled);
public sealed record AudioStateMessage(bool Enabled, string? Error = null);
public sealed record AudioDataMessage(byte[] Data);

/// <summary>Opt-in 24 kHz stereo PCM16 system audio. Bounded lossy queue keeps latency finite on slow links.</summary>
public sealed class SessionAudio : IDisposable
{
    private readonly SessionMessageLoop _loop;
    private readonly RemoteSession _session;
    private readonly Func<ISystemAudio> _createBackend;
    private ISystemAudio? _backend;
    private readonly object _gate = new();
    private readonly CancellationTokenSource _cts = new();
    private readonly Channel<(byte[] Bytes, long Time)> _audio = Channel.CreateBounded<(byte[], long)>(
        new BoundedChannelOptions(4) { FullMode = BoundedChannelFullMode.DropOldest });
    private readonly Channel<bool> _commands = Channel.CreateBounded<bool>(4);
    private volatile bool _enabled;
    private bool _requested;
    private int _disposed;
    public bool Available => _session.GrantedPermissions.HasFlag(ConnectionPermissions.Audio);
    public event Action<bool, string?>? StateChanged;
    public SessionAudio(SessionMessageLoop loop, RemoteSession session, Func<ISystemAudio> backend)
    {
        _loop = loop; _session = session; _createBackend = backend;
        loop.MessageReceived += Receive; loop.Ended += Dispose;
        _ = Task.Run(SendAudioAsync); _ = Task.Run(CommandsAsync);
    }
    private ISystemAudio Backend()
    {
        if (_backend is not null) return _backend;
        _backend = _createBackend();
        _backend.Captured += bytes =>
        {
            if (!_enabled || bytes.Length % 4 != 0) return;
            for (var offset = 0; offset < bytes.Length; offset += 8192)
                _audio.Writer.TryWrite((bytes[offset..Math.Min(bytes.Length, offset + 8192)], Environment.TickCount64));
        };
        _backend.Failed += _ => { _commands.Writer.TryWrite(false); StateChanged?.Invoke(false, "Audio device became unavailable."); };
        return _backend;
    }
    public async Task SetEnabledAsync(bool enabled)
    {
        if (!Available || !_session.IsInitiator) throw new UnauthorizedAccessException("System audio permission was not granted.");
        lock (_gate) { _requested = enabled; if (!enabled) { _enabled = false; _backend?.StopPlayback(); } }
        await _loop.SendAsync(MessageType.AudioControl, new AudioControlMessage(enabled), _cts.Token);
    }
    public void SetVolume(float volume)
    {
        if (!float.IsFinite(volume)) return;
        lock (_gate) Backend().Volume = Math.Clamp(volume, 0, 1);
    }
    private void Receive(MessageType type, JsonElement payload)
    {
        if (!Available || _disposed != 0) return;
        if (type == MessageType.AudioControl && !_session.IsInitiator)
        {
            if (!_commands.Writer.TryWrite(payload.Deserialize<AudioControlMessage>()?.Enabled == true))
                throw new InvalidDataException("Excessive audio control requests.");
        }
        else if (type == MessageType.AudioState && _session.IsInitiator)
        {
            var state = payload.Deserialize<AudioStateMessage>();
            if (state is null) return;
            lock (_gate) { _enabled = state.Enabled && _requested; if (!_enabled) _backend?.StopPlayback(); }
            StateChanged?.Invoke(_enabled, state.Error);
        }
        else if (type == MessageType.AudioData && _session.IsInitiator && _enabled)
        {
            var bytes = payload.Deserialize<AudioDataMessage>()?.Data;
            if (bytes is null || bytes.Length is 0 or > 8192 || bytes.Length % 4 != 0)
                throw new InvalidDataException("Invalid PCM audio data.");
            // Device creation and playback happen off the protocol reader.
            _audio.Writer.TryWrite((bytes, Environment.TickCount64));
        }
    }
    private async Task CommandsAsync()
    {
        try
        {
            await foreach (var enabled in _commands.Reader.ReadAllAsync(_cts.Token))
            {
                string? error = null;
                lock (_gate)
                {
                    if (_disposed != 0) return;
                    try
                    {
                        if (enabled && !_enabled) { Backend().StartCapture(); _enabled = true; }
                        else if (!enabled) { _enabled = false; _backend?.StopCapture(); }
                    }
                    catch (Exception) { _enabled = false; error = "Unable to initialize Windows system audio."; }
                }
                await _loop.SendAsync(MessageType.AudioState, new AudioStateMessage(_enabled, error), _cts.Token);
                StateChanged?.Invoke(_enabled, error);
            }
        }
        catch (OperationCanceledException) { }
        catch (Exception) { StateChanged?.Invoke(false, "Audio connection closed."); }
    }
    private async Task SendAudioAsync()
    {
        try
        {
            await foreach (var packet in _audio.Reader.ReadAllAsync(_cts.Token))
            {
                if (!_enabled || Environment.TickCount64 - packet.Time > 300) continue;
                if (_session.IsInitiator)
                {
                    lock (_gate) { if (_disposed == 0 && _enabled) Backend().Play(packet.Bytes); }
                }
                else await _loop.SendAsync(MessageType.AudioData, new AudioDataMessage(packet.Bytes), _cts.Token);
            }
        }
        catch (OperationCanceledException) { }
        catch (Exception) { StateChanged?.Invoke(false, "System audio stopped. Disable and enable it to retry."); }
    }
    public void Dispose()
    {
        if (Interlocked.Exchange(ref _disposed, 1) != 0) return;
        _loop.MessageReceived -= Receive; _loop.Ended -= Dispose; _cts.Cancel();
        lock (_gate) { _enabled = false; _backend?.Dispose(); _backend = null; }
    }
}
