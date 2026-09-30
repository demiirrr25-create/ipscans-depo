using System.Net.WebSockets;

namespace IPCast.Network;

/// <summary>A binary WebSocket byte stream. TLS and IPCast framing remain end-to-end.</summary>
public sealed class WebSocketStream(WebSocket socket) : Stream
{
    private readonly SemaphoreSlim _send = new(1, 1);
    private int _disposed;
    public override bool CanRead => _disposed == 0;
    public override bool CanWrite => _disposed == 0;
    public override bool CanSeek => false;
    public override long Length => throw new NotSupportedException();
    public override long Position { get => throw new NotSupportedException(); set => throw new NotSupportedException(); }
    public override void Flush() { }
    public override Task FlushAsync(CancellationToken cancellationToken) => Task.CompletedTask;
    public override int Read(byte[] buffer, int offset, int count) => ReadAsync(buffer.AsMemory(offset, count)).AsTask().GetAwaiter().GetResult();
    public override void Write(byte[] buffer, int offset, int count) => WriteAsync(buffer.AsMemory(offset, count)).AsTask().GetAwaiter().GetResult();
    public override Task<int> ReadAsync(byte[] buffer, int offset, int count, CancellationToken ct) => ReadAsync(buffer.AsMemory(offset, count), ct).AsTask();
    public override Task WriteAsync(byte[] buffer, int offset, int count, CancellationToken ct) => WriteAsync(buffer.AsMemory(offset, count), ct).AsTask();

    public override async ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken ct = default)
    {
        if (buffer.IsEmpty) return 0;
        try
        {
            while (true)
            {
                var result = await socket.ReceiveAsync(buffer, ct).ConfigureAwait(false);
                if (result.MessageType == WebSocketMessageType.Close) return 0;
                if (result.MessageType != WebSocketMessageType.Binary) throw new IOException("Relay accepts binary data only.");
                if (result.Count > 0) return result.Count;
            }
        }
        catch (WebSocketException ex) { throw new IOException("Relay WebSocket disconnected.", ex); }
    }

    public override async ValueTask WriteAsync(ReadOnlyMemory<byte> buffer, CancellationToken ct = default)
    {
        await _send.WaitAsync(ct).ConfigureAwait(false);
        try
        {
            while (!buffer.IsEmpty)
            {
                var length = Math.Min(buffer.Length, 64 * 1024);
                await socket.SendAsync(buffer[..length], WebSocketMessageType.Binary, true, ct).ConfigureAwait(false);
                buffer = buffer[length..];
            }
        }
        catch (WebSocketException ex) { throw new IOException("Relay WebSocket disconnected.", ex); }
        finally { _send.Release(); }
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing && Interlocked.Exchange(ref _disposed, 1) == 0) { socket.Abort(); socket.Dispose(); }
        base.Dispose(disposing);
    }
    public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();
    public override void SetLength(long value) => throw new NotSupportedException();
}
