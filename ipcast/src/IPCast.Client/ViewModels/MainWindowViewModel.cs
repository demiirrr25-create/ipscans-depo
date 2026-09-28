using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using IPCast.Network;
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

    public MainWindowViewModel() : this(new DeviceIdentityStore(), new DeviceCertificateStore(), new UnattendedAccessStore())
    {
    }

    public MainWindowViewModel(
        DeviceIdentityStore identityStore, DeviceCertificateStore certificateStore, UnattendedAccessStore unattendedAccessStore)
    {
        _localDeviceId = identityStore.LoadOrCreate();
        _unattendedAccessStore = unattendedAccessStore;
        _selectedNavItem = NavItems[0];
        _isUnattendedAccessEnabled = unattendedAccessStore.GetStatus().Enabled;

        var discoveryPort = int.TryParse(Environment.GetEnvironmentVariable("IPCAST_DISCOVERY_PORT"), out var p)
            ? p
            : LanDiscoveryService.DefaultDiscoveryPort;
        NetworkService = new IPCastService(_localDeviceId, certificateStore.LoadOrCreate(), discoveryPort)
        {
            UnattendedAccessPolicy = new UnattendedAccessPolicy(unattendedAccessStore),
        };
    }

    /// <summary>Owns this device's incoming/outgoing LAN connections. The View wires up the incoming-request dialog and starts it.</summary>
    public IPCastService NetworkService { get; }

    private RemoteSession? _activeSession;
    private SessionMessageLoop? _activeSessionLoop;

    /// <summary>Raised (off the UI thread) when the connected peer pushes clipboard text - the View applies it to the real OS clipboard.</summary>
    public event Action<string>? PeerClipboardTextReceived;

    public IReadOnlyList<NavItem> NavItems { get; } =
    [
        new NavItem(NavSection.Home, "Home"),
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

                // Real handshake, TLS encryption, and permission negotiation - but no certificate
                // pinning yet (an active man-in-the-middle isn't ruled out) and no actual screen/
                // input control yet (Phase 3). Say exactly that instead of overclaiming.
                StatusMessage = $"Connected to {remoteId.Formatted} on the local network over TLS. " +
                                 "Clipboard sync is live; screen viewing and remote control aren't wired up yet.";
            }
            else if (result.Rejected)
            {
                StatusMessage = $"{remoteId.Formatted} rejected the connection: {result.Error}";
            }
            else
            {
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
    }

    /// <summary>Pushes locally-copied clipboard text to the connected peer, if any (spec §8).</summary>
    public Task PushLocalClipboardTextAsync(string text) =>
        _activeSessionLoop?.SendClipboardTextAsync(text) ?? Task.CompletedTask;
}
