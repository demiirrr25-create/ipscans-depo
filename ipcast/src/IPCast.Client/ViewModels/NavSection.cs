namespace IPCast.Client.ViewModels;

/// <summary>The section of the app currently shown in the main content area.</summary>
public enum NavSection
{
    Home,
    MyDevices,
    RecentConnections,
    Settings,
    Help,
}

/// <summary>A single entry in the sidebar navigation list.</summary>
public sealed record NavItem(NavSection Section, string Label);
