using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using IPCast.Client.Persistence;
using IPCast.FileTransfer;
using IPCast.Network;
using IPCast.RemoteDesktop;
using IPCast.RemoteDesktop.Capture;
using IPCast.RemoteDesktop.Input;
using IPCast.Security;
using IPCast.Shared;
using Avalonia.Threading;
using Microsoft.Win32;

namespace IPCast.Client.ViewModels;

public partial class MainWindowViewModel : ObservableObject
{
    private const string StartupRegistryKey = @"Software\Microsoft\Windows\CurrentVersion\Run";
    private const string StartupRegistryValue = "IPCast";

    private const ConnectionPermissions DefaultRequestedPermissions =
        ConnectionPermissions.ViewScreen | ConnectionPermissions.ControlMouse |
        ConnectionPermissions.ControlKeyboard | ConnectionPermissions.Clipboard | ConnectionPermissions.FileTransfer | ConnectionPermissions.Chat;

    private readonly PreferencesStore _preferencesStore = new();
    private CancellationTokenSource? _connectCts;
    private CancellationTokenSource? _transferCts;
    [ObservableProperty] private bool _isConnected;
    [ObservableProperty] private bool _isPeerRecording;
    [ObservableProperty] private bool _isChatAvailable;
    private SessionChat? _activeChat;
    private FileManagerSession? _fileManager;
    private TunnelSession? _tunnels;
    public SessionTools? Tools { get; private set; }
    public SessionAudio? Audio { get; private set; }
    [ObservableProperty] private bool _isSystemAudioShared;
    public Func<Task<bool>>? OnRestartRequested { get; set; }
    public event Action<TunnelSession>? TunnelsReady;
    [ObservableProperty] private bool _isTunnelAvailable;
    [ObservableProperty] private bool _isFileManagerAvailable;
    public IReadOnlyList<string> PermissionProfileNames => PermissionProfiles.Names;
    [ObservableProperty] private string _selectedPermissionProfile = "Full access";
    public ObservableCollection<DiscoveredDevice> DiscoveredDevices { get; } = [];
    private bool _discovering;
    public async Task RefreshDiscoveredDevicesAsync()
    {
        if (_discovering) return;
        _discovering = true;
        try
        {
            var devices = await LanDiscoveryService.DiscoverAllAsync(TimeSpan.FromSeconds(2));
            DiscoveredDevices.Clear();
            foreach (var device in devices.Where(d => d.DeviceId != _localDeviceId.Raw)) DiscoveredDevices.Add(device);
        }
        catch (Exception ex) when (ex is System.Net.Sockets.SocketException or OperationCanceledException) { }
        finally { _discovering = false; }
    }
    [RelayCommand]
    private async Task ConnectDiscoveredAsync(DiscoveredDevice device)
    {
        RemoteIdInput = device.DeviceId;
        await ConnectAsync();
    }
    public event Action<FileManagerSession>? FileManagerReady;
    [ObservableProperty] private string _localConnectionInfo = "Starting local listener...";
    public FileOfferHandler? OnFileOffered { get; set; }
    public Func<string, string, string?, Task<bool>>? OnTrustRequested { get; set; }
    public string CertificateFingerprint { get; }

    private readonly DeviceId _localDeviceId;
    private readonly UnattendedAccessStore _unattendedAccessStore;
    private readonly ConnectionHistoryStore _historyStore;
    private readonly FavoriteDevicesStore _favoritesStore;

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
    private string _selectedFilePath = string.Empty;

    [ObservableProperty]
    private string _fileTransferMessage = string.Empty;

    [ObservableProperty]
    private double _fileTransferProgress;

    [ObservableProperty]
    private bool _isTransferringFile;

    [ObservableProperty]
    private string _relayServerMessage = "Connecting automatically to IPCast relay...";

    [ObservableProperty]
    private bool _isClipboardSyncEnabled = true;

    [ObservableProperty]
    private string _settingsQuery = string.Empty;
    private bool _launchAtStartup;
    public bool LaunchAtStartup
    {
        get => _launchAtStartup;
        set
        {
            if (SetProperty(ref _launchAtStartup, value))
            {
                UpdateLaunchAtStartup(value);
            }
        }
    }
    public IReadOnlyList<string> StreamingModes { get; } = ["Auto", "Balanced", "Speed", "Quality"];
    [ObservableProperty] private string _streamingMode = "Balanced";
    partial void OnStreamingModeChanged(string value) => SavePreferences();
    public bool IsLaunchAtStartupSupported => OperatingSystem.IsWindows();

