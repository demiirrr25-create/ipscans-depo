using System.Collections.Concurrent;
using System.Net;
using System.Net.Sockets;
using System.Text.Json;
using System.Threading.Channels;
using IPCast.Network.Protocol;

namespace IPCast.Network;

public sealed record TunnelConfiguration(string Id, bool Reverse, int ListenPort, string DestinationHost, int DestinationPort)
{
    public override string ToString() => $"{(Reverse ? "Reverse" : "Forward")} · 127.0.0.1:{ListenPort} → {DestinationHost}:{DestinationPort}";
}
public sealed record TunnelPacket(string Operation, string Id, string? ReplyTo = null, string? TunnelId = null,
    TunnelConfiguration? Configuration = null, byte[]? Data = null, bool Success = true, string? Error = null);

/// <summary>Session-scoped TCP forwarding. Listeners bind loopback; each route needs explicit remote consent.
/// One acknowledged chunk per stream bounds buffering and prevents tunnel traffic flooding the session.</summary>
public sealed class TunnelSession : IDisposable
{
    private sealed record Route(TunnelConfiguration Configuration, bool ListenHere, TcpListener? Listener);
    private sealed class Pipe(TcpClient client, string route)
    {
        public TcpClient Client { get; } = client;
        public string Route { get; } = route;
        public int EndCount;
    }
    private readonly RemoteSession _session;
    private readonly SessionMessageLoop _loop;
    private readonly CancellationTokenSource _cts = new();
    private readonly ConcurrentDictionary<string, Route> _routes = new();
    private readonly ConcurrentDictionary<string, Pipe> _pipes = new();
    private readonly ConcurrentDictionary<string, TaskCompletionSource<TunnelPacket>> _pending = new();
    private readonly Channel<TunnelPacket> _incoming = Channel.CreateBounded<TunnelPacket>(64);
    private int _disposed;
    public Func<TunnelConfiguration, Task<bool>>? Approve { get; set; }
    public event Action? Changed;
    public event Action? Ended;
    public bool CanCreate => _session.IsInitiator && _session.GrantedPermissions.HasFlag(ConnectionPermissions.TcpTunnel);
    public IReadOnlyList<TunnelConfiguration> Active => _routes.Values.Select(r => r.Configuration).ToArray();
    public TunnelSession(SessionMessageLoop loop, RemoteSession session)
    {
        _session = session; _loop = loop;
        loop.MessageReceived += Receive; loop.Ended += Dispose;
        _ = Task.Run(ProcessAsync);
    }
    public static void Validate(TunnelConfiguration config)
    {
        if (!Guid.TryParseExact(config.Id, "N", out _) || config.ListenPort is < 1 or > 65535 ||
            config.DestinationPort is < 1 or > 65535 || string.IsNullOrWhiteSpace(config.DestinationHost) ||
            config.DestinationHost.Length > 253 || Uri.CheckHostName(config.DestinationHost) == UriHostNameType.Unknown)
            throw new ArgumentException("Enter a valid host and ports from 1 to 65535.");
    }
    private void Receive(MessageType type, JsonElement json)
    {
        if (type != MessageType.TunnelPacket) return;
        var packet = json.Deserialize<TunnelPacket>() ?? throw new InvalidDataException();
        if (!_session.GrantedPermissions.HasFlag(ConnectionPermissions.TcpTunnel)) return;
        if (packet.Id is null || packet.Id.Length > 64 || packet.TunnelId?.Length > 64 ||
            packet.ReplyTo?.Length > 64 || packet.Data?.Length > 32768) throw new InvalidDataException("Invalid tunnel packet.");
        if (packet.ReplyTo is { } reply)
        { if (_pending.TryGetValue(reply, out var pending)) pending.TrySetResult(packet); return; }
        if (!_incoming.Writer.TryWrite(packet)) throw new InvalidDataException("Excessive tunnel traffic.");
    }
    private Task SendAsync(TunnelPacket packet) => _loop.SendAsync(MessageType.TunnelPacket, packet, _cts.Token);
    private async Task<TunnelPacket> ExchangeAsync(TunnelPacket packet)
    {
        var response = new TaskCompletionSource<TunnelPacket>(TaskCreationOptions.RunContinuationsAsynchronously);
        if (!_pending.TryAdd(packet.Id, response)) throw new InvalidOperationException();
        try
        {
            await SendAsync(packet);
            var result = await response.Task.WaitAsync(TimeSpan.FromSeconds(60), _cts.Token);
            if (!result.Success) throw new IOException(result.Error ?? "Tunnel request declined.");
            return result;
        }
        finally { _pending.TryRemove(packet.Id, out _); }
    }
    private Task ReplyAsync(TunnelPacket packet, bool success = true, string? error = null) =>
        SendAsync(new("reply", Guid.NewGuid().ToString("N"), ReplyTo: packet.Id, Success: success, Error: error));

