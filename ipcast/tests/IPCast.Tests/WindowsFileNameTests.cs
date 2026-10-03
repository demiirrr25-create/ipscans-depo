using IPCast.FileTransfer;
using Xunit;

namespace IPCast.Tests;
public class WindowsFileNameTests
{
    [Theory]
    [InlineData("CON")]
    [InlineData("con.txt")]
    [InlineData("COM1.log")]
    [InlineData("LPT¹")]
    [InlineData("NUL")]
    public void SharedFolderRejectsDeviceNames(string name)
    {
        var directory = Directory.CreateTempSubdirectory("ipcast-test-").FullName;
        try { Assert.False(new SharedFileSystem(directory).Execute(new("1", "mkdir", name)).Success); }
        finally { Directory.Delete(directory, true); }
    }
}
