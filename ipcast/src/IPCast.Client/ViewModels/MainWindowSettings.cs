using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
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
    public string VersionLabel => "IPCast " + (typeof(MainWindowViewModel).Assembly.GetName().Version?.ToString(3) ?? "unknown");

    public bool IsLightTheme => MonochromeTheme.IsLightTheme(Theme);
    public bool IsDarkTheme => !IsLightTheme;
    public string ThemeToggleTooltip => IsLightTheme ? "Switch to Dark Mode" : "Switch to Light Mode";

    public bool IsDarkModeSelected
    {
        get => string.Equals(Theme, "Dark", StringComparison.OrdinalIgnoreCase);
        set { if (value) Theme = "Dark"; }
    }

    public bool IsLightModeSelected
    {
        get => string.Equals(Theme, "Light", StringComparison.OrdinalIgnoreCase);
        set { if (value) Theme = "Light"; }
    }

    public bool IsSystemModeSelected
    {
        get => string.Equals(Theme, "System", StringComparison.OrdinalIgnoreCase);
        set { if (value) Theme = "System"; }
    }

    [RelayCommand]
    private void ToggleTheme()
    {
        var currentlyLight = MonochromeTheme.IsLightTheme(Theme);
        Theme = currentlyLight ? "Dark" : "Light";
    }

    public async Task CheckForUpdateAsync()
    {
        if (!CheckUpdatesOnStartup) return;
        try
        {
            using var updater = new IPCast.Network.GitHubUpdater();
            var version = Assembly.GetEntryAssembly()?.GetName().Version ?? new Version(2, 7, 0);
            using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(15));
            var update = await updater.CheckAsync(new Version(version.Major, version.Minor, version.Build), timeout.Token);
            UpdateStatus = update is null ? "IPCast is up to date." : $"IPCast {update.Version} is available. Open Settings → Check for updates to review and install.";
        }
        catch (Exception) { UpdateStatus = "Automatic update check unavailable. You can retry from Settings."; }
    }
}
