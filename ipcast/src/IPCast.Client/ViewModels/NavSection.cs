namespace IPCast.Client.ViewModels;

/// <summary>The section of the app currently shown in the main content area.</summary>
public enum NavSection
{
    Home,
    FileTransfer,
    MyDevices,
    RecentConnections,
    Settings,
    Help,
    Dashboard,
    RemoteSession,
    FileManager,
    DeviceCatalog,
    TcpTunnel,
    WakeOnLan,
    AuditLogs,
    About
}

/// <summary>A single entry in the sidebar navigation list with icon descriptor and count.</summary>
public sealed record NavItem(NavSection Section, string Label, string IconKey = "Default", string? Badge = null);
