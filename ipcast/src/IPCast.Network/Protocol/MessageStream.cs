using System.Buffers.Binary;
using System.Text.Json;
using System.Runtime.CompilerServices;

namespace IPCast.Network.Protocol;

/// <summary>
/// Reads/writes length-prefixed JSON messages over a stream: 4-byte big-endian length, then a UTF-8
/// JSON envelope. Simple and debuggable on purpose - this is the signaling/control channel only;
/// screen frames and file bytes get their own higher-throughput channel in a later phase.
/// </summary>
public static class MessageStream
{
    // Guards against a malformed or hostile length prefix turning into an unbounded allocation.
    public const int MaxMessageBytes = 16 * 1024 * 1024;
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
