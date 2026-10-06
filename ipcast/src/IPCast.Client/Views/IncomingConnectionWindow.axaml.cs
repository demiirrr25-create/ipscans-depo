using Avalonia.Controls;
using Avalonia.Interactivity;
using Avalonia.Threading;
using IPCast.Network;

namespace IPCast.Client.Views;

public partial class IncomingConnectionWindow : Window
{
    private readonly IncomingConnectionRequest _request;
    private ConnectionDecision _result;

    public IncomingConnectionWindow()
        : this(new IncomingConnectionRequest(default, ConnectionPermissions.None))
    {
        // Parameterless constructor required by the Avalonia XAML previewer/loader only.
    }

    public IncomingConnectionWindow(IncomingConnectionRequest request)
    {
        _request = request;
        _result = ConnectionDecision.Reject("Dismissed without a response.");
        InitializeComponent();

        DeviceIdText.Text = request.RemoteDeviceId.Formatted;
        RequestTimeText.Text = $"Requested {DateTime.Now:MMM d, HH:mm} · wants to connect to this computer.";

        ViewScreenCheck.IsChecked = request.RequestedPermissions.HasFlag(ConnectionPermissions.ViewScreen);
        ControlMouseCheck.IsChecked = request.RequestedPermissions.HasFlag(ConnectionPermissions.ControlMouse);
        ControlKeyboardCheck.IsChecked = request.RequestedPermissions.HasFlag(ConnectionPermissions.ControlKeyboard);
        ClipboardCheck.IsChecked = request.RequestedPermissions.HasFlag(ConnectionPermissions.Clipboard);
        FileTransferCheck.IsChecked = request.RequestedPermissions.HasFlag(ConnectionPermissions.FileTransfer);
        ChatCheck.IsChecked = request.RequestedPermissions.HasFlag(ConnectionPermissions.Chat);
        ChatCheck.IsEnabled = request.RequestedPermissions.HasFlag(ConnectionPermissions.Chat);
        RecordingCheck.IsChecked = false;
        TunnelCheck.IsChecked = false;
        AudioCheck.IsChecked = false;
        AudioCheck.IsEnabled = request.RequestedPermissions.HasFlag(ConnectionPermissions.Audio) && OperatingSystem.IsWindows();
        TunnelCheck.IsEnabled = request.RequestedPermissions.HasFlag(ConnectionPermissions.TcpTunnel);
        RecordingCheck.IsEnabled = request.RequestedPermissions.HasFlag(ConnectionPermissions.Recording);
        SystemInfoCheck.IsChecked = request.RequestedPermissions.HasFlag(ConnectionPermissions.SystemInformation);
        RemoteRestartCheck.IsChecked = false;
        RemoteRestartCheck.IsEnabled = request.RequestedPermissions.HasFlag(ConnectionPermissions.RemoteRestart) && OperatingSystem.IsWindows();
        SystemInfoCheck.IsEnabled = request.RequestedPermissions.HasFlag(ConnectionPermissions.SystemInformation);
        ProfileSelector.ItemsSource = PermissionProfiles.Names.Concat(["Custom"]).ToArray();
        ProfileSelector.SelectedIndex = 4;
        ViewScreenCheck.IsEnabled = request.RequestedPermissions.HasFlag(ConnectionPermissions.ViewScreen);
        ControlMouseCheck.IsEnabled = request.RequestedPermissions.HasFlag(ConnectionPermissions.ControlMouse);
        ControlKeyboardCheck.IsEnabled = request.RequestedPermissions.HasFlag(ConnectionPermissions.ControlKeyboard);
        ClipboardCheck.IsEnabled = request.RequestedPermissions.HasFlag(ConnectionPermissions.Clipboard);
        FileTransferCheck.IsEnabled = request.RequestedPermissions.HasFlag(ConnectionPermissions.FileTransfer);
    }

    private void OnProfileChanged(object? sender, SelectionChangedEventArgs e)
    {
        if (ProfileSelector.SelectedItem is not string name || name == "Custom") return;
        var permissions = PermissionProfiles.ForName(name) & _request.RequestedPermissions;
        ViewScreenCheck.IsChecked = permissions.HasFlag(ConnectionPermissions.ViewScreen);
        ControlMouseCheck.IsChecked = permissions.HasFlag(ConnectionPermissions.ControlMouse);
        ControlKeyboardCheck.IsChecked = permissions.HasFlag(ConnectionPermissions.ControlKeyboard);
        ClipboardCheck.IsChecked = permissions.HasFlag(ConnectionPermissions.Clipboard);
        FileTransferCheck.IsChecked = permissions.HasFlag(ConnectionPermissions.FileTransfer);
        ChatCheck.IsChecked = permissions.HasFlag(ConnectionPermissions.Chat);
        RecordingCheck.IsChecked = permissions.HasFlag(ConnectionPermissions.Recording);
        TunnelCheck.IsChecked = permissions.HasFlag(ConnectionPermissions.TcpTunnel);
        AudioCheck.IsChecked = AudioCheck.IsEnabled && permissions.HasFlag(ConnectionPermissions.Audio);
        SystemInfoCheck.IsChecked = permissions.HasFlag(ConnectionPermissions.SystemInformation);
        RemoteRestartCheck.IsChecked = RemoteRestartCheck.IsEnabled && permissions.HasFlag(ConnectionPermissions.RemoteRestart);
    }

    private void OnRejectClick(object? sender, RoutedEventArgs e)
    {
        _result = ConnectionDecision.Reject("The user declined the connection.");
        Close();
    }

    private void OnAcceptClick(object? sender, RoutedEventArgs e)
    {
        var granted = ConnectionPermissions.None;
        if (ViewScreenCheck.IsChecked == true) granted |= ConnectionPermissions.ViewScreen;
        if (ControlMouseCheck.IsChecked == true) granted |= ConnectionPermissions.ControlMouse;
        if (ControlKeyboardCheck.IsChecked == true) granted |= ConnectionPermissions.ControlKeyboard;
        if (ClipboardCheck.IsChecked == true) granted |= ConnectionPermissions.Clipboard;
        if (FileTransferCheck.IsChecked == true) granted |= ConnectionPermissions.FileTransfer;
        if (ChatCheck.IsChecked == true) granted |= ConnectionPermissions.Chat;
        if (RecordingCheck.IsChecked == true) granted |= ConnectionPermissions.Recording;
        if (TunnelCheck.IsChecked == true) granted |= ConnectionPermissions.TcpTunnel;
        if (AudioCheck.IsChecked == true) granted |= ConnectionPermissions.Audio;
        if (SystemInfoCheck.IsChecked == true) granted |= ConnectionPermissions.SystemInformation;
        if (RemoteRestartCheck.IsChecked == true) granted |= ConnectionPermissions.RemoteRestart;

        _result = new ConnectionDecision(true, granted);
        Close();
    }

    /// <summary>Shows the dialog on the UI thread and returns the user's decision - safe to call from the TCP accept-loop thread.</summary>
    public static async Task<ConnectionDecision> ShowAsync(Window owner, IncomingConnectionRequest request)
    {
        var pending = await Dispatcher.UIThread.InvokeAsync(async () =>
        {
            var dialog = new IncomingConnectionWindow(request);
            await dialog.ShowDialog(owner);
            return dialog._result;
        });

        return pending;
    }
}
