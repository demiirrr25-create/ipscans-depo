using System.Runtime.InteropServices;
using Avalonia.Interactivity;
using Avalonia.Platform.Storage;
using Avalonia.Threading;

namespace IPCast.Client.Views;

public partial class RemoteScreenWindow
{
    private bool _inputPaused;
    private async void OnQualitySelectionChanged(object? sender, Avalonia.Controls.SelectionChangedEventArgs e)
    {
        if (_desktop is null || QualitySelector.SelectedItem is not string profile) return;
        QualitySelector.IsEnabled = false;
        try { await _desktop.SetStreamingQualityAsync(profile); SessionStatusText.Text = "Stream quality: " + profile; }
        catch (TimeoutException) { SessionStatusText.Text = "Live quality needs IPCast 2.5 on the remote device."; }
        catch (Exception ex) { SessionStatusText.Text = "Quality change failed: " + ex.Message; }
        finally { QualitySelector.IsEnabled = true; }
    }
    private readonly DispatcherTimer _keepAwakeTimer = new() { Interval = TimeSpan.FromSeconds(30) };
    public void ConfigurePower(bool preventSleep)
    {
        if (!preventSleep || !OperatingSystem.IsWindows()) return;
        // Reset the idle timer without changing the user's power policy or leaving a persistent request.
        _keepAwakeTimer.Tick += (_, _) => SetThreadExecutionState(0x00000001 | 0x00000002);
        SetThreadExecutionState(0x00000001 | 0x00000002);
        _keepAwakeTimer.Start();
        Closed += (_, _) => _keepAwakeTimer.Stop();
    }
    [DllImport("kernel32.dll")] private static extern uint SetThreadExecutionState(uint flags);

    public void ConfigureIdleTimeout(int minutes)
    {
        if (minutes <= 0) return;
        var lastInput = Environment.TickCount64;
        var timer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(10) };
        PointerMoved += (_, _) => lastInput = Environment.TickCount64;
        KeyDown += (_, _) => lastInput = Environment.TickCount64;
        timer.Tick += (_, _) => { if (Environment.TickCount64 - lastInput >= TimeSpan.FromMinutes(minutes).TotalMilliseconds) Close(); };
        timer.Start(); Closed += (_, _) => timer.Stop();
    }

    private async void OnToggleInputClick(object? sender, RoutedEventArgs e)
    {
        _inputPaused = !_inputPaused;
        await ReleaseInputAsync();
        InputToggleButton.Content = _inputPaused ? "Resume remote control" : "Pause remote control";
        SessionStatusText.Text = _inputPaused ? "View only · remote control paused" : "TLS encrypted";
    }

    private async void OnScreenshotClick(object? sender, RoutedEventArgs e)
    {
        if (_bitmap is null) { SessionStatusText.Text = "Waiting for the first screen frame"; return; }
        // Capture before opening a modal picker, which continues processing new video frames.
        using var png = new MemoryStream();
        _bitmap.Save(png, Avalonia.Media.Imaging.PngBitmapEncoderOptions.Default);
        try
        {
            var file = await StorageProvider.SaveFilePickerAsync(new FilePickerSaveOptions
            {
                Title = "Save remote screenshot", SuggestedFileName = $"IPCast-{DateTime.Now:yyyyMMdd-HHmmss}.png",
                DefaultExtension = "png", ShowOverwritePrompt = true,
                FileTypeChoices = [new FilePickerFileType("PNG image") { Patterns = ["*.png"] }]
            });
            if (file is null) return;
            await using var stream = await file.OpenWriteAsync(); stream.SetLength(0);
            png.Position = 0; await png.CopyToAsync(stream);
            SessionStatusText.Text = "Screenshot saved";
        }
        catch (Exception ex) { SessionStatusText.Text = "Screenshot failed: " + ex.Message; }
    }
}
