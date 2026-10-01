using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using IPCast.Client.Persistence;
using IPCast.Network;
using IPCast.RemoteDesktop;
using IPCast.RemoteDesktop.Capture;
using IPCast.RemoteDesktop.Input;
using IPCast.Security;
using IPCast.Shared;
using Microsoft.Win32;

namespace IPCast.Client.ViewModels;

public partial class MainWindowViewModel : ObservableObject
{
    private const ConnectionPermissions DefaultRequestedPermissions =
        ConnectionPermissions.ViewScreen | ConnectionPermissions.ControlMouse |
        ConnectionPermissions.ControlKeyboard | ConnectionPermissions.Clipboard;

    private readonly DeviceId _localDeviceId;
    private readonly UnattendedAccessStore _unattendedAccessStore;
    private readonly ConnectionHistoryStore _historyStore;
    private readonly FavoriteDevicesStore _favoritesStore;
    private readonly IPCastSettingsStore _settingsStore;
    private IPCastSettings _settings = IPCastSettings.Default;

    private const string StartupRegistryKey = @"Software\Microsoft\Windows\CurrentVersion\Run";
    private const string StartupRegistryValue = "IPCast";

    [ObservableProperty]
    private string _remoteIdInput = string.Empty;

    [ObservableProperty]
    private string _remotePasswordInput = string.Empty;

    [ObservableProperty]
    private string _statusMessage = string.Empty;

    [ObservableProperty]
    private bool _isConnecting;

    [ObservableProperty]
    private NavSection _selectedNav = NavSection.Home;

    [ObservableProperty]
    private NavItem _selectedNavItem;

    [ObservableProperty]
    private bool _isUnattendedAccessEnabled;

    [ObservableProperty]
    private string _unattendedAccessPasswordInput = string.Empty;

    [ObservableProperty]
    private string _unattendedAccessMessage = string.Empty;

    [ObservableProperty]
    private string _newFavoriteName = string.Empty;

    [ObservableProperty]
    private string _newFavoriteIdInput = string.Empty;

    [ObservableProperty]
    private string _favoritesMessage = string.Empty;

    [ObservableProperty]
    private StreamQuality _selectedQuality = StreamQuality.Auto;

    [ObservableProperty]
    private FrameRateOption _selectedFrameRate = FrameRateOption.All[0];

    [ObservableProperty]
    private bool _launchAtStartup;

    [ObservableProperty]
    private string _settingsMessage = string.Empty;

    public MainWindowViewModel()
        : this(new DeviceIdentityStore(), new DeviceCertificateStore(), new UnattendedAccessStore(),
              new ConnectionHistoryStore(), new FavoriteDevicesStore(), new IPCastSettingsStore())
    {
    }

    public MainWindowViewModel(
        DeviceIdentityStore identityStore,
        DeviceCertificateStore certificateStore,
        UnattendedAccessStore unattendedAccessStore,
        ConnectionHistoryStore historyStore,
        FavoriteDevicesStore favoritesStore)
        : this(identityStore, certificateStore, unattendedAccessStore, historyStore, favoritesStore, new IPCastSettingsStore())
    {
    }

    public MainWindowViewModel(
        DeviceIdentityStore identityStore,
        DeviceCertificateStore certificateStore,
        UnattendedAccessStore unattendedAccessStore,
        ConnectionHistoryStore historyStore,
        FavoriteDevicesStore favoritesStore,
        IPCastSettingsStore settingsStore)
    {
        _localDeviceId = identityStore.LoadOrCreate();
        _unattendedAccessStore = unattendedAccessStore;
        _historyStore = historyStore;
        _favoritesStore = favoritesStore;
        _settingsStore = settingsStore;
        _selectedNavItem = NavItems[0];
        _isUnattendedAccessEnabled = unattendedAccessStore.GetStatus().Enabled;
        _settings = settingsStore.Load();
        _selectedQuality = _settings.Quality;
        _selectedFrameRate = FrameRateOption.All.First(option => option.FramesPerSecond == _settings.FramesPerSecond);
        _launchAtStartup = IsRegisteredForStartup();

        ConnectionHistory = new ObservableCollection<ConnectionHistoryEntry>(historyStore.GetAll());
        FavoriteDevices = new ObservableCollection<FavoriteDevice>(favoritesStore.GetAll());

        var discoveryPort = int.TryParse(Environment.GetEnvironmentVariable("IPCAST_DISCOVERY_PORT"), out var p)
            ? p
            : LanDiscoveryService.DefaultDiscoveryPort;
        NetworkService = new IPCastService(_localDeviceId, certificateStore.LoadOrCreate(), discoveryPort)
        {
            UnattendedAccessPolicy = new UnattendedAccessPolicy(unattendedAccessStore),
        };
    }

