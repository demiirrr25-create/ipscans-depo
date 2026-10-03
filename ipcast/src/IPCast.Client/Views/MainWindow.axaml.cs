using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Input.Platform;
using Avalonia.Interactivity;
using Avalonia.Threading;
using IPCast.Client.ViewModels;
using IPCast.Client.Persistence;
using Avalonia.Platform.Storage;
using IPCast.FileTransfer;

namespace IPCast.Client.Views;

public partial class MainWindow : Window
{
    // Guards against the clipboard-sync feedback loop: applying a peer's clipboard text would
    // otherwise look like a new local change and get echoed straight back to them.
    private string? _lastSeenClipboardText;
    private SessionChatWindow? _chatWindow;
    private FileManagerWindow? _fileManagerWindow;
    private TunnelWindow? _tunnelWindow;
    private readonly DispatcherTimer _clipboardPoll = new() { Interval = TimeSpan.FromSeconds(1) };
    private readonly DispatcherTimer _discoveryPoll = new() { Interval = TimeSpan.FromSeconds(30) };

    public MainWindow()
    {
        InitializeComponent();
        Opened += OnOpened;
        Closed += OnClosed;
        _clipboardPoll.Tick += async (_, _) => await PollLocalClipboardAsync();
        _discoveryPoll.Tick += async (_, _) => { if (DataContext is MainWindowViewModel vm && IsVisible) await vm.RefreshDiscoveredDevicesAsync(); };
    }

    private void OnOpened(object? sender, EventArgs e)
    {
        if (DataContext is not MainWindowViewModel vm)
        {
            return;
        }

        vm.NetworkService.OnConnectionRequested = request => IncomingConnectionWindow.ShowAsync(this, request);
        vm.OnRestartRequested = () => SessionActions.ConfirmRestartAsync(this);
        vm.NetworkService.SessionEstablished += session => Dispatcher.UIThread.Post(() => vm.OnSessionEstablished(session));
        vm.OnTrustRequested = async (device, fingerprint, previous) => await Dispatcher.UIThread.InvokeAsync(async () => {
            var dialog = new Window { Title = "Verify remote device", Width = 520, SizeToContent = SizeToContent.Height, WindowStartupLocation = WindowStartupLocation.CenterOwner };
            var panel = new StackPanel { Margin = new Avalonia.Thickness(24), Spacing = 16 };
            panel.Children.Add(new TextBlock {
                Text = previous is null ? $"First connection to {device}. Compare this SHA-256 fingerprint with the fingerprint in the remote device's Settings before trusting it."
                    : $"The certificate for {device} has CHANGED. Do not continue unless the remote owner confirms this new fingerprint.",
                TextWrapping = Avalonia.Media.TextWrapping.Wrap
            });
            panel.Children.Add(new TextBox { Text = fingerprint, IsReadOnly = true, TextWrapping = Avalonia.Media.TextWrapping.Wrap });
            var reject = new Button { Content = "Cancel" };
            var trust = new Button { Content = "Fingerprints match — trust this device" };
            reject.Click += (_, _) => dialog.Close(false);
            trust.Click += (_, _) => dialog.Close(true);
            panel.Children.Add(reject); panel.Children.Add(trust); dialog.Content = panel;
            return await dialog.ShowDialog<bool>(this);
        });
        vm.OnFileOffered = async offer => await Dispatcher.UIThread.InvokeAsync(async () => {
            var file = await StorageProvider.SaveFilePickerAsync(new FilePickerSaveOptions {
                Title = $"Accept incoming file ({offer.FileSizeBytes:N0} bytes)",
                SuggestedFileName = System.IO.Path.GetFileName(offer.FileName),
                ShowOverwritePrompt = true
            });
            var path = file?.TryGetLocalPath();
            return path is null ? FileOfferDecision.Reject("File declined.") : FileOfferDecision.AcceptTo(path);
        });
        vm.PeerClipboardTextReceived += OnPeerClipboardTextReceived;
        vm.TunnelsReady += tunnels =>
        {
            tunnels.Approve = configuration => TunnelWindow.RequestApprovalAsync(this, configuration);
            var window = new TunnelWindow(tunnels);
            _tunnelWindow = window;
            window.Closed += (_, _) => { if (ReferenceEquals(_tunnelWindow, window)) _tunnelWindow = null; };
            window.Show();
        };
        vm.RemoteDesktopSessionReady += OnRemoteDesktopSessionReady;
        vm.FileManagerReady += session =>
        {
            var manager = new FileManagerWindow(session);
            _fileManagerWindow = manager;
            manager.Closed += (_, _) => { if (ReferenceEquals(_fileManagerWindow, manager)) _fileManagerWindow = null; };
        };
        vm.SessionChatReady += chat =>
        {
            var chatWindow = new SessionChatWindow(chat);
            _chatWindow = chatWindow;
            chatWindow.Closed += (_, _) => { if (ReferenceEquals(_chatWindow, chatWindow)) _chatWindow = null; };
            chatWindow.Show();
        };
        try
        {
            vm.NetworkService.Start();
            vm.LocalConnectionInfo = $"Direct connection: use this computer's LAN IP with port {vm.NetworkService.ListeningPort}.";
        }
        catch (Exception ex) { vm.StatusMessage = $"Network startup failed: {ex.Message}"; }
        _clipboardPoll.Start();
        _discoveryPoll.Start();
        _ = vm.RefreshDiscoveredDevicesAsync();
        vm.PropertyChanged += (_, args) => { if (args.PropertyName == nameof(vm.IsPeerRecording)) Title = vm.IsPeerRecording ? "IPCast — REC: remote viewer is recording" : "IPCast — Secure Remote Access"; };
    }

