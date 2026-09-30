using System.Net;
using System.Net.Security;
using System.Net.Sockets;
using System.Security.Authentication;
using System.Security.Cryptography.X509Certificates;
using System.Text.Json;
using IPCast.Network.Protocol;
using IPCast.Shared;

namespace IPCast.Network;

/// <summary>
/// Listens for inbound IPCast connections, encrypts each one with TLS, runs the
/// Hello/ConnectionRequest handshake, and asks <see cref="OnConnectionRequested"/> (wired to the
/// UI) whether to accept each one.
/// </summary>
public sealed class IPCastHost : IAsyncDisposable
{
    private readonly X509Certificate2 _certificate;
    private readonly TcpListener _listener;
    private readonly CancellationTokenSource _cts = new();
    private readonly RateLimiter _unattendedAccessRateLimiter = new(maxAttempts: 5, window: TimeSpan.FromMinutes(5));
    private Task? _acceptLoop;

    public IPCastHost(X509Certificate2 certificate, int port = 0)
    {
        _certificate = certificate;
        _listener = new TcpListener(IPAddress.Any, port);
    }

    /// <summary>The bound TCP port - useful when constructed with port 0 (let the OS pick one).</summary>
    public int Port => ((IPEndPoint)_listener.LocalEndpoint).Port;
    public DeviceId? LocalDeviceId { get; init; }

    /// <summary>Must be set before <see cref="Start"/> for incoming connections to ever be accepted.</summary>
    public ConnectionRequestHandler? OnConnectionRequested { get; set; }

    /// <summary>
    /// If set, an incoming request that supplies the correct password (spec §9) is accepted
    /// immediately, without ever invoking <see cref="OnConnectionRequested"/> - that's the whole
    /// point of unattended access: nobody needs to be there to click Accept. Rate-limited to slow
    /// down password brute-forcing.
    /// </summary>
    public IUnattendedAccessPolicy? UnattendedAccessPolicy { get; set; }

    /// <summary>Raised once a session has been accepted and is ready for higher-level use.</summary>
    public event Action<RemoteSession>? SessionEstablished;

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

            _ = HandleIncomingAsync(client, ct);
        }
    }

    pr…5124 tokens truncated… int MaxMessageBytes = 16 * 1024 * 1024;
    private static readonly ConditionalWeakTable<Stream, SemaphoreSlim> WriteLocks = new();

    public static async Task WriteAsync(Stream stream, MessageType type, object payload, CancellationToken ct = default)
    {
        var envelopeJson = JsonSerializer.SerializeToUtf8Bytes(new { type = (int)type, payload });
        if (envelopeJson.Length > MaxMessageBytes)
            throw new InvalidDataException($"Message exceeds the {MaxMessageBytes}-byte limit.");

        var lengthPrefix = new byte[4];
        BinaryPrimitives.WriteInt32BigEndian(lengthPrefix, envelopeJson.Length);

        var gate = WriteLocks.GetValue(stream, _ => new SemaphoreSlim(1, 1));
        await gate.WaitAsync(ct).ConfigureAwait(false);
        try
        {
            await stream.WriteAsync(lengthPrefix, ct).ConfigureAwait(false);
            await stream.WriteAsync(envelopeJson, ct).ConfigureAwait(false);
            await stream.FlushAsync(ct).ConfigureAwait(false);
        }
        catch
        {
            // A cancelled partial message cannot be resumed on a framed stream.
            stream.Dispose();
            throw;
        }
        finally { gate.Release(); }
    }

    public static async Task<(MessageType Type, JsonElement Payload)> ReadAsync(Stream stream, CancellationToken ct = default)
    {
        var lengthBuffer = new byte[4];
        await ReadExactAsync(stream, lengthBuffer, ct).ConfigureAwait(false);
        var length = BinaryPrimitives.ReadInt32BigEndian(lengthBuffer);

        if (length <= 0 || length > MaxMessageBytes)
        {
            throw new InvalidDataException($"Refusing to read a message of {length} bytes.");
        }

        var payloadBuffer = new byte[length];
        await ReadExactAsync(stream, payloadBuffer, ct).ConfigureAwait(false);

        using var doc = JsonDocument.Parse(payloadBuffer);
        var root = doc.RootElement;
        var type = (MessageType)root.GetProperty("type").GetInt32();
        var payload = root.GetProperty("payload").Clone();
        return (type, payload);
    }

    private static async Task ReadExactAsync(Stream stream, Memory<byte> buffer, CancellationToken ct)
    {
        var offset = 0;
        while (offset < buffer.Length)
        {
            var read = await stream.ReadAsync(buffer[offset..], ct).ConfigureAwait(false);
            if (read == 0)
            {
                throw new EndOfStreamException("Remote endpoint closed the connection.");
            }

            offset += read;
        }
    }
}
