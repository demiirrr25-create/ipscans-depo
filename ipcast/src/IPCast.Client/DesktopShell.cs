using Avalonia;
using Avalonia.Input.Platform;
using Avalonia.Controls;
using Avalonia.Controls.ApplicationLifetimes;
using Avalonia.Platform;
using IPCast.Client.ViewModels;
using IPCast.Client.Views;
using IPCast.Shared;

namespace IPCast.Client;

internal static class DesktopShell
{
    public static void Attach(App app, IClassicDesktopStyleApplicationLifetime lifetime, MainWindow main, MainWindowViewModel vm)
    {
        var menu = new NativeMenu();
        var open = new NativeMenuItem("Open IPCast");
        void Show() { main.Show(); main.WindowState = WindowState.Normal; main.Activate(); }
        open.Click += (_, _) => Show();
        menu.Add(open);
        var id = new NativeMenuItem("Your IPCast ID: " + vm.DeviceIdFormatted);
        id.Click += async (_, _) => { if (main.Clipboard is { } clipboard) await clipboard.SetTextAsync(vm.DeviceIdFormatted); };
        menu.Add(id);
        var status = new NativeMenuItem("No active session") { IsEnabled = false }; menu.Add(status);
        var incoming = new NativeMenuItem("Incoming connections");
        incoming.Click += (_, _) => { Show(); vm.SelectedNavItem = vm.NavItems.First(n => n.Section == NavSection.Home); };
        menu.Add(incoming);
        foreach (var label in new[] { "Unattended access", "Settings" })
        {
            var item = new NativeMenuItem(label);
            item.Click += (_, _) => { Show(); vm.SelectedNavItem = vm.NavItems.First(n => n.Section == NavSection.Settings); };
            menu.Add(item);
        }
        menu.Add(new NativeMenuItemSeparator());
        var exit = new NativeMenuItem("Exit");
        exit.Click += async (_, _) => { await vm.ShutdownAsync(); lifetime.Shutdown(); };
        menu.Add(exit);
        var tray = new TrayIcon
        {
            Icon = new WindowIcon(AssetLoader.Open(new Uri("avares://IPCast/Assets/ipcast.ico"))),
            ToolTipText = "IPCast — Ready for secure connections", Menu = menu, IsVisible = true
        };
        tray.Clicked += (_, _) => Show();
        TrayIcon.SetIcons(app, new TrayIcons { tray });
        vm.PropertyChanged += (_, e) =>
        {
            if (e.PropertyName is nameof(vm.IsConnected) or nameof(vm.IsPeerRecording))
            {
                status.Header = vm.IsPeerRecording ? "REC — Remote viewer recording" : vm.IsConnected ? "Remote session active" : "No active session";
                tray.ToolTipText = "IPCast — " + status.Header;
            }
        };
        lifetime.Exit += (_, _) => { tray.Dispose(); AuditLog.Default.Write(AuditEvent.ApplicationStopped); };
    }
}
