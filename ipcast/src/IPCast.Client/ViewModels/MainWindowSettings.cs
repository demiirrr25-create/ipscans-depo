using CommunityToolkit.Mvvm.ComponentModel;
using System.Reflection;

namespace IPCast.Client.ViewModels;

public partial class MainWindowViewModel
{
    [ObservableProperty] private string _recordingDirectory = "";
    [ObservableProperty] private bool _automaticRecording;
    [ObservableProperty] private bool _automaticReconnect = true;
    partial void OnRecordingDirectoryChanged(string value) => SavePreferences();
    partial void OnAutomaticRecordingChanged(bool value) => SavePreferences();
    partial void OnAutomaticReconnectChanged(bool value) => SavePreferences();
    public bool ShowRecordingSettings => SettingMatches("recording", "video", "directory", "automatic");
    public bool ShowDiagnosticsSettings => SettingMatches("advanced", "logs", "diagnostics", "about", "version");
    public string VersionLabel => "IPCast " + (Assembly.GetEntryAssembly()?.GetName().Version?.ToString(3) ?? "unknown");
}
