using Avalonia.Controls;
using Avalonia.Interactivity;
using IPCast.Network;

namespace IPCast.Client.Views;
public partial class RemoteScreenWindow
{
    private void OnPermissionsClick(object? sender, RoutedEventArgs e)
    {
        _informationTimer.Stop();
        InformationPanel.IsVisible = true;
        InformationText.Text = "Granted by the remote owner:\n" + _desktop.GrantedPermissionsDescription +
            "\n\nTo change permissions, disconnect and request a new session. The owner can stop access at any time.";
    }
    private SessionTools? _tools;
    public void ConfigureTools(SessionTools tools)
    {
        _tools = tools; DeviceInfoButton.IsVisible = tools.CanReadInformation; RestartButton.IsVisible = tools.CanRestart;
    }
    private async void OnDeviceInfoClick(object? sender, RoutedEventArgs e)
    {
        try
        {
            var result = await _tools!.GetInformationAsync();
            var info = result.Information ?? throw new IOException("No system information received.");
            _informationTimer.Stop();
            InformationPanel.IsVisible = true;
            InformationText.Text = $"{info.Name}\n{info.Platform}\n{info.Architecture} · {info.Processors} processors\nIPCast {info.Version}";
        }
        catch (Exception ex) { Title = "IPCast — " + ex.Message; }
    }
    private async void OnRestartClick(object? sender, RoutedEventArgs e)
    {
        if (!await SessionActions.ConfirmAsync(this, "Request restart", "Ask the remote owner to restart their device? Your session will disconnect if they accept.")) return;
        try { await _tools!.RestartAsync(); Title = "IPCast — Remote restart accepted"; }
        catch (Exception ex) { Title = "IPCast — " + ex.Message; }
    }
    private async void OnAltTabClick(object? sender, RoutedEventArgs e)
    {
        if (_inputPaused) return;
        await ReleaseInputAsync();
        try { await SendSafely(() => _desktop.SendKeyEventAsync(0x12, true)); await SendSafely(() => _desktop.SendKeyEventAsync(0x09, true)); }
        finally { await SendSafely(() => _desktop.SendKeyEventAsync(0x09, false)); await SendSafely(() => _desktop.SendKeyEventAsync(0x12, false)); }
    }
    private async void OnWindowsKeyClick(object? sender, RoutedEventArgs e)
    {
        if (_inputPaused) return;
        await SendSafely(() => _desktop.SendKeyEventAsync(0x5b, true));
        await SendSafely(() => _desktop.SendKeyEventAsync(0x5b, false));
    }
    private async void OnTypeTextClick(object? sender, RoutedEventArgs e)
    {
        if (_inputPaused) return;
        var input = new TextBox { AcceptsReturn = true, MaxLength = 4000, MinHeight = 120, PlaceholderText = "Text to type on the remote device" };
        var send = new Button { Content = "Type text" };
        var dialog = new Window { Title = "IPCast — Type Unicode text", Width = 460, SizeToContent = SizeToContent.Height };
        dialog.Content = new StackPanel { Margin = new Avalonia.Thickness(24), Spacing = 12, Children = { input, send } };
        send.Click += async (_, _) => { await SendSafely(() => _desktop.SendTextAsync(input.Text ?? "")); dialog.Close(); };
        await dialog.ShowDialog(this);
    }
}