    /// <summary>Persisted connection attempts, newest first (spec §19/§27).</summary>
    public ObservableCollection<ConnectionHistoryEntry> ConnectionHistory { get; }

    /// <summary>Persisted saved devices (spec §20).</summary>
    public ObservableCollection<FavoriteDevice> FavoriteDevices { get; }

    /// <summary>Owns this device's incoming/outgoing LAN connections. The View wires up the incoming-request dialog and starts it.</summary>
    public IPCastService NetworkService { get; }

    private RemoteSession? _activeSession;
    private SessionMessageLoop? _activeSessionLoop;
    private RemoteDesktopSession? _activeDesktop;

    /// <summary>Raised (off the UI thread) when the connected peer pushes clipboard text - the View applies it to the real OS clipboard.</summary>
    public event Action<string>? PeerClipboardTextReceived;

    /// <summary>Raised when we're the viewer side of a screen-share session - the View opens the remote screen window for it.</summary>
    public event Action<RemoteDesktopSession>? RemoteDesktopSessionReady;

    public IReadOnlyList<NavItem> NavItems { get; } =
    [
        new NavItem(NavSection.Home, "Home"),
        new NavItem(NavSection.MyDevices, "My Devices"),
        new NavItem(NavSection.RecentConnections, "Recent Connections"),
        new NavItem(NavSection.Settings, "Settings"),
        new NavItem(NavSection.Help, "Help"),
    ];

    public IReadOnlyList<StreamQuality> QualityOptions { get; } = Enum.GetValues<StreamQuality>();

    public IReadOnlyList<FrameRateOption> FrameRateOptions => FrameRateOption.All;

    public bool IsLaunchAtStartupSupported => OperatingSystem.IsWindows();

    /// <summary>The grouped-by-3 display form of this device's persistent IPCast ID, e.g. "847 293 615".</summary>
    public string DeviceIdFormatted => _localDeviceId.Formatted;

    public string AppVersion => typeof(MainWindowViewModel).Assembly.GetName().Version?.ToString(3) ?? "1.0.1";

    public string VersionDisplay => $"Version {AppVersion}";

    partial void OnSelectedNavItemChanged(NavItem value)
    {
        SelectedNav = value.Section;
        StatusMessage = string.Empty;
    }

    partial void OnSelectedQualityChanged(StreamQuality value)
    {
        _settings = _settings with { Quality = value };
        SaveSettings();
    }

    partial void OnSelectedFrameRateChanged(FrameRateOption value)
    {
        _settings = _settings with { FramesPerSecond = value.FramesPerSecond };
        SaveSettings();
    }

    partial void OnLaunchAtStartupChanged(bool value)
    {
        if (!OperatingSystem.IsWindows())
        {
            SettingsMessage = "Windows startup is available on Windows only.";
            _launchAtStartup = false;
            OnPropertyChanged(nameof(LaunchAtStartup));
            return;
        }

        try
        {
            using var key = Registry.CurrentUser.CreateSubKey(StartupRegistryKey)
                ?? throw new IOException("The Windows startup registry key could not be opened.");
            if (value)
            {
                var processPath = Environment.ProcessPath
                    ?? throw new InvalidOperationException("The IPCast executable path could not be determined.");
                var command = $"\"{processPath}\"";
                if (Path.GetFileNameWithoutExtension(processPath).Equals("dotnet", StringComparison.OrdinalIgnoreCase))
                {
                    var entryAssemblyName = System.Reflection.Assembly.GetEntryAssembly()?.GetName().Name;
                    if (!string.IsNullOrWhiteSpace(entryAssemblyName))
                    {
                        var entryAssemblyPath = Path.Combine(AppContext.BaseDirectory, entryAssemblyName + ".dll");
                        command += $" \"{entryAssemblyPath}\"";
                    }
                }

                key.SetValue(StartupRegistryValue, command);
            }
            else
            {
                key.DeleteValue(StartupRegistryValue, throwOnMissingValue: false);
            }

            SettingsMessage = value ? "IPCast will start when you sign in to Windows." : "Windows startup is disabled.";
        }
        catch (Exception ex) when (ex is UnauthorizedAccessException or IOException or InvalidOperationException)
        {
            _launchAtStartup = !value;
            OnPropertyChanged(nameof(LaunchAtStartup));
            SettingsMessage = "Couldn't update the Windows startup setting.";
        }
    }

