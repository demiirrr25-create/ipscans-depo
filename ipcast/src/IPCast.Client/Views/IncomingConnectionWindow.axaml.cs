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

        RequesterText.Text = $"Device {request.RemoteDeviceId.Formatted} wants to connect to this computer.";

        ViewScreenCheck.IsChecked = request.RequestedPermissions.HasFlag(ConnectionPermissions.ViewScreen);
        ControlMouseCheck.IsChecked = request.RequestedPermissions.HasFlag(ConnectionPermissions.ControlMouse);
        ControlKeyboardCheck.IsChecked = request.RequestedPermissions.HasFlag(ConnectionPermissions.ControlKeyboard);
        ClipboardCheck.IsChecked = request.RequestedPermissions.HasFlag(ConnectionPermissions.Clipboard);
        FileTransferCheck.IsChecked = request.RequestedPermissions.HasFlag(ConnectionPermissions.FileTransfer);
        SystemInfoCheck.IsChecked = request.RequestedPermissions.HasFlag(ConnectionPermissions.SystemInformation);
        RemoteRestartCheck.IsChecked = request.RequestedPermissions.HasFlag(ConnectionPermissions.RemoteRestart);
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
