using Avalonia.Controls;
using Avalonia.Layout;
using Avalonia.Media;
using Avalonia.Threading;
using IPCast.Network;

namespace IPCast.Client.Views;

public sealed class TunnelWindow : Window
{
    private readonly TunnelSession _session;
    private readonly ListBox _list = new() { MinHeight = 180 };
    private readonly TextBlock _status = new() { TextWrapping = TextWrapping.Wrap };
    private bool _ended;
    public TunnelWindow(TunnelSession session)
    {
        _session = session;
        Title = "IPCast — TCP tunnels"; Width = 640; Height = 530;
        var reverse = new CheckBox { Content = "Reverse tunnel — listen on the remote device" };
        var listen = new TextBox { PlaceholderText = "Listening port", Text = "8080" };
        var host = new TextBox { PlaceholderText = "Destination host", Text = "127.0.0.1" };
        var destination = new TextBox { PlaceholderText = "Destination port", Text = "80" };
        var create = new Button { Content = "Request tunnel", IsVisible = session.CanCreate };
        create.Click += async (_, _) =>
        {
            create.IsEnabled = false;
            try
            {
                if (!int.TryParse(listen.Text, out var localPort) || !int.TryParse(destination.Text, out var remotePort))
                    throw new ArgumentException("Ports must be numbers from 1 to 65535.");
                _status.Text = "Waiting for the remote owner to approve this route…";
                await session.CreateAsync(reverse.IsChecked == true, localPort, host.Text ?? "", remotePort);
                _status.Text = "Tunnel active. Only local applications can connect to its listening port.";
            }
            catch (Exception ex) { _status.Text = ex.Message; }
            finally { create.IsEnabled = true; }
        };
        var stop = new Button { Content = "Stop selected tunnel" };
        stop.Click += async (_, _) =>
        {
            if (_list.SelectedItem is not TunnelConfiguration config) return;
            try { await session.StopAsync(config.Id); _status.Text = "Tunnel stopped."; }
            catch (Exception ex) { _status.Text = ex.Message; }
        };
        Content = new ScrollViewer { Content = new StackPanel { Margin = new Avalonia.Thickness(24), Spacing = 10, Children =
        {
            new TextBlock { Text = "TCP tunnels", FontSize = 24 },
            new TextBlock { Text = "Forward: local listener → remote destination. Reverse: remote listener → local destination. All listeners use 127.0.0.1. Each route needs the remote owner's approval.", TextWrapping = TextWrapping.Wrap },
            reverse, listen, host, destination, create, _list, stop, _status
        } } };
        session.Changed += Refresh;
        session.Ended += SessionEnded;
        Closing += (_, e) => { if (!_ended) { e.Cancel = true; Hide(); } };
        Closed += (_, _) => { session.Changed -= Refresh; session.Ended -= SessionEnded; };
        Refresh();
    }
    private void Refresh() => Dispatcher.UIThread.Post(() => _list.ItemsSource = _session.Active);
    private void SessionEnded() => Dispatcher.UIThread.Post(() => { _ended = true; Close(); });
    public static async Task<bool> RequestApprovalAsync(Window owner, TunnelConfiguration configuration)
    {
        return await Dispatcher.UIThread.InvokeAsync(async () =>
        {
            var dialog = new Window { Title = "IPCast — Allow TCP tunnel?", Width = 500, SizeToContent = SizeToContent.Height,
                WindowStartupLocation = WindowStartupLocation.CenterOwner };
            var approve = new Button { Content = "Allow this route" };
            var deny = new Button { Content = "Deny" };
            approve.Click += (_, _) => dialog.Close(true); deny.Click += (_, _) => dialog.Close(false);
            dialog.Content = new StackPanel { Margin = new Avalonia.Thickness(24), Spacing = 16, Children =
            {
                new TextBlock { Text = configuration.ToString(), TextWrapping = TextWrapping.Wrap },
                new TextBlock { Text = configuration.Reverse
                    ? "Applications on this device will reach the destination through the connected remote device."
                    : "The remote device will gain TCP access to this destination from your network.", TextWrapping = TextWrapping.Wrap },
                approve, deny
            } };
            return await dialog.ShowDialog<bool>(owner);
        });
    }
}