    private async void OnClosed(object? sender, EventArgs e)
    {
        _clipboardPoll.Stop();
        _discoveryPoll.Stop();
        if (DataContext is MainWindowViewModel vm)
        {
            await vm.ShutdownAsync();
        }
    }

    private async Task PollLocalClipboardAsync()
    {
        if (DataContext is not MainWindowViewModel vm || Clipboard is null)
        {
            return;
        }

        if (!vm.IsConnected || !vm.IsClipboardSyncEnabled) return;
        try
        {
        var text = await Clipboard.TryGetTextAsync();
        if (string.IsNullOrEmpty(text) || text == _lastSeenClipboardText)
        {
            return;
        }

        _lastSeenClipboardText = text;
        await vm.PushLocalClipboardTextAsync(text);
        }
        catch (Exception ex) { vm.StatusMessage = $"Clipboard sync failed: {ex.Message}"; }
    }

    private void OnPeerClipboardTextReceived(string text)
    {
        Dispatcher.UIThread.Post(async () =>
        {
            if (Clipboard is null)
            {
                return;
            }

            // Set this *before* writing so the next poll tick doesn't treat it as a new local
            // change and bounce it straight back to the peer.
            _lastSeenClipboardText = text;
            try { await Clipboard.SetTextAsync(text); }
            catch (Exception ex) { if (DataContext is MainWindowViewModel vm) vm.StatusMessage = $"Clipboard unavailable: {ex.Message}"; }
        });
    }

    private void OnRemoteDesktopSessionReady(IPCast.RemoteDesktop.RemoteDesktopSession desktop)
    {
        Dispatcher.UIThread.Post(() => {
            var window = new RemoteScreenWindow(desktop);
            if (DataContext is MainWindowViewModel toolsVm && toolsVm.Tools is { } tools) window.ConfigureTools(tools);
            if (_tunnelWindow is { } tunnels) window.EnableTunnels(() => { tunnels.Show(); tunnels.Activate(); });
            if (DataContext is MainWindowViewModel settings)
                window.ConfigureRecording(settings.RecordingDirectory, settings.AutomaticRecording);
            if (_fileManagerWindow is { } manager)
            {
                window.EnableFileManager(() => { manager.Show(); manager.Activate(); });
                window.EnableFileDrop(manager.UploadExternalFilesAsync);
            }
            if (_chatWindow is { } chatWindow)
                window.EnableChat(() => { chatWindow.Show(); chatWindow.Activate(); });
            window.Closed += async (_, _) => { if (DataContext is MainWindowViewModel vm) await vm.DisconnectDesktopAsync(desktop); };
            window.Show();
        });
    }

    private async void OnChooseFileClick(object? sender, RoutedEventArgs e)
    {
        if (DataContext is not MainWindowViewModel vm) return;
        var files = await StorageProvider.OpenFilePickerAsync(new FilePickerOpenOptions { Title = "Choose a file to send", AllowMultiple = false });
        if (files.Count > 0) vm.SelectedFilePath = files[0].TryGetLocalPath() ?? string.Empty;
    }

    private void OnChatClick(object? sender, RoutedEventArgs e)
    {
        _chatWindow?.Show();
        _chatWindow?.Activate();
    }

