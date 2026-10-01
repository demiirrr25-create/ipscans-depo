using System.Net;
using System.Net.Sockets;
using System.Text.Json;
using IPCast.Network.Protocol;

namespace IPCast.Server;

/// <summary>
/// A minimal TCP rendezvous/relay server (spec §12-13 relay architecture, spec §6/§13 NAT
/// traversal fallback). Two ways a connection gets paired:
///  1. Specific mutual pair: both sides register naming each other ("I am X, connect me to Y" /
///     "I am Y, connect me to X") - for two parties who both know each other's ID and connect
///     around the same time.
///  2. Listen-for-anyone: a host registers with no target ("I am X, waiting for whoever asks for
///     me") and stays connected - mirrors how LAN discovery lets anyone with the right ID reach a
///     listening device without prior arrangement (this is what makes internet-based unattended
///     access possible). Whoever later asks for X specifically gets paired with it immediately.
/// Once paired, the server stops parsing messages entirely and just pipes raw bytes bidirectionally
/// between the two connections - a TURN-like fallback for when direct P2P isn't reachable
/// (symmetric NAT, restrictive firewalls). Everything IPCast.Network already does (TLS, the
/// handshake, permissions) runs unmodified on top of that raw pipe, exactly as it does over a
/// direct LAN TCP connection.
///
/// Deliberately NOT deployed anywhere by default. Running this as an always-on, publicly
/// reachable service has real, ongoing hosting and bandwidth costs that scale with usage - that's
/// an infrastructure/budget decision for whoever operates it, not something to provision silently.
/// </summary>
public sealed class RelayServer : IAsyncDisposable
{
    private readonly TcpListener _listener;
    private readonly CancellationTokenSource _cts = new();

    // DeviceId -> client registered with no target, waiting to be asked for by anyone.
    private readonly Dictionary<string, TcpClient> _listening = [];

    // Sorted-pair-key -> client waiting for a specific mutual pair (neither side listening-for-anyone).
    private readonly Dictionary<string, TcpClient> _pendingPairs = [];

    private readonly Lock _lock = new();
    private Task? _acceptLoop;

    public RelayServer(int port = 0)
    {
        _listener = new TcpListener(IPAddress.Any, port);
    }

    /// <summary>The bound TCP port - useful when constructed with port 0 (let the OS pick one).</summary>
    public int Port => ((IPEndPoint)_listener.LocalEndpoint).Port;

    public void Start()
    {
        _listener.Start();
        _acceptLoop = AcceptLoopAsync(_cts.Token);
    }

    private async Task AcceptLoopAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            TcpClient client;
            try
            {
                client = await _listener.AcceptTcpClientAsync(ct).ConfigureAwait(false);
            }
            catch (Exception ex) when (ex is OperationCanceledException or ObjectDisposedException or SocketException)
            {
                return;
            }

            _ = HandleClientAsync(client, ct);
        }
    }

    private async Task HandleClientAsync(TcpClient client, CancellationToken ct)
    {
        try
        {
            var stream = client.GetStream();
            var (type, payload) = await MessageStream.ReadAsync(stream, ct).ConfigureAwait(false);
            if (type != MessageType.RelayRegister)
            {
                client.Dispose();
                return;
            }

            var register = payload.Deserialize<RelayRegisterMessage>();
            if (register is null)
            {
                client.Dispose();
                return;
            }

            TcpClient? peer = null;
            lock (_lock)
            {
                if (register.TargetDeviceId is null)
                {
                    // Listen-for-anyone: just wait. A later specific request for this DeviceId will find it here.
                    _listening[register.DeviceId] = client;
                }
                else if (_listening.Remove(register.TargetDeviceId, out var listeningPeer))
                {
                    // The target was already listening for anyone - pair immediately.
                    peer = listeningPeer;
                }
                else
                {
                    var pairKey = MakePairKey(register.DeviceId, register.TargetDeviceId);
                    if (_pendingPairs.Remove(pairKey, out var waitingPeer))
                    {
                        peer = waitingPeer;
                    }
                    else
                    {
                        _pendingPairs[pairKey] = client;
                    }
                }
            }

            // No peer yet: leave this connection open and waiting - a later registration (either a
            // specific request naming this DeviceId, or the matching half of a pending pair) will
            // find it in _listening/_pendingPairs and drive the handshake/piping from there.
            if (peer is null)
            {
                return;
            }

            await MessageStream.WriteAsync(stream, MessageType.RelayReady, new RelayReadyMessage(), ct).ConfigureAwait(false);
            await MessageStream.WriteAsync(peer.GetStream(), MessageType.RelayReady, new RelayReadyMessage(), ct).ConfigureAwait(false);

            await PipeBothWaysAsync(client, peer, ct).ConfigureAwait(false);
        }
        catch (Exception)
        {
            client.Dispose();
        }
    }

    private static async Task PipeBothWaysAsync(TcpClient a, TcpClient b, CancellationToken ct)
    {
        using (a)
        using (b)
        {
            var aToB = a.GetStream().CopyToAsync(b.GetStream(), ct);
            var bToA = b.GetStream().CopyToAsync(a.GetStream(), ct);
            try
            {
                await Task.WhenAny(aToB, bToA).ConfigureAwait(false);
            }
            catch (Exception)
            {
                // One side disconnected/errored - the other copy will fault too once its stream closes.
            }
        }
    }

    private static string MakePairKey(string a, string b) =>
        string.CompareOrdinal(a, b) <= 0 ? $"{a}|{b}" : $"{b}|{a}";

    public async ValueTask DisposeAsync()
    {
        await _cts.CancelAsync().ConfigureAwait(false);
        _listener.Stop();

        if (_acceptLoop is not null)
        {
            try
            {
                await _acceptLoop.ConfigureAwait(false);
            }
            catch (Exception)
            {
                // AcceptLoopAsync already swallows its own cancellation/shutdown exceptions.
            }
        }

        _cts.Dispose();
    }
}
