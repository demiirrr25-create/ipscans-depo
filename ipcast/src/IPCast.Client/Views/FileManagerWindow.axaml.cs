using System.Diagnostics;
using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Interactivity;
using Avalonia.Platform.Storage;
using Avalonia.Threading;
using IPCast.FileTransfer;

namespace IPCast.Client.Views;

public partial class FileManagerWindow : Window
{
    private readonly FileManagerSession? _session;
    private SharedFileSystem _local;
    private string _localRoot;
    private CancellationTokenSource? _transfer;
    private bool _ended;
    private PointerPressedEventArgs? _dragStart;
    private Avalonia.Point _dragOrigin;
    private string? _dragRemoteFile;
    public FileManagerWindow()
    {
        InitializeComponent();
        _localRoot = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
        _local = new SharedFileSystem(_localRoot);
        LocalRootText.Text = _localRoot;
        DragDrop.SetAllowDrop(RemoteFiles, true);
        DragDrop.SetAllowDrop(LocalFiles, true);
        RemoteFiles.AddHandler(DragDrop.DragOverEvent, (_, e) => e.DragEffects =
            e.DataTransfer.TryGetFiles()?.Any() == true && _transfer is null ? DragDropEffects.Copy : DragDropEffects.None);
        RemoteFiles.AddHandler(DragDrop.DropEvent, async (_, e) =>
        {
            var paths = e.DataTransfer.TryGetFiles()?.Select(f => f.TryGetLocalPath()).OfType<string>().ToArray() ?? [];
            await UploadExternalFilesAsync(paths);
        });
        LocalFiles.AddHandler(DragDrop.DragOverEvent, (_, e) => e.DragEffects =
            _dragRemoteFile is not null && e.DataTransfer.TryGetText() == "IPCast remote file" ? DragDropEffects.Copy : DragDropEffects.None);
        LocalFiles.AddHandler(DragDrop.DropEvent, async (_, e) =>
        {
            if (_dragRemoteFile is not null && e.DataTransfer.TryGetText() == "IPCast remote file")
                await TransferAsync(true, remoteSource: _dragRemoteFile);
        });
        RemoteFiles.PointerPressed += (_, e) => { _dragStart = e; _dragOrigin = e.GetPosition(this); };
        RemoteFiles.PointerReleased += (_, _) => _dragStart = null;
        RemoteFiles.PointerMoved += async (_, e) =>
        {
            var delta = e.GetPosition(this) - _dragOrigin;
            if (_dragStart is null || !e.GetCurrentPoint(RemoteFiles).Properties.IsLeftButtonPressed ||
                delta.X * delta.X + delta.Y * delta.Y < 36 ||
                RemoteFiles.SelectedItem is not FileEntry { IsDirectory: false } item) return;
            var start = _dragStart; _dragStart = null;
            _dragRemoteFile = Join(RemotePath.Text, item.Name);
            var data = new DataTransfer(); data.Add(DataTransferItem.CreateText("IPCast remote file"));
            try { await DragDrop.DoDragDropAsync(start, data, DragDropEffects.Copy); }
            finally { _dragRemoteFile = null; }
        };
    }
    public FileManagerWindow(FileManagerSession session) : this()
    {
        _session = session;
        RemoteTitle.Text = $"REMOTE DEVICE · {session.RemoteDeviceId}";
        session.Ended += OnEnded;
        Opened += async (_, _) => await RefreshAsync(false);
        Closing += (_, e) => { if (!_ended) { e.Cancel = true; Hide(); } };
        Closed += (_, _) => { _transfer?.Cancel(); session.Ended -= OnEnded; };
    }
    private void OnEnded() => Dispatcher.UIThread.Post(() => { _ended = true; Close(); });
    private Task<FileSystemResponse> LocalAsync(FileSystemRequest request, CancellationToken ct) =>
        Task.Run(() => { ct.ThrowIfCancellationRequested(); return _local.Execute(request); }, ct);
    private Task<FileSystemResponse> RemoteAsync(FileSystemRequest request, CancellationToken ct) =>
        _session!.RequestAsync(request, ct);
    private static string Join(string? directory, string name) => string.IsNullOrEmpty(directory) ? name : directory.TrimEnd('/') + "/" + name;
    private static string ParentPath(string? path) => string.IsNullOrEmpty(path) || !path.Contains('/') ? "" : path[..path.LastIndexOf('/')];

