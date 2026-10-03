using Avalonia;
using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Input.Platform;
using Avalonia.Interactivity;
using Avalonia.Platform.Storage;
using Avalonia.VisualTree;
using IPCast.Client.Persistence;
using IPCast.Client.ViewModels;

namespace IPCast.Client.Views;

public partial class MainWindow
{
    private void OnHomeClick(object? s, RoutedEventArgs e) { if (DataContext is MainWindowViewModel vm) vm.Navigate(NavSection.Home); RemoteIdTextBox.Focus(); }
    private void OnAddressBookClick(object? s, RoutedEventArgs e) { if (DataContext is MainWindowViewModel vm) vm.Navigate(NavSection.MyDevices); }
    private void OnSettingsClick(object? s, RoutedEventArgs e) { if (DataContext is MainWindowViewModel vm) vm.Navigate(NavSection.Settings); }
    private void OnAccessSettingsClick(object? s, RoutedEventArgs e)
    { if (DataContext is MainWindowViewModel vm) { vm.SettingsCategory = "Access"; vm.SettingsQuery = ""; vm.Navigate(NavSection.Settings); } }
    private async void OnRefreshDiscoveryClick(object? s, RoutedEventArgs e)
    { if (DataContext is MainWindowViewModel vm) await vm.RefreshDiscoveredDevicesAsync(); }
    private void OnDeviceDoubleTapped(object? s, TappedEventArgs e)
    {
        if (e.Source is Control control && (control is Button || control.GetVisualAncestors().OfType<Button>().Any())) return;
        OnFavoriteContextConnect(s, e);
    }
    private void OnFavoriteFilesClick(object? s, RoutedEventArgs e)
    {
        if (DataContext is MainWindowViewModel vm) { vm.SelectedPermissionProfile = "File transfer"; vm.ShowConnectionOptions = true; OnFavoriteContextConnect(s, e); }
    }
    private async void OnCopyDeviceClick(object? s, RoutedEventArgs e)
    {
        if (FavoriteFrom(s) is not { } device || Clipboard is null) return;
        try { await Clipboard.SetTextAsync(device.FormattedId); }
        catch (Exception ex) { if (DataContext is MainWindowViewModel vm) vm.StatusMessage = ex.Message; }
    }
    private async void OnDeviceDetailsClick(object? s, RoutedEventArgs e)
    {
        if (DataContext is not MainWindowViewModel vm || FavoriteFrom(s) is not { } device) return;
        var group = new TextBox { Text = device.Group, MaxLength = 80 };
        var tags = new TextBox { Text = device.Tags, MaxLength = 300 };
        var notes = new TextBox { Text = device.Notes, MaxLength = 2000, AcceptsReturn = true, MinHeight = 90, TextWrapping = Avalonia.Media.TextWrapping.Wrap };
        var save = new Button { Content = "Save", Classes = { "primary" } };
        var cancel = new Button { Content = "Cancel" };
        var dialog = new Window { Title = "Device details — " + device.Name, Width = 480, SizeToContent = SizeToContent.Height, WindowStartupLocation = WindowStartupLocation.CenterOwner };
        dialog.Content = new StackPanel { Margin = new Thickness(24), Spacing = 12, Children = {
            new TextBlock { Text = device.FormattedId, FontSize = 22 }, new TextBlock { Text = "Group" }, group,
            new TextBlock { Text = "Tags (comma separated)" }, tags, new TextBlock { Text = "Notes" }, notes,
            new StackPanel { Orientation = Avalonia.Layout.Orientation.Horizontal, Spacing = 10, Children = { cancel, save } }
        } };
        cancel.Click += (_, _) => dialog.Close();
        save.Click += (_, _) => { try { vm.UpdateDeviceDetails(device, group.Text ?? "", tags.Text ?? "", notes.Text ?? ""); dialog.Close(); } catch (Exception ex) { vm.StatusMessage = ex.Message; } };
        await dialog.ShowDialog(this);
    }
    private async void OnExportDevicesClick(object? s, RoutedEventArgs e)
    {
        if (DataContext is not MainWindowViewModel vm) return;
        var file = await StorageProvider.SaveFilePickerAsync(new FilePickerSaveOptions { Title = "Export address book", SuggestedFileName = "IPCast-address-book.json", DefaultExtension = "json", ShowOverwritePrompt = true });
        if (file is null) return;
        try { await using var stream = await file.OpenWriteAsync(); stream.SetLength(0); await using var writer = new StreamWriter(stream); await writer.WriteAsync(vm.ExportDevices()); vm.FavoritesMessage = "Address book exported."; }
        catch (Exception ex) { vm.FavoritesMessage = "Export failed: " + ex.Message; }
    }
    private async void OnImportDevicesClick(object? s, RoutedEventArgs e)
    {
        if (DataContext is not MainWindowViewModel vm) return;
        var files = await StorageProvider.OpenFilePickerAsync(new FilePickerOpenOptions { Title = "Import address book", FileTypeFilter = [new FilePickerFileType("IPCast address book") { Patterns = ["*.json"] }] });
        if (files.Count == 0) return;
        try
        {
            await using var stream = await files[0].OpenReadAsync();
            if (stream.CanSeek && stream.Length > 2_000_000) throw new InvalidDataException("Maximum import size is 2 MB.");
            using var reader = new StreamReader(stream); var buffer = new char[2_000_001];
            var length = await reader.ReadBlockAsync(buffer, 0, buffer.Length);
            if (length > 2_000_000) throw new InvalidDataException("Maximum import size is 2 MB.");
            var count = vm.ImportDevices(new string(buffer, 0, length));
            vm.FavoritesMessage = $"Imported {count} devices. Existing devices were preserved.";
        }
        catch (Exception ex) { vm.FavoritesMessage = "Import failed: " + ex.Message; }
    }
    private async void OnExportHistoryClick(object? s, RoutedEventArgs e)
    {
        if (DataContext is not MainWindowViewModel vm) return;
        var file = await StorageProvider.SaveFilePickerAsync(new FilePickerSaveOptions { Title = "Export session history", SuggestedFileName = "IPCast-sessions.csv", DefaultExtension = "csv", ShowOverwritePrompt = true });
        if (file is null) return;
        try
        {
            static string Cell(string value) => "\"" + (value.Length > 0 && "=+-@".Contains(value[0]) ? "'" : "") + value.Replace("\"", "\"\"") + "\"";
            var lines = vm.ConnectionHistory.Select(h => string.Join(",", new[] { h.TimestampUtc.ToString("O"), h.RemoteId, h.Direction, h.Status }.Select(Cell)));
            await using var stream = await file.OpenWriteAsync(); stream.SetLength(0); await using var writer = new StreamWriter(stream);
            await writer.WriteAsync("Timestamp (UTC),Address,Direction,Status\r\n" + string.Join("\r\n", lines)); vm.StatusMessage = "Session history exported.";
        }
        catch (Exception ex) { vm.StatusMessage = "Export failed: " + ex.Message; }
    }
    private void OnOpenRecordingsClick(object? s, RoutedEventArgs e)
    {
        if (DataContext is not MainWindowViewModel vm) return;
        var directory = string.IsNullOrWhiteSpace(vm.RecordingDirectory) ? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyVideos), "IPCast") : vm.RecordingDirectory;
        try { Directory.CreateDirectory(directory); System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(directory) { UseShellExecute = true }); }
        catch (Exception ex) { vm.StatusMessage = "Could not open recordings: " + ex.Message; }
    }
}