    private void SaveSettings()
    {
        try
        {
            _settingsStore.Save(_settings);
            SettingsMessage = "Display settings saved.";
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            SettingsMessage = "Couldn't save display settings.";
        }
    }

    private static bool IsRegisteredForStartup()
    {
        if (!OperatingSystem.IsWindows())
        {
            return false;
        }

        try
        {
            using var key = Registry.CurrentUser.OpenSubKey(StartupRegistryKey);
            return key?.GetValue(StartupRegistryValue) is string value && !string.IsNullOrWhiteSpace(value);
        }
        catch (Exception ex) when (ex is UnauthorizedAccessException or IOException)
        {
            return false;
        }
    }

    [RelayCommand]
    private async Task ConnectAsync()
    {
        if (!DeviceId.TryParse(RemoteIdInput, out var remoteId))
        {
            StatusMessage = "Enter a valid 9-digit IPCast ID.";
            return;
        }

        if (remoteId == _localDeviceId)
        {
            StatusMessage = "You can't connect to your own device.";
            return;
        }

        IsConnecting = true;
        StatusMessage = "Looking for that ID on the local network...";
        try
        {
            var result = await NetworkService.ConnectAsync(
                remoteId,
                DefaultRequestedPermissions,
                password: string.IsNullOrEmpty(RemotePasswordInput) ? null : RemotePasswordInput);
            if (result.Success)
            {
                AttachSession(result.Session!);
                RecordHistory(remoteId, "Outgoing", "Connected");
                _favoritesStore.NotifyConnected(remoteId.Raw);
                RefreshFavoriteLastConnected(remoteId.Raw);

                // Real handshake, TLS encryption, and permission negotiation, and - if ViewScreen
                // was granted - a real screen-share/remote-control session (Phase 3) opens in its
                // own window. Still no certificate pinning yet (an active man-in-the-middle isn't
                // ruled out), so say exactly that instead of overclaiming "secure".
                StatusMessage = $"Connected to {remoteId.Formatted} on the local network over TLS.";
            }
            else if (result.Rejected)
            {
                RecordHistory(remoteId, "Outgoing", "Rejected");
                StatusMessage = $"{remoteId.Formatted} rejected the connection: {result.Error}";
            }
            else
            {
                RecordHistory(remoteId, "Outgoing", "Failed");
                StatusMessage = result.Error ?? "Couldn't connect.";
            }
        }
        finally
        {
            IsConnecting = false;
        }
    }

    public void NotifyIdCopied()
    {
        StatusMessage = "ID copied to clipboard.";
    }

    private void RecordHistory(DeviceId remoteId, string direction, string status)
    {
        var entry = new ConnectionHistoryEntry(DateTimeOffset.UtcNow, remoteId.Formatted, direction, status);
        _historyStore.Add(entry);
        ConnectionHistory.Insert(0, entry);
    }

    [RelayCommand]
    private void ClearHistory()
    {
        _historyStore.Clear();
        ConnectionHistory.Clear();
    }

    [RelayCommand]
    private void AddFavorite()
    {
        if (!DeviceId.TryParse(NewFavoriteIdInput, out var deviceId))
        {
            FavoritesMessage = "Enter a valid 9-digit IPCast ID.";
            return;
        }

        var name = string.IsNullOrWhiteSpace(NewFavoriteName) ? deviceId.Formatted : NewFavoriteName.Trim();
        _favoritesStore.Add(name, deviceId.Raw);

        var existing = FavoriteDevices.FirstOrDefault(d => d.DeviceId == deviceId.Raw);
        if (existing is not null)
        {
            FavoriteDevices.Remove(existing);
        }

        FavoriteDevices.Add(new FavoriteDevice(name, deviceId.Raw, LastConnectedUtc: null));
        NewFavoriteName = string.Empty;
        NewFavoriteIdInput = string.Empty;
        FavoritesMessage = $"Saved {name}.";
    }

    [RelayCommand]
    private void RemoveFavorite(FavoriteDevice favorite)
    {
        _favoritesStore.Remove(favorite.DeviceId);
        FavoriteDevices.Remove(favorite);
    }

