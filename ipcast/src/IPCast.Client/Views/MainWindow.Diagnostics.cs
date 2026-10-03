using Avalonia.Interactivity;
using Avalonia.Platform.Storage;
using IPCast.Client.ViewModels;
using IPCast.Shared;

namespace IPCast.Client.Views;

public partial class MainWindow
{
    private void OnCheckUpdatesClick(object? sender, RoutedEventArgs e) => new UpdateWindow().Show(this);
    private void OnOpenLogsClick(object? sender, RoutedEventArgs e)
    {
        try
        {
            Directory.CreateDirectory(AuditLog.Default.DirectoryPath);
            System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(AuditLog.Default.DirectoryPath) { UseShellExecute = true });
        }
        catch (Exception ex) { if (DataContext is MainWindowViewModel vm) vm.StatusMessage = "Unable to open logs: " + ex.Message; }
    }

    private async void OnExportDiagnosticsClick(object? sender, RoutedEventArgs e)
    {
        if (DataContext is not MainWindowViewModel vm) return;
        try
        {
            var file = await StorageProvider.SaveFilePickerAsync(new FilePickerSaveOptions
            { Title = "Export diagnostics to a new file", SuggestedFileName = $"IPCast-diagnostics-{DateTime.Now:yyyyMMdd-HHmmss}.zip", DefaultExtension = "zip" });
            if (file?.TryGetLocalPath() is not { } path) return;
            await Task.Run(() => AuditLog.Default.Export(path, vm.VersionLabel));
            vm.StatusMessage = "Diagnostics exported.";
        }
        catch (Exception ex) { vm.StatusMessage = "Diagnostics export failed: " + ex.Message; }
    }

    private async void OnRecordingDirectoryClick(object? sender, RoutedEventArgs e)
    {
        if (DataContext is not MainWindowViewModel vm) return;
        var folders = await StorageProvider.OpenFolderPickerAsync(new FolderPickerOpenOptions { Title = "Recording folder" });
        if (folders.FirstOrDefault()?.TryGetLocalPath() is { } path) vm.RecordingDirectory = path;
    }
}
