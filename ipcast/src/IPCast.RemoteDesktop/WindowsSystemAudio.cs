using System.Runtime.Versioning;
using NAudio.Wave;
using NAudio.Wave.SampleProviders;
using NAudio.CoreAudioApi;

namespace IPCast.RemoteDesktop;

[SupportedOSPlatform("windows")]
public sealed class WindowsSystemAudio : ISystemAudio
{
    private WasapiLoopbackCapture? _capture;
    private WasapiOut? _playback;
    private BufferedWaveProvider? _buffer;
    private VolumeSampleProvider? _volume;
    private float _level = 1;
    public event Action<byte[]>? Captured;
    public event Action<Exception>? Failed;
    public float Volume { get => _level; set { _level = value; if (_volume is not null) _volume.Volume = value; } }
    public void StartCapture()
    {
        if (_capture is not null) return;
        var capture = new WasapiLoopbackCapture { WaveFormat = new WaveFormat(24000, 16, 2) };
        capture.DataAvailable += (_, e) => { if (e.BytesRecorded > 0) Captured?.Invoke(e.Buffer[..e.BytesRecorded]); };
        capture.RecordingStopped += (_, e) => { if (e.Exception is not null) Failed?.Invoke(e.Exception); };
        try { capture.StartRecording(); _capture = capture; }
        catch { capture.Dispose(); throw; }
    }
    public void StopCapture()
    {
        var capture = _capture; _capture = null;
        if (capture is null) return;
        capture.StopRecording(); capture.Dispose();
    }
    public void Play(byte[] pcm)
    {
        if (_playback is null)
        {
            _buffer = new BufferedWaveProvider(new WaveFormat(24000, 16, 2))
            { BufferDuration = TimeSpan.FromMilliseconds(300), DiscardOnBufferOverflow = true, ReadFully = true };
            _volume = new VolumeSampleProvider(_buffer.ToSampleProvider()) { Volume = _level };
            var player = new WasapiOut(AudioClientShareMode.Shared, false, 100);
            try { player.Init(_volume.ToWaveProvider()); player.Play(); _playback = player; }
            catch { player.Dispose(); throw; }
        }
        if (_buffer!.BufferedDuration > TimeSpan.FromMilliseconds(200)) _buffer.ClearBuffer();
        _buffer.AddSamples(pcm, 0, pcm.Length);
    }
    public void StopPlayback()
    {
        var player = _playback; _playback = null;
        player?.Stop(); player?.Dispose(); _buffer = null; _volume = null;
    }
    public void Dispose() { StopCapture(); StopPlayback(); }
}
