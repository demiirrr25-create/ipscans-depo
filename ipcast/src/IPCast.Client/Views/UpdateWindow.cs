using Avalonia.Controls;
using Avalonia.Media;
using IPCast.Network;
using IPCast.Shared;

namespace IPCast.Client.Views;

public sealed class UpdateWindow : Window
{
    private readonly GitHubUpdater _updater = new();
    private readonly CancellationTokenSource _cts = new();
    public UpdateWindow()
    {
        Title = "IPCast — Updates"; Width = 580; Height = 490;
        var status = new TextBlock { Text = "Checking releases…", TextWrapping = TextWrapping.Wrap };
        var notes = new TextBox { IsReadOnly = true, AcceptsReturn = true, TextWrapping = TextWrapping.Wrap, MinHeight = 200 };
        var progress = new ProgressBar { Minimum = 0, Maximum = 100 };
        var install = new Button { Content = "Download & Install", IsVisible = false };
        var cancel = new Button { Content = "Cancel download" }; cancel.Click += (_, _) => Close();
        Content = new StackPanel { Margin = new Avalonia.Thickness(24), Spacing = 16, Children = { status, notes, progress, install, cancel } };
        Closed += (_, _) => { _cts.Cancel(); _updater.Dispose(); };
        Opened += async (_, _) =>
        {
            try
            {
                var current = System.Reflection.Assembly.GetEntryAssembly()?.GetName().Version ?? new Version(2, 1, 0);
                var update = await _updater.CheckAsync(new Version(current.Major, current.Minor, current.Build), _cts.Token);
                if (update is null) { status.Text = "IPCast is up to date."; return; }
                status.Text = $"IPCast {update.Version} available · {update.Size / 1048576d:0.0} MiB";
                notes.Text = update.Notes; install.IsVisible = OperatingSystem.IsWindows();
                install.Click += async (_, _) =>
                {
                    install.IsEnabled = false;
                    try
                    {
                        if (!await SessionActions.ConfirmAsync(this, "Install update",
                            "This installer is unsigned. IPCast verifies its SHA-256 against GitHub's HTTPS release metadata, but this does not verify a code-signing publisher. Continue?")) return;
                        var path = await _updater.DownloadAsync(update, Path.Combine(AppPaths.GetAppDataDirectory(), "updates"),
                            new Progress<double>(value => progress.Value = value), _cts.Token);
                        await GitHubUpdater.VerifyFileAsync(path, update);
                        System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(path) { UseShellExecute = true });
                        status.Text = "Verified installer opened. Follow its instructions to finish the update.";
                    }
                    catch (OperationCanceledException) { status.Text = "Download cancelled."; }
                    catch (Exception ex) { status.Text = ex.Message; }
                    finally { install.IsEnabled = true; }
                };
            }
            catch (OperationCanceledException) { }
            catch (Exception ex) { status.Text = "Unable to check for updates: " + ex.Message; }
        };
    }
}