    private async Task RefreshAsync(bool remote)
    {
        try
        {
            var response = await (remote ? RemoteAsync : (ManagedFileCopy.Endpoint)LocalAsync)(
                new("", "list", (remote ? RemotePath.Text : LocalPath.Text) ?? ""), default);
            if (!response.Success) throw new IOException(response.Error);
            (remote ? RemoteFiles : LocalFiles).ItemsSource = response.Entries;
        }
        catch (Exception ex) { OperationStatus.Text = ex.Message; }
    }
    private async void OnChooseFolder(object? sender, RoutedEventArgs e)
    {
        var folders = await StorageProvider.OpenFolderPickerAsync(new FolderPickerOpenOptions { Title = "Local file manager folder" });
        if (folders.FirstOrDefault()?.TryGetLocalPath() is not { } path) return;
        try { _local = new SharedFileSystem(path); _localRoot = path; LocalRootText.Text = path; LocalPath.Text = ""; await RefreshAsync(false); }
        catch (Exception ex) { OperationStatus.Text = ex.Message; }
    }
    private void OnShareFolder(object? sender, RoutedEventArgs e)
    {
        try { _session?.ShareFolder(_localRoot); ShareStatus.Text = $"SHARING: {_localRoot} — the peer may read, upload, rename and delete files here until this session ends."; }
        catch (Exception ex) { OperationStatus.Text = ex.Message; }
    }
    private void OnStopSharing(object? sender, RoutedEventArgs e) { _session?.ShareFolder(null); ShareStatus.Text = "Folder sharing stopped."; }
    private async void OnLocalRefresh(object? sender, RoutedEventArgs e) => await RefreshAsync(false);
    private async void OnRemoteRefresh(object? sender, RoutedEventArgs e) => await RefreshAsync(true);
    private async void OnLocalUp(object? sender, RoutedEventArgs e) { LocalPath.Text = ParentPath(LocalPath.Text); await RefreshAsync(false); }
    private async void OnRemoteUp(object? sender, RoutedEventArgs e) { RemotePath.Text = ParentPath(RemotePath.Text); await RefreshAsync(true); }
    private async void OnLocalOpen(object? sender, TappedEventArgs e) { if (LocalFiles.SelectedItem is FileEntry { IsDirectory: true } item) { LocalPath.Text = Join(LocalPath.Text, item.Name); await RefreshAsync(false); } }
    private async void OnRemoteOpen(object? sender, TappedEventArgs e) { if (RemoteFiles.SelectedItem is FileEntry { IsDirectory: true } item) { RemotePath.Text = Join(RemotePath.Text, item.Name); await RefreshAsync(true); } }
    private async void OnUpload(object? sender, RoutedEventArgs e) => await TransferAsync(false);
    private async void OnDownload(object? sender, RoutedEventArgs e) => await TransferAsync(true);
    private void OnCancel(object? sender, RoutedEventArgs e) => _transfer?.Cancel();

    public async Task UploadExternalFilesAsync(IEnumerable<string> paths)
    {
        Show();
        foreach (var path in paths.Where(File.Exists).Take(100))
        {
            if (_ended || _transfer is not null) break;
            await TransferAsync(false, path);
        }
    }

    private async Task TransferAsync(bool download, string? externalFile = null, string? remoteSource = null)
    {
        var entry = externalFile is not null ? new FileEntry(Path.GetFileName(externalFile), false, new FileInfo(externalFile).Length, DateTime.UtcNow)
            : remoteSource is not null ? new FileEntry(remoteSource.Split('/')[^1], false, 0, DateTime.UtcNow)
            : (download ? RemoteFiles : LocalFiles).SelectedItem as FileEntry;
        if (_transfer is not null || entry is null || entry.IsDirectory) return;
        _transfer = new CancellationTokenSource();
        Operations.IsEnabled = false; CancelButton.IsEnabled = true;
        var watch = Stopwatch.StartNew();
        long initial = -1;
        var progress = new Progress<FileTransferProgress>(p =>
        {
            if (initial < 0) initial = p.BytesTransferred;
            var speed = (p.BytesTransferred - initial) / Math.Max(0.01, watch.Elapsed.TotalSeconds);
            var remaining = Math.Max(0, p.TotalBytes - p.BytesTransferred);
            TransferProgress.Value = p.FractionComplete * 100;
            OperationStatus.Text = $"{entry.Name} · {p.BytesTransferred:N0}/{p.TotalBytes:N0} bytes · {speed / 1024:0.0} KiB/s · Remaining {remaining:N0} bytes · ETA {(speed > 0 ? TimeSpan.FromSeconds(Math.Clamp(remaining / speed, 0, 31536000)).ToString(@"d\.hh\:mm\:ss") : "calculating")}";
        });
        try
        {
            OperationStatus.Text = "Inspecting file and preparing verified transfer…";
            var localPath = externalFile is null ? Join(LocalPath.Text, entry.Name) : entry.Name;
            var remotePath = remoteSource ?? Join(RemotePath.Text, entry.Name);
            ManagedFileCopy.Endpoint localEndpoint = LocalAsync;
            if (externalFile is not null)
            {
                var external = new SharedFileSystem(Path.GetDirectoryName(externalFile)!);
                localEndpoint = (r, ct) => Task.Run(() => external.Execute(r), ct);
            }
            await ManagedFileCopy.CopyAsync(download ? RemoteAsync : localEndpoint, download ? localEndpoint : RemoteAsync,
                download ? remotePath : localPath, download ? localPath : remotePath,
                ResumeCheck.IsChecked == true, progress, _transfer.Token);
            OperationStatus.Text = $"{entry.Name} transferred and SHA-256 verified.";
            await RefreshAsync(!download);
        }
        catch (OperationCanceledException) { OperationStatus.Text = "Transfer cancelled. Matching partial data is retained for resume."; }
        catch (Exception ex) { OperationStatus.Text = ex.Message; }
        finally { Operations.IsEnabled = true; CancelButton.IsEnabled = false; _transfer.Dispose(); _transfer = null; }
    }

