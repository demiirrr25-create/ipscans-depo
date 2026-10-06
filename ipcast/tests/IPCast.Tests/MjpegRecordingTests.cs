using System.Text;
using IPCast.RemoteDesktop;
using Xunit;
namespace IPCast.Tests;
public class MjpegRecordingTests
{
    [Fact] public void WritesIndexedAviAndDecodableJpegFrames()
    {
        var path = Path.Combine(Path.GetTempPath(), Guid.NewGuid() + ".avi");
        try
        {
            using (var writer = new MjpegRecording(path, 16, 16))
            {
                writer.WriteFrame(new CapturedFrame(16, 16, new byte[16 * 16 * 4]));
                writer.WriteFrame(new CapturedFrame(16, 16, new byte[16 * 16 * 4]));
            }
            var bytes = File.ReadAllBytes(path);
            Assert.Equal("RIFF", Encoding.ASCII.GetString(bytes, 0, 4));
            Assert.Equal(bytes.Length - 8, BitConverter.ToInt32(bytes, 4));
            Assert.Equal("AVI ", Encoding.ASCII.GetString(bytes, 8, 4));
            var movi = Find(bytes, "movi");
            var index = Find(bytes, "idx1");
            Assert.Equal(32, BitConverter.ToInt32(bytes, index + 4));
            for (var i = 0; i < 2; i++)
            {
                var offset = BitConverter.ToInt32(bytes, index + 8 + i * 16 + 8);
                var length = BitConverter.ToInt32(bytes, index + 8 + i * 16 + 12);
                var frame = FrameCodec.DecodeJpeg(bytes.AsSpan(movi + offset + 8, length).ToArray());
                Assert.Equal(16, frame.Width);
            }
        }
        finally { File.Delete(path); }
    }
    private static int Find(byte[] data, string text) => data.AsSpan().IndexOf(Encoding.ASCII.GetBytes(text));
}