    public MainWindowViewModel()
        : this(new DeviceIdentityStore(), new DeviceCertificateStore(), new UnattendedAccessStore(),
              new ConnectionHistoryStore(), new FavoriteDevicesStore())
    {
    }

    public MainWindowViewModel(
        DeviceIdentityStore identityStore,
        DeviceCertificateStore certificateStore,
        UnattendedAccessStore unattendedAccessStore,
        ConnectionHistoryStore historyStore,
        FavoriteDevicesStore favoritesStore)
    {
        _localDeviceId = identityStore.LoadOrCreate();
        _unattendedAccessStore = unattendedAccessStore;
        _historyStore = historyStore;
        _favoritesStore = favoritesStore;
        _selectedNavItem = NavItems[0];
        _isUnattendedAccessEnabled = unattendedAccessStore.GetStatus().Enabled;

        ConnectionHistory = new ObservableCollection<ConnectionHistoryEntry>(historyStore.GetAll());
        FavoriteDevices = new ObservableCollection<FavoriteDevice>(favoritesStore.GetAll());
        DashboardRecentConnections = new ObservableCollection<ConnectionHistoryEntry>(ConnectionHistory.Take(4));
        DashboardFavoriteDevices = new ObservableCollection<FavoriteDevice>(FavoriteDevices.Take(4));

        var discoveryPort = int.TryParse(Environment.GetEnvironmentVariable("IPCAST_DISCOVERY_PORT"), out var p)
            ? p
            : LanDiscoveryService.DefaultDiscoveryPort;
        var certificate = certificateStore.LoadOrCreate();
        CertificateFingerprint = certificate.GetCertHashString(System.Security.Cryptography.HashAlgorithmName.SHA256);
        NetworkService = new IPCastService(_localDeviceId, certificate, discoveryPort)
        {
            UnattendedAccessPolicy = new UnattendedAccessPolicy(unattendedAccessStore),
        };
        var trustedDevices = new TrustedDevicesStore();
        NetworkService.VerifyPeerCertificateAsync = async (device, fingerprint) => {
            var saved = trustedDevices.GetFingerprint(device);
            if (string.Equals(saved, fingerprint, StringComparison.Ordinal)) return true;
            if (OnTrustRequested is null || !await OnTrustRequested(device, fingerprint, saved)) return false;
            trustedDevices.Remember(device, fingerprint);
            return true;
        };
        var preferences = _preferencesStore.Load();
        _isClipboardSyncEnabled = preferences.ClipboardSync;
        _recordingDirectory = preferences.RecordingDirectory;
        _automaticRecording = preferences.AutomaticRecording;
        _automaticReconnect = preferences.AutomaticReconnect;
        _checkUpdatesOnStartup = preferences.CheckUpdatesOnStartup;
        _streamingMode = StreamingModes.Contains(preferences.StreamingMode) ? preferences.StreamingMode : "Balanced";
        _launchAtStartup = IsRegisteredForStartup();
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("IPCAST_RELAY_SERVER")))
        {
            NetworkService.RelayServerAddress = new RelayAddress(null, new Uri(Preferences.DefaultRelayAddress));
        }
        NetworkService.RelayStatusChanged += message => Dispatcher.UIThread.Post(() => RelayServerMessage = message);
    }

    partial void OnIsClipboardSyncEnabledChanged(bool value) => SavePreferences();
    private void SavePreferences()
    {
        try { _preferencesStore.Save(new Preferences(ClipboardSync: IsClipboardSyncEnabled, StreamingMode: StreamingMode, LaunchAtStartup: LaunchAtStartup,
            RecordingDirectory: RecordingDirectory, AutomaticRecording: AutomaticRecording, AutomaticReconnect: AutomaticReconnect,
            CheckUpdatesOnStartup: CheckUpdatesOnStartup)); }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException) { StatusMessage = $"Couldn't save settings: {ex.Message}"; }
    }

    private static bool IsRegisteredForStartup()
    {
        if (!OperatingSystem.IsWindows()) return false;
        try
        {
            using var key = Registry.CurrentUser.OpenSubKey(StartupRegistryKey);
            return !string.IsNullOrWhiteSpace(key?.GetValue(StartupRegistryValue) as string);
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or System.Security.SecurityException)
        {
            return false;
        }
    }

    private void UpdateLaunchAtStartup(bool enabled)
    {
        if (!OperatingSystem.IsWindows())
        {
            _launchAtStartup = false;
            OnPropertyChanged(nameof(LaunchAtStartup));
            return;
        }

        try
        {
            using var key = Registry.CurrentUser.CreateSubKey(StartupRegistryKey)
                ?? throw new IOException("The Windows startup registry key could not be opened.");
            if (enabled)
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

            SavePreferences();
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or System.Security.SecurityException or InvalidOperationException)
        {
            _launchAtStartup = !enabled;
            OnPropertyChanged(nameof(LaunchAtStartup));
            StatusMessage = $"Couldn't update Windows startup: {ex.Message}";
        }
    }

    /// <summary>Persisted connection attempts, newest first (spec §19/§27).</summary>
    public ObservableCollection<ConnectionHistoryEntry> ConnectionHistory { get; }

    /// <summary>Persisted saved devices (spec §20).</summary>
    public ObservableCollection<FavoriteDevice> FavoriteDevices { get; }

    public ObservableCollection<ConnectionHistoryEntry> DashboardRecentConnections { get; }

    public ObservableCollection<FavoriteDevice> DashboardFavoriteDevices { get; }

    /// <summary>Owns this device's incoming/outgoing LAN connections. The View wires up the incoming-request dialog and starts it.</summary>
    public IPCastService NetworkService { get; }

    private RemoteSession? _activeSession;
    private SessionMessageLoop? _activeSessionLoop;
    private RemoteDesktopSession? _activeDesktop;

    /// <summary>Raised (off the UI thread) when the connected peer pushes clipboard text - the View applies it to the real OS clipboard.</summary>
    public event Action<string>? PeerClipboardTextReceived;

    /// <summary>Raised when we're the viewer side of a screen-share session - the View opens the remote screen window for it.</summary>
    public event Action<RemoteDesktopSession>? RemoteDesktopSessionReady;
    public event Action<SessionChat>? SessionChatReady;

    public IReadOnlyList<NavItem> NavItems { get; } =
    [
        new NavItem(NavSection.Home, "Home"),
        new NavItem(NavSection.FileTransfer, "File Transfer"),
        new NavItem(NavSection.MyDevices, "My Devices"),
        new NavItem(NavSection.RecentConnections, "Recent Connections"),
        new NavItem(NavSection.Settings, "Settings"),
        new NavItem(NavSection.Help, "Help"),
    ];

    /// <summary>The grouped-by-3 display form of this device's persistent IPCast ID, e.g. "847 293 615".</summary>
    public string DeviceIdFormatted => _localDeviceId.Formatted;

    // ---- Live dashboard status (spec §2) ----

    partial void OnIsConnectedChanged(bool value) => OnPropertyChanged(nameof(DeviceStatusText));
    partial void OnIsConnectingChanged(bool value) => OnPropertyChanged(nameof(DeviceStatusText));

    /// <summary>Human status shown under the IPCast ID card — never fakes remote presence.</summary>
    public string DeviceStatusText => IsConnecting
        ? "Connecting…"
        : IsConnected ? "Secure session active" : "Ready for secure connections";

    // ---- Live remote-ID validation (spec §2) ----

    partial void OnRemoteIdInputChanged(string value)
    {
        OnPropertyChanged(nameof(RemoteIdValidationMessage));
        OnPropertyChanged(nameof(HasRemoteIdValidationMessage));
    }

    public bool HasRemoteIdValidationMessage => !string.IsNullOrEmpty(RemoteIdValidationMessage);

    /// <summary>Inline hint shown while typing a remote ID; empty when the input is valid or blank.</summary>
    public string RemoteIdValidationMessage
    {
        get
        {
            var value = RemoteIdInput?.Trim() ?? string.Empty;
            if (value.Length == 0) return string.Empty;
            if (DeviceId.TryParse(value, out _)) return string.Empty;
            if (IPCastService.TryParseEndpoint(value, defaultPort: 0, out _)) return string.Empty;

            var digits = value.Count(char.IsDigit);
            if (!value.Contains(':') && digits > 0 && digits < 9)
            {
                return $"Keep typing — {digits}/9 digits.";
            }

            return "Enter a 9-digit IPCast ID or an IP:port address.";
        }
    }

    // ---- Settings search (spec §26) ----

    partial void OnSettingsQueryChanged(string value)
    {
        OnPropertyChanged(nameof(ShowGeneralSettings));
        OnPropertyChanged(nameof(ShowDisplaySettings));
        OnPropertyChanged(nameof(ShowConnectionSettings));
        OnPropertyChanged(nameof(ShowUnattendedSettings));
        OnPropertyChanged(nameof(ShowClipboardSettings));
        OnPropertyChanged(nameof(ShowSecuritySettings));
        OnPropertyChanged(nameof(HasVisibleSettings));
        OnPropertyChanged(nameof(ShowRecordingSettings));
        OnPropertyChanged(nameof(ShowDiagnosticsSettings));
    }

    private bool SettingMatches(params string[] keywords)
    {
        var query = SettingsQuery?.Trim();
        if (string.IsNullOrEmpty(query)) return true;
        return keywords.Any(k => k.Contains(query, StringComparison.OrdinalIgnoreCase));
    }

    public bool ShowGeneralSettings => SettingMatches("general", "startup", "windows", "launch", "sign in", "boot");
    public bool ShowDisplaySettings => SettingMatches("display", "performance", "quality", "speed", "balanced", "screen", "fps", "resolution");
    public bool ShowConnectionSettings => SettingMatches("connection", "relay", "internet", "network", "automatic", "server");
    public bool ShowUnattendedSettings => SettingMatches("unattended", "access", "password", "security", "remote", "login");
    public bool ShowClipboardSettings => SettingMatches("clipboard", "sync", "copy", "paste", "preferences");
    public bool ShowSecuritySettings => SettingMatches("security", "certificate", "fingerprint", "encryption", "tls", "identity", "trust");

    public bool HasVisibleSettings => ShowGeneralSettings || ShowDisplaySettings || ShowConnectionSettings
        || ShowUnattendedSettings || ShowClipboardSettings || ShowSecuritySettings || ShowRecordingSettings || ShowDiagnosticsSettings;

    partial void OnSelectedNavItemChanged(NavItem value)
    {
        SelectedNav = value.Section;
        StatusMessage = string.Empty;
    }

    [RelayCommand]
    private async Task ConnectAsync()
    {
        if (string.IsNullOrWhiteSpace(RemoteIdInput))
        {
            StatusMessage = "Enter a valid 9-digit IPCast ID or direct IP:port address.";
            return;
        }

        if (!DeviceId.TryParse(RemoteIdInput, out _) &&
            !IPCastService.TryParseEndpoint(RemoteIdInput, defaultPort: 0, out _))
        {
            StatusMessage = "Enter a valid 9-digit IPCast ID or direct IP:port address (e.g. 192.168.1.50:9876).";
            return;
        }

        IsConnecting = true;
        StatusMessage = "Connecting to remote device...";
        try
        {
            await DisconnectAsync();
            _connectCts = new CancellationTokenSource(TimeSpan.FromSeconds(45));
            var result = await NetworkService.ConnectAsync(
                RemoteIdInput.Trim(),
                PermissionProfiles.ForName(SelectedPermissionProfile),
                password: string.IsNullOrEmpty(RemotePasswordInput) ? null : RemotePasswordInput,
                ct: _connectCts.Token);

            if (result.Success)
            {
                _connectedTarget = RemoteIdInput.Trim();
                _connectedPermissions = result.Session!.GrantedPermissions;
                AttachSession(result.Session!);
                var remoteDisplay = result.Session!.RemoteDeviceId.Formatted;
                RecordHistory(result.Session!.RemoteDeviceId, "Outgoing", "Connected");
                _favoritesStore.NotifyConnected(result.Session!.RemoteDeviceId.Raw);
                RefreshFavoriteLastConnected(result.Session!.RemoteDeviceId.Raw);

                StatusMessage = $"Connected to {remoteDisplay} over TLS.";
            }
            else if (result.Rejected)
            {
                AuditLog.Default.Write(AuditEvent.AuthenticationFailed, AuditLevel.Warning);
                if (DeviceId.TryParse(RemoteIdInput, out var targetId))
                {
                    RecordHistory(targetId, "Outgoing", "Rejected");
                }
                StatusMessage = $"Connection rejected: {result.Error}";
            }
            else
            {
                if (DeviceId.TryParse(RemoteIdInput, out var targetId))
                {
                    RecordHistory(targetId, "Outgoing", "Failed");
                }
                StatusMessage = result.Error ?? "Couldn't connect.";
            }
        }
        catch (Exception ex) { StatusMessage = $"Connection failed: {ex.Message}"; }
        finally
        {
            _connectCts?.Dispose();
            _connectCts = null;
            RemotePasswordInput = string.Empty;
            IsConnecting = false;
        }
    }

    [RelayCommand] private void CancelConnect() { _connectCts?.Cancel(); _reconnectCts?.Cancel(); }

    [RelayCommand]
    private async Task DisconnectAsync()
    {
        _reconnectCts?.Cancel();
        _tunnels?.Dispose(); _tunnels = null; IsTunnelAvailable = false;
        Tools?.Dispose(); Tools = null;
        Audio?.Dispose(); Audio = null; IsSystemAudioShared = false;
        var desktopToDispose = _activeDesktop;
        _activeDesktop = null;
        var loop = _activeSessionLoop;
        _activeSessionLoop = null;
        if (loop is not null)
        {
            using var goodbye = new CancellationTokenSource(TimeSpan.FromSeconds(1));
            try { await loop.SendAsync(IPCast.Network.Protocol.MessageType.Bye, new IPCast.Network.Protocol.ByeMessage("Disconnected"), goodbye.Token); }
            catch (Exception) { }
        }
        if (_activeSession is not null) AuditLog.Default.Write(AuditEvent.ConnectionEnded, deviceId: _activeSession.RemoteDeviceId.Raw);
        IsPeerRecording = false;
        IsFileManagerAvailable = false;
        if (_fileManager is not null) { await _fileManager.DisposeAsync(); _fileManager = null; }
        IsChatAvailable = false;
        _activeChat?.Dispose();
        _activeChat = null;
        _transferCts?.Cancel();
        desktopToDispose?.Dispose();
        _activeSession?.Dispose();
        _activeSession = null;
        if (loop is not null) await loop.DisposeAsync();
        _fileReceiver?.Dispose();
        _fileReceiver = null;
        IsConnected = false;
    }

    private readonly object _shutdownGate = new();
    private Task? _shutdownTask;

    public Task ShutdownAsync()
    {
        lock (_shutdownGate)
        {
            return _shutdownTask ??= ShutdownCoreAsync();
        }
    }

    private async Task ShutdownCoreAsync()
    {
        _connectCts?.Cancel();
        await DisconnectAsync();
        await NetworkService.DisposeAsync();
    }

    public Task DisconnectDesktopAsync(RemoteDesktopSession desktop) =>
        ReferenceEquals(_activeDesktop, desktop) ? DisconnectAsync() : Task.CompletedTask;

    [RelayCommand]
    private async Task SendFileAsync()
    {
        if (_activeSession is null || _activeSessionLoop is null)
        { FileTransferMessage = "Connect to a device first."; return; }
        IsTransferringFile = true;
        _transferCts = new CancellationTokenSource();
        try
        {
            FileTransferProgress = 0;
            FileTransferMessage = "Waiting for the receiving device to accept the file...";
            var progress = new Progress<IPCast.FileTransfer.FileTransferProgress>(p => FileTransferProgress = p.FractionComplete * 100);
            var result = await new FileSender().SendFileAsync(_activeSessionLoop, _activeSession, SelectedFilePath, progress, _transferCts.Token);
            FileTransferMessage = result.Success ? "File sent." : $"File transfer failed: {result.Error}";
        }
        catch (Exception ex) { FileTransferMessage = $"File transfer failed: {ex.Message}"; }
        finally { IsTransferringFile = false; _transferCts.Dispose(); _transferCts = null; }
    }

    [RelayCommand] private void CancelTransfer() => _transferCts?.Cancel();

    public void NotifyIdCopied()
    {
        StatusMessage = "ID copied to clipboard.";
    }

    private void RecordHistory(DeviceId remoteId, string direction, string status)
    {
        var entry = new ConnectionHistoryEntry(DateTimeOffset.UtcNow, remoteId.Formatted, direction, status);
        _historyStore.Add(entry);
        ConnectionHistory.Insert(0, entry);
        RefreshDashboardRecentConnections();
    }

    [RelayCommand]
    private void ClearHistory()
    {
        _historyStore.Clear();
        ConnectionHistory.Clear();
        DashboardRecentConnections.Clear();
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
        RefreshDashboardFavoriteDevices();
        NewFavoriteName = string.Empty;
        NewFavoriteIdInput = string.Empty;
        FavoritesMessage = $"Saved {name}.";
    }

    [RelayCommand]
    private void RemoveFavorite(FavoriteDevice favorite)
    {
        _favoritesStore.Remove(favorite.DeviceId);
        FavoriteDevices.Remove(favorite);
        RefreshDashboardFavoriteDevices();
    }

    /// <summary>Renames a saved device in-place (spec §3 context menu → Rename).</summary>
    public void RenameFavorite(FavoriteDevice favorite, string newName)
    {
        newName = newName?.Trim() ?? string.Empty;
        if (newName.Length == 0 || newName == favorite.Name) return;

        _favoritesStore.Rename(favorite.DeviceId, newName);
        ReplaceFavorite(favorite, favorite with { Name = newName });
        FavoritesMessage = $"Renamed to {newName}.";
    }

    public async Task WakeFavoriteAsync(FavoriteDevice favorite, string mac)
    {
        await WakeOnLan.SendAsync(mac);
        _favoritesStore.SetMacAddress(favorite.DeviceId, mac);
        ReplaceFavorite(favorite, favorite with { MacAddress = mac });
        StatusMessage = "Wake packet sent on the local network. The device must support and enable Wake-on-LAN.";
    }

    private void ReplaceFavorite(FavoriteDevice existing, FavoriteDevice updated)
    {
        var index = FavoriteDevices.IndexOf(existing);
        if (index >= 0) FavoriteDevices[index] = updated;
        RefreshDashboardFavoriteDevices();
    }

    [RelayCommand]
    private async Task ConnectToFavoriteAsync(FavoriteDevice favorite)
    {
        RemoteIdInput = favorite.DeviceId;
        SelectedNav = NavSection.Home;
        SelectedNavItem = NavItems[0];
        await ConnectAsync();
    }

    [RelayCommand]
    private async Task ConnectToRecentAsync(ConnectionHistoryEntry entry)
    {
        if (!DeviceId.TryParse(entry.RemoteId, out var deviceId))
        {
            StatusMessage = "This history entry doesn't contain a valid IPCast ID.";
            return;
        }

        RemoteIdInput = deviceId.Raw;
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
            RefreshDashboardFavoriteDevices();
        }
    }

    private void RefreshDashboardRecentConnections()
    {
        DashboardRecentConnections.Clear();
        foreach (var entry in ConnectionHistory.Take(4))
        {
            DashboardRecentConnections.Add(entry);
        }
    }

    private void RefreshDashboardFavoriteDevices()
    {
        DashboardFavoriteDevices.Clear();
        foreach (var favorite in FavoriteDevices.Take(4))
        {
            DashboardFavoriteDevices.Add(favorite);
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
        if (_activeSession is not null) { session.Dispose(); return; }
        AttachSession(session);
        RecordHistory(session.RemoteDeviceId, "Incoming", "Connected");
        StatusMessage = $"{session.RemoteDeviceId.Formatted} connected over TLS. Clipboard sync is live.";
    }

    private FileReceiver? _fileReceiver;

    private void AttachSession(RemoteSession session)
    {
        AuditLog.Default.Write(AuditEvent.ConnectionStarted, deviceId: session.RemoteDeviceId.Raw);
        _activeSession = session;
        IsConnected = true;
        var loop = new SessionMessageLoop(session);
        loop.ClipboardTextReceived += text => { if (IsClipboardSyncEnabled) PeerClipboardTextReceived?.Invoke(text); };
        var networkFailure = false;
        loop.Faulted += ex => networkFailure = ex is IOException or System.Net.Sockets.SocketException;
        loop.Ended += () => Dispatcher.UIThread.Post(async () => await RecoverConnectionAsync(loop, networkFailure));

        _fileReceiver = new FileReceiver(loop, session)
        {
            OnFileOffered = offer => OnFileOffered?.Invoke(offer) ?? Task.FromResult(FileOfferDecision.Reject("No file receiver is available."))
        };
        _fileReceiver.FileReceived += path => { AuditLog.Default.Write(AuditEvent.FileTransferred, deviceId: session.RemoteDeviceId.Raw); Dispatcher.UIThread.Post(() => FileTransferMessage = $"Received file saved to: {path}"); };
        _fileReceiver.Faulted += ex => Dispatcher.UIThread.Post(() => FileTransferMessage = $"Receive failed: {ex.Message}");

        _activeSessionLoop = loop;
        Tools = new SessionTools(loop, session) { RequestRestart = () => OnRestartRequested?.Invoke() ?? Task.FromResult(false) };
        if (OperatingSystem.IsWindows() && session.GrantedPermissions.HasFlag(ConnectionPermissions.Audio))
        {
            Audio = new SessionAudio(loop, session, () => OperatingSystem.IsWindows()
                ? new WindowsSystemAudio() : throw new PlatformNotSupportedException("System audio requires Windows."));
            Audio.StateChanged += (enabled, error) => Dispatcher.UIThread.Post(() =>
            {
                IsSystemAudioShared = enabled && !session.IsInitiator;
                if (error is not null) StatusMessage = error;
            });
        }
        IsTunnelAvailable = session.GrantedPermissions.HasFlag(ConnectionPermissions.TcpTunnel);
        if (IsTunnelAvailable)
        {
            _tunnels = new TunnelSession(loop, session);
            TunnelsReady?.Invoke(_tunnels);
        }
        IsFileManagerAvailable = session.GrantedPermissions.HasFlag(ConnectionPermissions.FileTransfer);
        if (IsFileManagerAvailable)
        {
            _fileManager = new FileManagerSession(loop, session);
            FileManagerReady?.Invoke(_fileManager);
        }
        IsChatAvailable = session.GrantedPermissions.HasFlag(ConnectionPermissions.Chat);
        if (IsChatAvailable)
        {
            _activeChat = new SessionChat(loop, session);
            SessionChatReady?.Invoke(_activeChat);
        }

        if (!session.GrantedPermissions.HasFlag(ConnectionPermissions.ViewScreen))
        {
            loop.Start();
            return;
        }

        var desktop = new RemoteDesktopSession(loop, session);
        _activeDesktop = desktop;
        desktop.RecordingStateChanged += recording => Dispatcher.UIThread.Post(() => IsPeerRecording = recording);
        desktop.Faulted += ex => Dispatcher.UIThread.Post(async () => { await DisconnectAsync(); StatusMessage = $"Screen sharing stopped: {ex.Message}"; });

        if (session.IsInitiator)
        {
            // We pressed Connect: we're the viewer. The View opens a window and renders frames.
            RemoteDesktopSessionReady?.Invoke(desktop);
        }
        else
        {
            // We accepted the incoming request and granted ViewScreen: share this screen.
            var (capturer, injector) = CreateSharingBackend();
            var profile = StreamingProfile.FromName(StreamingMode);
            desktop.StartSharing(capturer, injector, TimeSpan.FromSeconds(1d / profile.FramesPerSecond), profile.Quality, profile.MaxDimension, profile.BytesPerSecond);
        }
        loop.Start();
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

        return (new MonitorAwareScreenCapturer(), new SendInputInjector());
    }

    /// <summary>Pushes locally-copied clipboard text to the connected peer, if any (spec §8).</summary>
    public Task PushLocalClipboardTextAsync(string text) =>
        IsClipboardSyncEnabled ? (_activeSessionLoop?.SendClipboardTextAsync(text) ?? Task.CompletedTask) : Task.CompletedTask;
}
