using Avalonia.Controls;
using Avalonia.Input.Platform;
using Avalonia.Interactivity;
using Avalonia.Threading;
using IPCast.Client.ViewModels;

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
        vm.NetworkService.SessionEstablished += session => vm.OnSessionEstablished(session);
        vm.PeerClipboardTextReceived += OnPeerClipboardTextReceived;
        vm.RemoteDesktopSessionReady += OnRemoteDesktopSessionReady;
        vm.NetworkService.Start();
        _clipboardPoll.Start();
    }

    private async void OnClosed(object? sender, EventArgs e)
    {
        _clipboardPoll.Stop();
        if (DataContext is MainWindowViewModel vm)
        {
            await vm.NetworkService.DisposeAsync();
        }
    }

    private async Task PollLocalClipboardAsync()
    {
        if (DataContext is not MainWindowViewModel vm || Clipboard is null)
        {
            return;
        }

        var text = await Clipboard.TryGetTextAsync();
        if (string.IsNullOrEmpty(text) || text == _lastSeenClipboardText)
        {
            return;
        }

        _lastSeenClipboardText = text;
        await vm.PushLocalClipboardTextAsync(text);
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
            await Clipboard.SetTextAsync(text);
        });
    }

    private void OnRemoteDesktopSessionReady(IPCast.RemoteDesktop.RemoteDesktopSession desktop)
    {
        Dispatcher.UIThread.Post(() => new RemoteScreenWindow(desktop).Show());
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
}
