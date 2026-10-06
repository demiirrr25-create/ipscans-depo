using System.Collections.Concurrent;
using System.Runtime.InteropServices;
using System.Text.Json;
using IPCast.Network.Protocol;

namespace IPCast.Network;

public sealed record DeviceInformation(string Name, string Platform, string Architecture, int Processors, string Version);
public sealed record SessionToolMessage(string Id, bool Success = true, DeviceInformation? Information = null, string? Error = null);
public sealed class SessionTools : IDisposable
{
    private readonly SessionMessageLoop _loop;
    private readonly RemoteSession _session;
    private readonly ConcurrentDictionary<string, TaskCompletionSource<SessionToolMessage>> _pending = new();
    private readonly CancellationTokenSource _cts = new();
    private long _lastRestart;
    private int _disposed;
    public Func<Task<bool>>? RequestRestart { get; set; }
    public bool CanReadInformation => _session.IsInitiator && _session.GrantedPermissions.HasFlag(ConnectionPermissions.SystemInformation);
    public bool CanRestart => _session.IsInitiator && _session.GrantedPermissions.HasFlag(ConnectionPermissions.RemoteRestart);
    public SessionTools(SessionMessageLoop loop, RemoteSession session)
    { _loop = loop; _session = session; loop.MessageReceived += Receive; loop.Ended += Dispose; }
    public Task<SessionToolMessage> GetInformationAsync() => RequestAsync(MessageType.DeviceInformationRequest, CanReadInformation);
    public Task<SessionToolMessage> RestartAsync() => RequestAsync(MessageType.RestartRequest, CanRestart);
    private async Task<SessionToolMessage> RequestAsync(MessageType type, bool allowed)
    {
        if (!allowed) throw new UnauthorizedAccessException("The remote owner did not grant this permission.");
        if (_pending.Count >= 4) throw new InvalidOperationException("Wait for the current request to finish.");
        var id = Guid.NewGuid().ToString("N");
        var completion = new TaskCompletionSource<SessionToolMessage>(TaskCreationOptions.RunContinuationsAsynchronously);
        _pending[id] = completion;
        try
        {
            await _loop.SendAsync(type, new SessionToolMessage(id), _cts.Token);
            var response = await completion.Task.WaitAsync(TimeSpan.FromSeconds(60), _cts.Token);
            if (!response.Success) throw new IOException(response.Error ?? "Request declined.");
            return response;
        }
        finally { _pending.TryRemove(id, out _); }
    }
    private void Receive(MessageType type, JsonElement payload)
    {
        if (type is not (MessageType.DeviceInformationRequest or MessageType.DeviceInformationResponse or MessageType.RestartRequest or MessageType.RestartResponse)) return;
        var message = payload.Deserialize<SessionToolMessage>();
        if (message?.Id is null || message.Id.Length > 64) throw new InvalidDataException("Invalid device request.");
        if (type is MessageType.DeviceInformationResponse or MessageType.RestartResponse)
        { if (_pending.TryGetValue(message.Id, out var completion)) completion.TrySetResult(message); return; }
        if (_session.IsInitiator) return;
        if (type == MessageType.RestartRequest)
        {
            var now = Environment.TickCount64;
            var previous = Interlocked.Read(ref _lastRestart);
            if (previous != 0 && now - previous < 60000) return;
            Interlocked.Exchange(ref _lastRestart, now);
        }
        _ = RespondAsync(type, message.Id);
    }
    private async Task RespondAsync(MessageType type, string id)
    {
        try
        {
            SessionToolMessage response;
            if (type == MessageType.DeviceInformationRequest)
            {
                var allowed = _session.GrantedPermissions.HasFlag(ConnectionPermissions.SystemInformation);
                response = new(id, allowed, allowed ? new DeviceInformation(Environment.MachineName, RuntimeInformation.OSDescription,
                    RuntimeInformation.OSArchitecture.ToString(), Environment.ProcessorCount,
                    System.Reflection.Assembly.GetEntryAssembly()?.GetName().Version?.ToString(3) ?? "unknown") : null);
            }
            else
            {
                var allowed = _session.GrantedPermissions.HasFlag(ConnectionPermissions.RemoteRestart) &&
                    RequestRestart is not null && await RequestRestart().WaitAsync(_cts.Token);
                response = new(id, allowed, Error: allowed ? null : "Remote restart was declined or unavailable.");
            }
            await _loop.SendAsync(type == MessageType.DeviceInformationRequest ? MessageType.DeviceInformationResponse : MessageType.RestartResponse, response, _cts.Token);
        }
        catch (Exception) { }
    }
    public void Dispose()
    {
        if (Interlocked.Exchange(ref _disposed, 1) != 0) return;
        _cts.Cancel(); _loop.MessageReceived -= Receive; _loop.Ended -= Dispose;
    }
}
