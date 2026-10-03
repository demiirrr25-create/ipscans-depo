using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using IPCast.Client.Persistence;

namespace IPCast.Client.ViewModels;

public partial class MainWindowViewModel
{
    [ObservableProperty] private string _deviceQuery = "";
    [ObservableProperty] private string _selectedDeviceGroup = "All groups";
    [ObservableProperty] private string _deviceSort = "Name";
    [ObservableProperty] private string _settingsCategory = "General";
    [ObservableProperty] private string _theme = "Dark";
    [ObservableProperty] private bool _openAddressBookOnStartup;
    [ObservableProperty] private bool _preventDisplaySleep = true;
    [ObservableProperty] private bool _showConnectionOptions;
    [ObservableProperty] private string _newFavoriteGroup = "Personal";
    [ObservableProperty] private string _newFavoriteTags = "";
    [ObservableProperty] private string _remoteOneTimeCode = "";
    public bool IsTwoFactorEnabled => _unattendedAccessStore.GetStatus().TwoFactorEnabled;
    public void EnableTwoFactor(string secret, string code) { _unattendedAccessStore.EnableTwoFactor(secret, code); UnattendedAccessMessage = "Two-factor authentication enabled. Use the next authenticator code to connect."; }
    public void DisableTwoFactor(string password) { _unattendedAccessStore.DisableTwoFactor(password); UnattendedAccessMessage = "Two-factor authentication disabled."; }
    [ObservableProperty] private string _interactiveAccess = "Always ask";
    [ObservableProperty] private int _sessionIdleMinutes;
    public IReadOnlyList<string> InteractiveAccessModes { get; } = ["Always ask", "Only when window is visible", "Unattended access only"];
    public IReadOnlyList<int> IdleTimeoutOptions { get; } = [0, 5, 15, 30, 60];
    partial void OnInteractiveAccessChanged(string value) => SavePreferences();
    partial void OnSessionIdleMinutesChanged(int value) => SavePreferences();
    public IReadOnlyList<string> Themes { get; } = ["Dark", "Light", "System"];
    public IReadOnlyList<string> DeviceSortOptions { get; } = ["Name", "Recently connected", "ID"];
    public IReadOnlyList<string> SettingsCategories { get; } = ["General", "Connection", "Access", "Display", "Clipboard", "Recording", "Security", "About"];
    public ObservableCollection<FavoriteDevice> FilteredDevices { get; } = [];
    public ObservableCollection<string> DeviceGroups { get; } = ["All groups"];
    public bool HasFilteredDevices => FilteredDevices.Count > 0;
    public string DeviceCountLabel => $"{FilteredDevices.Count} of {FavoriteDevices.Count} devices";
    public string WorkspaceTitle => SelectedNav switch
    {
        NavSection.Home => "New session", NavSection.MyDevices => "Address book",
        NavSection.RecentConnections => "Recent sessions", NavSection.FileTransfer => "File transfer",
        NavSection.Settings => "Settings / " + SettingsCategory, _ => "Help"
    };
    public void Navigate(NavSection section)
    {
        SelectedNavItem = NavItems.First(n => n.Section == section);
        SelectedNav = section;
    }
    partial void OnSelectedNavChanged(NavSection value) => OnPropertyChanged(nameof(WorkspaceTitle));
    partial void OnDeviceQueryChanged(string value) => RefreshDeviceFilter();
    partial void OnSelectedDeviceGroupChanged(string value) => RefreshDeviceFilter();
    partial void OnDeviceSortChanged(string value) => RefreshDeviceFilter();
    partial void OnSettingsCategoryChanged(string value)
    {
        OnSettingsQueryChanged(SettingsQuery);
        OnPropertyChanged(nameof(WorkspaceTitle));
    }
    partial void OnThemeChanged(string value) { MonochromeTheme.Apply(value); SavePreferences(); }
    partial void OnOpenAddressBookOnStartupChanged(bool value) => SavePreferences();
    partial void OnPreventDisplaySleepChanged(bool value) => SavePreferences();
    public void RefreshDeviceFilter()
    {
        var groups = FavoriteDevices.Select(d => d.Group).Distinct(StringComparer.OrdinalIgnoreCase).Order().ToArray();
        var selected = SelectedDeviceGroup;
        if (!DeviceGroups.Skip(1).SequenceEqual(groups))
        {
            DeviceGroups.Clear(); DeviceGroups.Add("All groups");
            foreach (var group in groups) DeviceGroups.Add(group);
            SelectedDeviceGroup = DeviceGroups.Contains(selected) ? selected : "All groups";
        }
        var query = DeviceQuery?.Trim() ?? "";
        var devices = FavoriteDevices.Where(d => (SelectedDeviceGroup == "All groups" || d.Group == SelectedDeviceGroup) &&
            (query.Length == 0 || $"{d.Name} {d.DeviceId} {d.FormattedId} {d.Group} {d.Tags} {d.Notes}".Contains(query, StringComparison.OrdinalIgnoreCase)));
        devices = DeviceSort switch
        {
            "Recently connected" => devices.OrderByDescending(d => d.LastConnectedUtc),
            "ID" => devices.OrderBy(d => d.DeviceId),
            _ => devices.OrderBy(d => d.Name, StringComparer.OrdinalIgnoreCase)
        };
        FilteredDevices.Clear(); foreach (var device in devices) FilteredDevices.Add(device);
        OnPropertyChanged(nameof(HasFilteredDevices)); OnPropertyChanged(nameof(DeviceCountLabel));
    }
    public void UpdateDeviceDetails(FavoriteDevice device, string group, string tags, string notes)
    {
        _favoritesStore.SetDetails(device.DeviceId, group, tags, notes);
        ReloadDevices();
    }
    public string ExportDevices() => _favoritesStore.Export();
    public int ImportDevices(string json) { var count = _favoritesStore.Import(json); ReloadDevices(); return count; }
    public void ReloadDevices()
    {
        FavoriteDevices.Clear(); foreach (var device in _favoritesStore.GetAll()) FavoriteDevices.Add(device);
        RefreshDashboardFavoriteDevices();
    }
}
