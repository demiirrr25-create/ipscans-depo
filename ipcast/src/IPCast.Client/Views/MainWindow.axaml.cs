using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Input.Platform;
using Avalonia.Interactivity;
using Avalonia.Threading;
using IPCast.Client.ViewModels;
using Avalonia.Platform.Storage;
using IPCast.FileTransfer;

namespace IPCast.Client.Views;

public partial class MainWindow : Window
{
    // Guards against the clipboard-sync feedback loop: applying a peer's clipboard text would
    // otherwise look like a new local change and get echoed straight back to them.
    private string? _lastSeenClipboardText;
    private readonly DispatcherTimer _clipboardPoll = new() { Interval = TimeSpan.FromSeconds(1) };

    public MainWindow()
    {
        InitializeComponent();
        Opened += OnOpened;
        Closed += OnClosed;
        _clipboardPoll.Tick += async (_, _) => await PollLocalClipboardAsync();
    }

    private void OnOpened(object? sender, EventArgs e)
    {
        if (DataContext is not MainWindowViewModel vm)
        {
            return;
        }

        vm.NetworkService.OnConnectionRequested = request => IncomingConnectionWindow.ShowAsync(this, request);
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
        vm.RemoteDesktopSessionReady += OnRemoteDesktopSessionReady;
        try
        {
            vm.NetworkService.Start();
            vm.LocalConnectionInfo = $"Direct connection: use this computer's LAN IP with port {vm.NetworkService.ListeningPort}.";
        }
        catch (Exception ex) { vm.StatusMessage = $"Network startup failed: {ex.Message}"; }
        _clipboardPoll.Start();
    }

    private async void OnClosed(object? sender, EventArgs e)
    {
        _clipboardPoll.Stop();
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
}
