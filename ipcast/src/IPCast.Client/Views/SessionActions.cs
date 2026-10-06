using Avalonia.Controls;
using Avalonia.Media;
using Avalonia.Threading;

namespace IPCast.Client.Views;

internal static class SessionActions
{
    public static Task<bool> ConfirmRestartAsync(Window owner) => Dispatcher.UIThread.InvokeAsync(async () =>
    {
        if (!OperatingSystem.IsWindows()) return false;
        var approved = await ConfirmAsync(owner, "Restart requested", "The connected device requests restarting this computer now. Save your work before accepting. Windows may ask you to close applications.");
        if (!approved) return false;
        var start = new System.Diagnostics.ProcessStartInfo(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System), "shutdown.exe"))
        { UseShellExecute = false, CreateNoWindow = true };
        foreach (var argument in new[] { "/r", "/t", "0" }) start.ArgumentList.Add(argument);
        using var process = System.Diagnostics.Process.Start(start);
        if (process is null) return false;
        await process.WaitForExitAsync();
        return process.ExitCode == 0;
    });

    public static async Task<bool> ConfirmAsync(Window owner, string title, string message)
    {
        var dialog = new Window { Title = "IPCast — " + title, Width = 480, SizeToContent = SizeToContent.Height, WindowStartupLocation = WindowStartupLocation.CenterOwner };
        var accept = new Button { Content = "Confirm" }; var cancel = new Button { Content = "Cancel" };
        accept.Click += (_, _) => dialog.Close(true); cancel.Click += (_, _) => dialog.Close(false);
        dialog.Content = new StackPanel { Margin = new Avalonia.Thickness(24), Spacing = 16, Children =
        { new TextBlock { Text = message, TextWrapping = TextWrapping.Wrap }, accept, cancel } };
        return await dialog.ShowDialog<bool>(owner);
    }
}
