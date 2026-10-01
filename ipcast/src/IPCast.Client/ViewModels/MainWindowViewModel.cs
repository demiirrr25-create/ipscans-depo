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
    private string _relayServerInput = string.Empty;

    [ObservableProperty]
    private string _relayServerMessage = string.Empty;

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
            var result = await NetworkService.ConnectAsync(
                RemoteIdInput.Trim(),
                DefaultRequestedPermissions,
                password: string.IsNullOrEmpty(RemotePasswordInput) ? null : RemotePasswordInput);

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
        finally
        {
            IsConnecting = false;
        }
    }

    [RelayCommand]
    private void SaveRelayServer()
    {
        if (string.IsNullOrWhiteSpace(RelayServerInput))
        {
            NetworkService.RelayServerEndpoint = null;
            RelayServerMessage = "Relay server disabled (local network mode).";
            return;
        }

        if (System.Net.IPEndPoint.TryParse(RelayServerInput.Trim(), out var ep))
        {
            NetworkService.RelayServerEndpoint = ep;
            RelayServerMessage = $"Relay server set to {ep}.";
        }
        else
        {
            RelayServerMessage = "Enter a valid endpoint, e.g. 192.168.1.10:9876.";
        }
    }

    [RelayCommand]
    private void ClearRelayServer()
    {
        NetworkService.RelayServerEndpoint = null;
        RelayServerInput = string.Empty;
        RelayServerMessage = "Relay server disabled.";
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

    private FileReceiver? _fileReceiver;

    private void AttachSession(RemoteSession session)
    {
        _activeSession = session;
        var loop = new SessionMessageLoop(session);
        loop.ClipboardTextReceived += text => PeerClipboardTextReceived?.Invoke(text);

        _fileReceiver = new FileReceiver(loop, session)
        {
            OnFileOffered = offer =>
            {
                var downloadDir = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
                var savePath = System.IO.Path.Combine(downloadDir, offer.FileName);
                return Task.FromResult(FileOfferDecision.AcceptTo(savePath));
            }
        };
        _fileReceiver.FileReceived += path => FileTransferMessage = $"Received file saved to: {path}";

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
            desktop.StartSharing(capturer, injector, frameInterval: TimeSpan.FromMilliseconds(200));
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
