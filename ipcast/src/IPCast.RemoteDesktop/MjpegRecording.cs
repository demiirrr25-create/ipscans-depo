using System.Text;

namespace IPCast.RemoteDesktop;

/// <summary>Indexed MJPEG AVI writer; see Microsoft's AVI RIFF File Reference.</summary>
public sealed class MjpegRecording : IDisposable
{
    private readonly BinaryWriter _writer;
    private readonly List<(uint Offset, uint Length)> _index = [];
    private readonly long _totalFrames, _streamFrames, _movi;
    private bool _closed;
    public int Width { get; }
    public int Height { get; }
    public MjpegRecording(string path, int width, int height, int fps = 10)
    {
        if (width is < 1 or > 8192 || height is < 1 or > 8192 || fps is < 1 or > 60)
            throw new ArgumentOutOfRangeException(nameof(width));
        Width = width; Height = height;
        _writer = new BinaryWriter(new FileStream(path, FileMode.CreateNew, FileAccess.ReadWrite, FileShare.Read));
        Four("RIFF"); _writer.Write(0); Four("AVI ");
        var header = List("hdrl");
        Four("avih"); _writer.Write(56);
        _writer.Write(1000000 / fps); _writer.Write(0); _writer.Write(0); _writer.Write(0x10);
        _totalFrames = Position; _writer.Write(0);
        _writer.Write(0); _writer.Write(1); _writer.Write(width * height * 3);
        _writer.Write(width); _writer.Write(height);
        for (var i = 0; i < 4; i++) _writer.Write(0);
        var stream = List("strl");
        Four("strh"); _writer.Write(56); Four("vids"); Four("MJPG");
        _writer.Write(0); _writer.Write((short)0); _writer.Write((short)0); _writer.Write(0);
        _writer.Write(1); _writer.Write(fps); _writer.Write(0);
        _streamFrames = Position; _writer.Write(0);
        _writer.Write(width * height * 3); _writer.Write(-1); _writer.Write(0);
        _writer.Write((short)0); _writer.Write((short)0); _writer.Write((short)width); _writer.Write((short)height);
        Four("strf"); _writer.Write(40); _writer.Write(40); _writer.Write(width); _writer.Write(height);
        _writer.Write((short)1); _writer.Write((short)24); Four("MJPG");
        _writer.Write(width * height * 3);
        for (var i = 0; i < 4; i++) _writer.Write(0);
        Patch(stream + 4, (uint)(Position - stream - 8));
        Patch(header + 4, (uint)(Position - header - 8));
        _movi = List("movi");
    }
    private long Position => _writer.BaseStream.Position;
    private void Four(string value) => _writer.Write(Encoding.ASCII.GetBytes(value));
    private long List(string kind) { var position = Position; Four("LIST"); _writer.Write(0); Four(kind); return position; }
    private void Patch(long offset, uint value) { var end = Position; _writer.BaseStream.Position = offset; _writer.Write(value); _writer.BaseStream.Position = end; }
    public void WriteFrame(CapturedFrame frame)
    {
        ObjectDisposedException.ThrowIf(_closed, this);
        if (frame.Width != Width || frame.Height != Height) throw new InvalidOperationException("Recording stopped because monitor resolution changed. Start a new recording.");
        var jpeg = FrameCodec.EncodeJpeg(frame, 75);
        if (Position + jpeg.Length > 1_800_000_000) throw new IOException("Recording reached the AVI file size limit. Start a new recording.");
        var offset = (uint)(Position - _movi - 8);
        Four("00dc"); _writer.Write(jpeg.Length); _writer.Write(jpeg);
        if ((jpeg.Length & 1) != 0) _writer.Write((byte)0);
        _index.Add((offset, (uint)jpeg.Length));
    }
    public void Dispose()
    {
        if (_closed) return;
        _closed = true;
        try
        {
            Patch(_movi + 4, (uint)(Position - _movi - 8));
            Four("idx1"); _writer.Write(_index.Count * 16);
            foreach (var entry in _index) { Four("00dc"); _writer.Write(0x10); _writer.Write(entry.Offset); _writer.Write(entry.Length); }
            Patch(4, (uint)(Position - 8));
            Patch(_totalFrames, (uint)_index.Count); Patch(_streamFrames, (uint)_index.Count);
        }
        finally { _writer.Dispose(); }
    }
}
