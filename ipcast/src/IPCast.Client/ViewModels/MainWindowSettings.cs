using CommunityToolkit.Mvvm.ComponentModel;
using System.Reflection;

namespace IPCast.Client.ViewModels;

public partial class MainWindowViewModel
{
    [ObservableProperty] private string _recordingDirectory = "";
    [ObservableProperty] private bool _automaticRecording;
    [ObservableProperty] private bool _automaticReconnect = true;
    [ObservableProperty] private bool _checkUpdatesOnStartup = true;
    [ObservableProperty] private string _updateStatus = "";
    partial void OnCheckUpdatesOnStartupChanged(bool value) => SavePreferences();
    partial void OnRecordingDirectoryChanged(string value) => SavePreferences();
    partial void OnAutomaticRecordingChanged(bool value) => SavePreferences();
    partial void OnAutomaticReconnectChanged(bool value) => SavePreferences();
    public bool ShowRecordingSettings => SettingMatches("recording", "video", "directory", "automatic");
    public bool ShowDiagnosticsSettings => SettingMatches("advanced", "logs", "diagnostics", "about", "version");
    public string VersionLabel => "IPCast " + (Assembly.GetEntryAssembly()?.GetName().Version?.ToString(3) ?? "unknown");
    public async Task CheckForUpdateAsync()
    {
        if (!CheckUpdatesOnStartup) return;
        try
        {
            using var updater = new IPCast.Network.GitHubUpdater();
            var version = Assembly.GetEntryAssembly()?.GetName().Version ?? new Version(2, 2, 0);
            using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(15));
            var update = await updater.CheckAsync(new Version(version.Major, version.Minor, version.Build), timeout.Token);
            UpdateStatus = update is null ? "IPCast is up to date." : $"IPCast {update.Version} is available. Open Settings → Check for updates to review and install.";
        }
        catch (Exception) { UpdateStatus = "Automatic update check unavailable. You can retry from Settings."; }
    }
}
