using System.Collections.Concurrent;
using System.Text.Json;
using System.Threading.Channels;
using IPCast.Network;
using IPCast.Network.Protocol;

namespace IPCast.FileTransfer;

public sealed class FileManagerSession : IAsyncDisposable
{
    private readonly SessionMessageLoop _loop;
    private readonly bool _allowed;
    private SharedFileSystem? _shared;
    private readonly CancellationTokenSource _lifetime = new();
    private readonly ConcurrentDictionary<string, TaskCompletionSource<FileSystemResponse>> _pending = new();
    private readonly Channel<FileSystemRequest> _requests = Channel.CreateBounded<FileSystemRequest>(8);
    private readonly Task _worker;
    private int _ended;
    public string RemoteDeviceId { get; }
    public event Action? Ended;

    public FileManagerSession(SessionMessageLoop loop, RemoteSession session)
    {
        _loop = loop;
        _allowed = session.GrantedPermissions.HasFlag(ConnectionPermissions.FileTransfer);
        RemoteDeviceId = session.RemoteDeviceId.Formatted;
        loop.MessageReceived += OnMessage;
        loop.Ended += OnEnded;
        _worker = Task.Run(ProcessAsync);
    }

    public void ShareFolder(string? path) =>
        Volatile.Write(ref _shared, path is null ? null : new SharedFileSystem(path));

    private void OnEnded() { if (Interlocked.Exchange(ref _ended, 1) != 0) return; _lifetime.Cancel(); Ended?.Invoke(); }

    private void OnMessage(MessageType type, JsonElement payload)
    {
        if (type == MessageType.FileSystemResponse)
        {
            var response = payload.Deserialize<FileSystemResponse>();
            if (response is not null && _pending.TryRemove(response.Id, out var pending)) pending.TrySetResult(response);
        }
        else if (type == MessageType.FileSystemRequest)
        {
            var request = payload.Deserialize<FileSystemRequest>();
            if (request is null || string.IsNullOrEmpty(request.Id) || request.Id.Length > 64 || request.Path is null || request.Operation is null ||
                request.Data?.Length > SharedFileSystem.ChunkSize || !_requests.Writer.TryWrite(request))
                throw new InvalidDataException("Invalid or excessive file manager requests.");
        }
    }

    private async Task ProcessAsync()
    {
        try
        {
            await foreach (var request in _requests.Reader.ReadAllAsync(_lifetime.Token))
            {
                var shared = Volatile.Read(ref _shared);
                var result = !_allowed || shared is null
                    ? new FileSystemResponse(request.Id, false, "The peer must grant file transfer and choose a shared folder.")
                    : shared.Execute(request);
                if (result.Success && request.Operation is "finish" or "delete" or "move" or "copy" or "mkdir")
                    IPCast.Shared.AuditLog.Default.Write(IPCast.Shared.AuditEvent.FileTransferred, deviceId: RemoteDeviceId);
                await _loop.SendAsync(MessageType.FileSystemResponse, result, _lifetime.Token).ConfigureAwait(false);
            }
        }
        catch (OperationCanceledException) { }
        catch (Exception) { OnEnded(); }
    }

    public async Task<FileSystemResponse> RequestAsync(FileSystemRequest request, CancellationToken ct = default)
    {
        if (!_allowed) throw new UnauthorizedAccessException("File transfer permission was not granted.");
        if (_pending.Count >= 8) throw new InvalidOperationException("Too many file operations in progress.");
        var id = Guid.NewGuid().ToString("N");
        var pending = new TaskCompletionSource<FileSystemResponse>(TaskCreationOptions.RunContinuationsAsynchronously);
        _pending[id] = pending;
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct, _lifetime.Token);
        timeout.CancelAfter(TimeSpan.FromMinutes(2));
        try
        {
            await _loop.SendAsync(MessageType.FileSystemRequest, request with { Id = id }, timeout.Token).ConfigureAwait(false);
            var result = await pending.Task.WaitAsync(timeout.Token).ConfigureAwait(false);
            if (!result.Success) throw new IOException(result.Error ?? "File operation failed.");
            return result;
        }
        finally { _pending.TryRemove(id, out _); }
    }

    public async ValueTask DisposeAsync()
    {
        OnEnded();
        _loop.MessageReceived -= OnMessage;
        _loop.Ended -= OnEnded;
        await _lifetime.CancelAsync();
        await _worker;
        _lifetime.Dispose();
    }
}