    public async Task CreateAsync(bool reverse, int listenPort, string host, int port)
    {
        if (!CanCreate) throw new UnauthorizedAccessException("TCP tunnel permission is required.");
        if (_routes.Count >= 8) throw new IOException("At most 8 tunnels can be active.");
        var config = new TunnelConfiguration(Guid.NewGuid().ToString("N"), reverse, listenPort, host.Trim(), port);
        Validate(config);
        TcpListener? listener = null;
        if (!reverse) { listener = new TcpListener(IPAddress.Loopback, listenPort); listener.Start(8); }
        var route = new Route(config, !reverse, listener);
        _routes[config.Id] = route;
        try
        {
            await ExchangeAsync(new("create", Guid.NewGuid().ToString("N"), Configuration: config));
            if (listener is not null) _ = Task.Run(() => AcceptAsync(route));
            Changed?.Invoke();
        }
        catch
        {
            Remove(config.Id);
            try { await SendAsync(new("remove", Guid.NewGuid().ToString("N"), TunnelId: config.Id)); } catch (Exception) { }
            throw;
        }
    }
    public async Task StopAsync(string id)
    {
        Remove(id);
        await SendAsync(new("remove", Guid.NewGuid().ToString("N"), TunnelId: id));
    }
    private void Remove(string id)
    {
        if (_routes.TryRemove(id, out var route)) route.Listener?.Stop();
        foreach (var pipe in _pipes.Where(p => p.Value.Route == id).ToArray()) ClosePipe(pipe.Key);
        Changed?.Invoke();
    }
    private void ClosePipe(string id) { if (_pipes.TryRemove(id, out var pipe)) pipe.Client.Dispose(); }
    private async Task ProcessAsync()
    {
        try
        {
            await foreach (var packet in _incoming.Reader.ReadAllAsync(_cts.Token))
            {
                try
                {
                    switch (packet.Operation)
                    {
                        case "create":
                            if (_session.IsInitiator || packet.Configuration is not { } config || _routes.Count >= 8)
                                throw new UnauthorizedAccessException("Invalid tunnel request.");
                            Validate(config);
                            if (_routes.ContainsKey(config.Id) || Approve is null || !await Approve(config).WaitAsync(_cts.Token))
                                throw new UnauthorizedAccessException("The device owner declined this tunnel.");
                            TcpListener? listener = null;
                            if (config.Reverse) { listener = new TcpListener(IPAddress.Loopback, config.ListenPort); listener.Start(8); }
                            var route = new Route(config, config.Reverse, listener);
                            _routes[config.Id] = route;
                            await ReplyAsync(packet);
                            if (listener is not null) _ = Task.Run(() => AcceptAsync(route));
                            Changed?.Invoke();
                            break;
                        case "remove":
                            if (packet.TunnelId is { } removeId) Remove(removeId);
                            break;
                        case "open":
                            if (packet.TunnelId is null || !_routes.TryGetValue(packet.TunnelId, out var destination) ||
                                destination.ListenHere || _pipes.Count >= 16 || _pipes.ContainsKey(packet.Id))
                                throw new UnauthorizedAccessException("Tunnel is unavailable.");
                            var client = new TcpClient();
                            try
                            {
                                using var timeout = CancellationTokenSource.CreateLinkedTokenSource(_cts.Token);
                                timeout.CancelAfter(TimeSpan.FromSeconds(5));
                                await client.ConnectAsync(destination.Configuration.DestinationHost, destination.Configuration.DestinationPort, timeout.Token);
                                _pipes[packet.Id] = new Pipe(client, packet.TunnelId);
                                await ReplyAsync(packet);
                                _ = Task.Run(() => PumpAsync(packet.Id, client));
                            }
                            catch { client.Dispose(); throw; }
                            break;
                        case "data":
                            if (packet.TunnelId is null || !_pipes.TryGetValue(packet.TunnelId, out var pipe) || packet.Data is null)
                                throw new IOException("Tunnel stream is closed.");
                            using (var timeout = CancellationTokenSource.CreateLinkedTokenSource(_cts.Token))
                            {
                                timeout.CancelAfter(TimeSpan.FromSeconds(10));
                                await pipe.Client.GetStream().WriteAsync(packet.Data, timeout.Token);
                            }
                            await ReplyAsync(packet);
                            break;
                        case "eof":
                            if (packet.TunnelId is { } eofId && _pipes.TryGetValue(eofId, out var ended))
                            {
                                ended.Client.Client.Shutdown(SocketShutdown.Send);
                                if (Interlocked.Increment(ref ended.EndCount) == 2) ClosePipe(eofId);
                            }
                            break;
                        case "close":
                            if (packet.TunnelId is { } closeId) ClosePipe(closeId);
                            break;
                    }
                }
                catch (Exception ex) when (ex is IOException or SocketException or ArgumentException or UnauthorizedAccessException or OperationCanceledException)
                { await ReplyAsync(packet, false, ex is SocketException ? "Port unavailable or destination unreachable." : "Tunnel request failed or was declined."); }
            }
        }
        catch (Exception) { Dispose(); }
    }
    private async Task AcceptAsync(Route route)
    {
        try
        {
            while (!_cts.IsCancellationRequested && _routes.ContainsKey(route.Configuration.Id))
            {
                var client = await route.Listener!.AcceptTcpClientAsync(_cts.Token);
                if (_pipes.Count >= 16) { client.Dispose(); continue; }
                var id = Guid.NewGuid().ToString("N");
                _pipes[id] = new Pipe(client, route.Configuration.Id);
                _ = Task.Run(async () =>
                {
                    try { await ExchangeAsync(new("open", id, TunnelId: route.Configuration.Id)); await PumpAsync(id, client); }
                    catch (Exception) { ClosePipe(id); }
                });
            }
        }
        catch (Exception) { }
    }
    private async Task PumpAsync(string id, TcpClient client)
    {
        try
        {
            var buffer = new byte[32768];
            while (true)
            {
                var read = await client.GetStream().ReadAsync(buffer, _cts.Token);
                if (read == 0) break;
                await ExchangeAsync(new("data", Guid.NewGuid().ToString("N"), TunnelId: id, Data: buffer[..read]));
            }
            await SendAsync(new("eof", Guid.NewGuid().ToString("N"), TunnelId: id));
            if (_pipes.TryGetValue(id, out var pipe) && Interlocked.Increment(ref pipe.EndCount) == 2) ClosePipe(id);
        }
        catch (Exception)
        {
            ClosePipe(id);
            try { await SendAsync(new("close", Guid.NewGuid().ToString("N"), TunnelId: id)); } catch (Exception) { }
        }
    }
    public void Dispose()
    {
        if (Interlocked.Exchange(ref _disposed, 1) != 0) return;
        _cts.Cancel(); _loop.MessageReceived -= Receive; _loop.Ended -= Dispose;
        foreach (var id in _routes.Keys) Remove(id);
        foreach (var id in _pipes.Keys) ClosePipe(id);
        Ended?.Invoke();
    }
}
