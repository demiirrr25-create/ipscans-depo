using Avalonia;
using Avalonia.Controls;
using Avalonia.Interactivity;
using Avalonia.Media;
using IPCast.Client.ViewModels;
using IPCast.Security;

namespace IPCast.Client.Views;

public partial class MainWindow
{
    private async void OnTwoFactorClick(object? sender, RoutedEventArgs e)
    {
        if (DataContext is not MainWindowViewModel vm || !vm.IsUnattendedAccessEnabled) return;
        var enabled = vm.IsTwoFactorEnabled;
        var secret = enabled ? "" : Totp.CreateSecret();
        var input = new TextBox { PlaceholderText = enabled ? "Unattended access password" : "6-digit code", PasswordChar = enabled ? '●' : '\0', MaxLength = enabled ? 200 : 6 };
        var status = new TextBlock { TextWrapping = TextWrapping.Wrap };
        var apply = new Button { Content = enabled ? "Disable two-factor authentication" : "Verify and enable", Classes = { "primary" } };
        var cancel = new Button { Content = "Cancel" };
        var dialog = new Window { Title = "IPCast — Two-factor authentication", Width = 530, SizeToContent = SizeToContent.Height, WindowStartupLocation = WindowStartupLocation.CenterOwner };
        var content = new StackPanel { Margin = new Thickness(24), Spacing = 14 };
        content.Children.Add(new TextBlock { Text = enabled ? "Two-factor authentication is enabled" : "Protect unattended access", FontSize = 22 });
        content.Children.Add(new TextBlock { Text = enabled ? "Enter your unattended access password to disable the authenticator requirement." : "Add a time-based account in your authenticator app using this setup key (SHA-1, 6 digits, 30 seconds). Keep the key private. Enter its current code to finish setup.", TextWrapping = TextWrapping.Wrap });
        if (!enabled) content.Children.Add(new TextBox { Text = secret, IsReadOnly = true, FontFamily = new FontFamily("Consolas"), FontSize = 17 });
        content.Children.Add(input); content.Children.Add(status);
        content.Children.Add(new StackPanel { Orientation = Avalonia.Layout.Orientation.Horizontal, Spacing = 10, Children = { cancel, apply } });
        dialog.Content = content;
        cancel.Click += (_, _) => dialog.Close();
        apply.Click += (_, _) =>
        {
            try
            {
                if (enabled) vm.DisableTwoFactor(input.Text ?? ""); else vm.EnableTwoFactor(secret, input.Text ?? "");
                input.Text = ""; dialog.Close();
            }
            catch (Exception ex) { status.Text = ex.Message; }
        };
        await dialog.ShowDialog(this);
    }
}
