using Avalonia.Interactivity;
using Avalonia.Threading;
using IPCast.RemoteDesktop;

namespace IPCast.Client.Views;
public partial class RemoteScreenWindow
{
    private SessionAudio? _audio;
    private bool _audioRequested;
    public void ConfigureAudio(SessionAudio audio)
    {
        _audio = audio;
        AudioButton.IsVisible = true; AudioVolume.IsVisible = true;
        AudioVolume.ValueChanged += (_, _) => { try { audio.SetVolume((float)AudioVolume.Value / 100); } catch (Exception ex) { Title = "IPCast — " + ex.Message; } };
        audio.StateChanged += OnAudioState;
        Closed += (_, _) => audio.StateChanged -= OnAudioState;
    }
    private void OnAudioState(bool enabled, string? error) => Dispatcher.UIThread.Post(() =>
    {
        if (_closed) return;
        _audioRequested = enabled; AudioButton.Content = enabled ? "Audio on · mute" : "Audio off · enable";
        if (error is not null) Title = "IPCast — " + error;
    });
    private async void OnAudioClick(object? sender, RoutedEventArgs e)
    {
        if (_audio is null) return;
        try
        {
            _audioRequested = !_audioRequested;
            await _audio.SetEnabledAsync(_audioRequested);
            AudioButton.Content = _audioRequested ? "Enabling audio…" : "Audio off · enable";
        }
        catch (Exception ex) { _audioRequested = false; Title = "IPCast — " + ex.Message; }
    }
}