    private async Task<string?> PromptAsync(string title, string initial = "")
    {
        var dialog = new Window { Title = title, Width = 460, SizeToContent = SizeToContent.Height, WindowStartupLocation = WindowStartupLocation.CenterOwner };
        var input = new TextBox { Text = initial, Margin = new Avalonia.Thickness(16) };
        var confirm = new Button { Content = "Confirm", Margin = new Avalonia.Thickness(16) };
        var cancel = new Button { Content = "Cancel", Margin = new Avalonia.Thickness(16) };
        confirm.Click += (_, _) => dialog.Close(input.Text);
        cancel.Click += (_, _) => dialog.Close();
        dialog.Content = new StackPanel { Children = { input, confirm, cancel } };
        return await dialog.ShowDialog<string?>(this);
    }
    private async Task OperateAsync(bool remote, string operation)
    {
        if (_transfer is not null) return;
        var entry = (remote ? RemoteFiles : LocalFiles).SelectedItem as FileEntry;
        var directory = (remote ? RemotePath.Text : LocalPath.Text) ?? "";
        if (operation != "mkdir" && entry is null) return;
        var path = entry is null ? "" : Join(directory, entry.Name);
        string? destination = null;
        if (operation == "delete")
        {
            if (await PromptAsync($"Type DELETE to remove {entry!.Name}") != "DELETE") return;
        }
        else
        {
            var answer = await PromptAsync(operation == "mkdir" ? "New folder name" : "Destination path relative to this folder", operation == "rename" ? entry!.Name : "");
            if (string.IsNullOrWhiteSpace(answer)) return;
            if (operation == "mkdir") path = Join(directory, answer);
            else destination = Join(directory, answer);
        }
        try
        {
            var result = await (remote ? RemoteAsync : (ManagedFileCopy.Endpoint)LocalAsync)(new("", operation, path, destination), default);
            if (!result.Success) throw new IOException(result.Error);
            OperationStatus.Text = "File operation completed.";
            await RefreshAsync(remote);
        }
        catch (Exception ex) { OperationStatus.Text = ex.Message; }
    }
    private async void OnLocalMkdir(object? s, RoutedEventArgs e) => await OperateAsync(false, "mkdir");
    private async void OnRemoteMkdir(object? s, RoutedEventArgs e) => await OperateAsync(true, "mkdir");
    private async void OnLocalRename(object? s, RoutedEventArgs e) => await OperateAsync(false, "rename");
    private async void OnRemoteRename(object? s, RoutedEventArgs e) => await OperateAsync(true, "rename");
    private async void OnLocalCopy(object? s, RoutedEventArgs e) => await OperateAsync(false, "copy");
    private async void OnRemoteCopy(object? s, RoutedEventArgs e) => await OperateAsync(true, "copy");
    private async void OnLocalMove(object? s, RoutedEventArgs e) => await OperateAsync(false, "move");
    private async void OnRemoteMove(object? s, RoutedEventArgs e) => await OperateAsync(true, "move");
    private async void OnLocalDelete(object? s, RoutedEventArgs e) => await OperateAsync(false, "delete");
    private async void OnRemoteDelete(object? s, RoutedEventArgs e) => await OperateAsync(true, "delete");
}