    private void OnFileManagerClick(object? sender, RoutedEventArgs e)
    {
        _fileManagerWindow?.Show(); _fileManagerWindow?.Activate();
    }

    private async void OnCopyIdClick(object? sender, RoutedEventArgs e)
    {
        if (DataContext is not MainWindowViewModel vm || Clipboard is null)
        {
            return;
        }

        await Clipboard.SetTextAsync(vm.DeviceIdFormatted);
        vm.NotifyIdCopied();
    }

    private void OnRemoteIdKeyDown(object? sender, KeyEventArgs e)
    {
        if (e.Key != Key.Enter || DataContext is not MainWindowViewModel vm)
        {
            return;
        }

        e.Handled = true;
        if (vm.ConnectCommand.CanExecute(null))
        {
            vm.ConnectCommand.Execute(null);
        }
    }

    private static FavoriteDevice? FavoriteFrom(object? sender) =>
        (sender as Control)?.DataContext as FavoriteDevice;

    private void OnFavoriteContextConnect(object? sender, RoutedEventArgs e)
    {
        if (DataContext is MainWindowViewModel vm && FavoriteFrom(sender) is { } device
            && vm.ConnectToFavoriteCommand.CanExecute(device))
        {
            vm.ConnectToFavoriteCommand.Execute(device);
        }
    }

    private void OnFavoriteContextRemove(object? sender, RoutedEventArgs e)
    {
        if (DataContext is MainWindowViewModel vm && FavoriteFrom(sender) is { } device
            && vm.RemoveFavoriteCommand.CanExecute(device))
        {
            vm.RemoveFavoriteCommand.Execute(device);
        }
    }

    private async void OnFavoriteContextRename(object? sender, RoutedEventArgs e)
    {
        if (DataContext is not MainWindowViewModel vm || FavoriteFrom(sender) is not { } device)
        {
            return;
        }

        var newName = await PromptForNameAsync(device.Name);
        if (!string.IsNullOrWhiteSpace(newName))
        {
            vm.RenameFavorite(device, newName);
        }
    }

    private async void OnFavoriteWake(object? sender, RoutedEventArgs e)
    {
        if (DataContext is not MainWindowViewModel vm || FavoriteFrom(sender) is not { } device) return;
        var mac = await PromptForNameAsync(device.MacAddress ?? "00-11-22-33-44-55", "Wake device — MAC address", "MAC address");
        if (string.IsNullOrWhiteSpace(mac)) return;
        try { await vm.WakeFavoriteAsync(device, mac); }
        catch (Exception ex) { vm.StatusMessage = ex.Message; }
    }

    private async Task<string?> PromptForNameAsync(string currentName, string title = "Rename device", string label = "Device name")
    {
        var input = new TextBox { Text = currentName, PlaceholderText = label, MinWidth = 320 };
        var dialog = new Window
        {
            Title = title,
            Width = 400,
            SizeToContent = SizeToContent.Height,
            CanResize = false,
            WindowStartupLocation = WindowStartupLocation.CenterOwner,
            Background = this.FindResource("AppBackgroundBrush") as Avalonia.Media.IBrush,
        };

        string? result = null;
        var save = new Button { Content = "Save", Classes = { "primary" }, HorizontalAlignment = Avalonia.Layout.HorizontalAlignment.Stretch };
        var cancel = new Button { Content = "Cancel", HorizontalAlignment = Avalonia.Layout.HorizontalAlignment.Stretch };
        save.Click += (_, _) => { result = input.Text; dialog.Close(); };
        cancel.Click += (_, _) => dialog.Close();
        input.KeyDown += (_, args) => { if (args.Key == Key.Enter) { result = input.Text; dialog.Close(); } };

        var buttons = new Grid { ColumnDefinitions = new ColumnDefinitions("*,*"), ColumnSpacing = 10 };
        Grid.SetColumn(cancel, 0);
        Grid.SetColumn(save, 1);
        buttons.Children.Add(cancel);
        buttons.Children.Add(save);

        dialog.Content = new StackPanel
        {
            Margin = new Avalonia.Thickness(24),
            Spacing = 16,
            Children =
            {
                new TextBlock { Text = label, Foreground = this.FindResource("TextSecondaryBrush") as Avalonia.Media.IBrush },
                input,
                buttons,
            },
        };

        await dialog.ShowDialog(this);
        return result;
    }
}
