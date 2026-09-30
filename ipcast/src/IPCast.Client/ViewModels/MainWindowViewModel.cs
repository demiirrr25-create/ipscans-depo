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

namespace IPCast.Client.ViewModels;

public partial class MainWindowViewModel : ObservableObject
{
    private const ConnectionPermissions DefaultRequestedPermissions =
        ConnectionPermissions.ViewScreen | ConnectionPermissions.ControlMouse |
        ConnectionPermissions.ControlKeyboard | ConnectionPermissions.Clipboard | ConnectionPermissions.FileTransfer;

    private readonly PreferencesStore _preferencesStore = new();
    private CancellationTokenSource? _connectCts;
    private CancellationTokenSource? _transferCts;
    [ObservableProperty] private bool _isConnected;
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
        NetworkService.RelayServerAddress = new RelayAddress(null, new Uri(Preferences.DefaultRelayAddress));
        NetworkService.RelayStatusChanged += message => Dispatcher.UIThread.Post(() => RelayServerMessage = message);
    }

    partial void OnIsClipboardSyncEnabledChanged(bool value) => SavePreferences();
    private void SavePreferences()
    {
        try { _preferencesStore.Save(new Preferences(ClipboardSync: IsClipboardSyncEnabled)); }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException) { StatusMessage = $"Couldn't save settings: {ex.Message}"; }
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
        new NavItem(NavSection.FileTransfer, "File Transfer"),
        new NavItem(NavSection.MyDevices, "My Devices"),
        new NavItem(NavSection.RecentConnections, "Recent Connections"),
        new NavItem(NavSection.Settings, "Settings"),
        new NavItem(NavSection.Help, "Help"),
    ];

    /// <summary>The grouped-by-3 display form of this device's persistent IPCast ID, e.g. "847 293 615".</summary>
    public string DeviceIdFormatted => _localDeviceId.Formatted;

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

        IsConnecting = true;
        StatusMessage = "Connecting to remote device...";
        try
        {
            await DisconnectAsync();
            _connectCts = new CancellationTokenSource(TimeSpan.FromSeconds(45));
            var result = await NetworkService.ConnectAsync(
                RemoteIdInput.Trim(),
                DefaultRequestedPermissions,
                password: string.IsNullOrEmpty(RemotePasswordInput) ? null : RemotePasswordInput,
                ct: _connectCts.Token);

            if (result.Success)
            {
                AttachSession(result.Session!);
                var remoteDisplay = result.Session!.RemoteDeviceId.Formatted;
                RecordHistory(result.Session!.RemoteDeviceId, "Outgoing", "Connected");
                _favoritesStore.NotifyConnected(result.Session!.RemoteDeviceId.Raw);
                RefreshFavoriteLastConnected(result.Session!.RemoteDeviceId.Raw);

                StatusMessage = $"Connected to {remoteDisplay} over TLS.";
            }
            else if (result.Rejected)
            {
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

    [RelayCommand] private void CancelConnect() => _connectCts?.Cancel();

    [RelayCommand]
    private async Task DisconnectAsync()
    {
        _transferCts?.Cancel();
        _activeDesktop?.Dispose();
        _activeDesktop = null;
        var loop = _activeSessionLoop;
        _activeSessionLoop = null;
        _activeSession?.Dispose();
        _activeSession = null;
        if (loop is not null) await loop.DisposeAsync();
        _fileReceiver?.Dispose();
        _fileReceiver = null;
        IsConnected = false;
    }

    public async Task ShutdownAsync()
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
        if (_activeSession is not null) { session.Dispose(); return; }
        AttachSession(session);
        RecordHistory(session.RemoteDeviceId, "Incoming", "Connected");
        StatusMessage = $"{session.RemoteDeviceId.Formatted} connected over TLS. Clipboard sync is live.";
    }

    private FileReceiver? _fileReceiver;

    private void AttachSession(RemoteSession session)
    {
        _activeSession = session;
        IsConnected = true;
        var loop = new SessionMessageLoop(session);
        loop.ClipboardTextReceived += text => { if (IsClipboardSyncEnabled) PeerClipboardTextReceived?.Invoke(text); };
        loop.Faulted += ex => Dispatcher.UIThread.Post(() => StatusMessage = $"Connection ended: {ex.Message}");
        loop.Ended += () => Dispatcher.UIThread.Post(async () => {
            if (ReferenceEquals(_activeSessionLoop, loop)) { await DisconnectAsync(); StatusMessage = "Disconnected."; }
        });

        _fileReceiver = new FileReceiver(loop, session)
        {
            OnFileOffered = offer => OnFileOffered?.Invoke(offer) ?? Task.FromResult(FileOfferDecision.Reject("No file receiver is available."))
        };
        _fileReceiver.FileReceived += path => Dispatcher.UIThread.Post(() => FileTransferMessage = $"Received file saved to: {path}");
        _fileReceiver.Faulted += ex => Dispatcher.UIThread.Post(() => FileTransferMessage = $"Receive failed: {ex.Message}");

        _activeSessionLoop = loop;

        if (!session.GrantedPermissions.HasFlag(ConnectionPermissions.ViewScreen))
        {
            loop.Start();
            return;
        }

        var desktop = new RemoteDesktopSession(loop, session);
        _activeDesktop = desktop;
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
            desktop.StartSharing(capturer, injector, frameInterval: TimeSpan.FromMilliseconds(200));
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

        return (new GdiScreenCapturer(), new SendInputInjector());
    }

    /// <summary>Pushes locally-copied clipboard text to the connected peer, if any (spec §8).</summary>
    public Task PushLocalClipboardTextAsync(string text) =>
        IsClipboardSyncEnabled ? (_activeSessionLoop?.SendClipboardTextAsync(text) ?? Task.CompletedTask) : Task.CompletedTask;
}