    [RelayCommand]
    private async Task ConnectToFavoriteAsync(FavoriteDevice favorite)
    {
        RemoteIdInput = favorite.DeviceId;
        SelectedNav = NavSection.Home;
        SelectedNavItem = NavItems[0];
        await ConnectAsync();
    }

    private void RefreshFavoriteLastConnected(string deviceId)
    {
        var existing = FavoriteDevices.FirstOrDefault(d => d.DeviceId == deviceId);
        if (existing is not null)
        {
            var index = FavoriteDevices.IndexOf(existing);
            FavoriteDevices[index] = existing with { LastConnectedUtc = DateTimeOffset.UtcNow };
        }
    }

    [RelayCommand]
    private void EnableUnattendedAccess()
    {
        try
        {
            _unattendedAccessStore.Enable(UnattendedAccessPasswordInput);
            IsUnattendedAccessEnabled = true;
            UnattendedAccessPasswordInput = string.Empty;
            UnattendedAccessMessage = "Unattended access is ON. This device can now be reached with its ID and this password, without anyone here clicking Accept.";
        }
        catch (ArgumentException ex)
        {
            UnattendedAccessMessage = ex.Message;
        }
    }

    [RelayCommand]
    private void DisableUnattendedAccess()
    {
        _unattendedAccessStore.Disable();
        IsUnattendedAccessEnabled = false;
        UnattendedAccessMessage = "Unattended access is off.";
    }

    /// <summary>Called by the View when the host side accepts an incoming connection (spec §21 Accept flow).</summary>
    public void OnSessionEstablished(RemoteSession session)
    {
        AttachSession(session);
        RecordHistory(session.RemoteDeviceId, "Incoming", "Connected");
        StatusMessage = $"{session.RemoteDeviceId.Formatted} connected over TLS. Clipboard sync is live.";
    }

    private void AttachSession(RemoteSession session)
    {
        // Phase 8 keeps this to one active session at a time; a real session manager (multiple
        // simultaneous connections, explicit disconnect) is a later refinement, not this phase's goal.
        _activeSession = session;
        var loop = new SessionMessageLoop(session);
        loop.ClipboardTextReceived += text => PeerClipboardTextReceived?.Invoke(text);
        loop.Start();
        _activeSessionLoop = loop;

        if (!session.GrantedPermissions.HasFlag(ConnectionPermissions.ViewScreen))
        {
            return;
        }

        var desktop = new RemoteDesktopSession(loop, session);
        _activeDesktop = desktop;

        if (session.IsInitiator)
        {
            // We pressed Connect: we're the viewer. The View opens a window and renders frames.
            RemoteDesktopSessionReady?.Invoke(desktop);
        }
        else
        {
            // We accepted the incoming request and granted ViewScreen: share this screen.
            var (capturer, injector) = CreateSharingBackend();
            var settings = _settingsStore.Load();
            var framesPerSecond = settings.FramesPerSecond == 0 ? 15 : settings.FramesPerSecond;
            var jpegQuality = settings.Quality switch
            {
                StreamQuality.Low => 40,
                StreamQuality.Medium or StreamQuality.Auto => 65,
                StreamQuality.High => 85,
                _ => 65,
            };
            desktop.StartSharing(capturer, injector, TimeSpan.FromSeconds(1d / framesPerSecond), jpegQuality);
        }
    }

    private static (IScreenCapturer Capturer, IInputInjector Injector) CreateSharingBackend()
    {
        // IPCAST_FAKE_CAPTURE exists purely so this pipeline can be developed/demoed on non-Windows
        // (this dev sandbox included) - never set on a real end-user Windows install.
        if (Environment.GetEnvironmentVariable("IPCAST_FAKE_CAPTURE") == "1")
        {
            return (new TestPatternScreenCapturer(), new RecordingInputInjector());
        }

        if (!OperatingSystem.IsWindows())
        {
            throw new PlatformNotSupportedException(
                "Real screen sharing requires Windows. Set IPCAST_FAKE_CAPTURE=1 for local development on other platforms.");
        }

        return (new GdiScreenCapturer(), new SendInputInjector());
    }

    /// <summary>Pushes locally-copied clipboard text to the connected peer, if any (spec §8).</summary>
    public Task PushLocalClipboardTextAsync(string text) =>
        _activeSessionLoop?.SendClipboardTextAsync(text) ?? Task.CompletedTask;
}
