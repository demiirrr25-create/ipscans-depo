using Avalonia;
using Avalonia.Controls;
using Avalonia.Controls.ApplicationLifetimes;
using Avalonia.Markup.Xaml;
using IPCast.Client.ViewModels;
using IPCast.Client.Views;
using IPCast.Shared;
using Avalonia.Threading;

namespace IPCast.Client;

public partial class App : Application
{
    private bool _crashShown;
    public override void Initialize()
    {
        AvaloniaXamlLoader.Load(this);
    }

    public override void OnFrameworkInitializationCompleted()
    {
        if (ApplicationLifetime is IClassicDesktopStyleApplicationLifetime desktop)
        {
            var vm = new MainWindowViewModel();
            var main = new MainWindow
            {
                DataContext = vm,
            };
            desktop.MainWindow = main;
            DesktopShell.Attach(this, desktop, main, vm);
            AuditLog.Default.Write(AuditEvent.ApplicationStarted);
            Dispatcher.UIThread.UnhandledException += async (_, e) =>
            {
                AuditLog.Default.Write(AuditEvent.ApplicationError, AuditLevel.Error, error: e.Exception);
                e.Handled = true;
                if (_crashShown) return;
                _crashShown = true;
                try { await vm.ShutdownAsync(); } catch (Exception) { }
                var dialog = new Window { Title = "IPCast — Unexpected error", Width = 460, SizeToContent = SizeToContent.Height };
                var restart = new Button { Content = "Restart IPCast", Margin = new Avalonia.Thickness(20) };
                restart.Click += async (_, _) =>
                {
                    await vm.ShutdownAsync();
                    if (Environment.ProcessPath is { } path)
                        System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(path) { UseShellExecute = true });
                    desktop.Shutdown();
                };
                dialog.Content = new StackPanel { Children =
                {
                    new TextBlock { Text = "IPCast encountered an unexpected error. A report without message contents or credentials was saved in Logs.", TextWrapping = Avalonia.Media.TextWrapping.Wrap, Margin = new Avalonia.Thickness(20) },
                    restart
                } };
                dialog.Show();
            };
        }

        base.OnFrameworkInitializationCompleted();
    }
}
