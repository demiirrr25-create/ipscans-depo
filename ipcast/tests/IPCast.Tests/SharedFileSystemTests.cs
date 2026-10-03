using IPCast.FileTransfer;
using Xunit;

namespace IPCast.Tests;

public class SharedFileSystemTests : IDisposable
{
    private readonly string _root = Path.Combine(Path.GetTempPath(), "ipcast-files-" + Guid.NewGuid().ToString("N"));
    public SharedFileSystemTests() => Directory.CreateDirectory(_root);
    public void Dispose() => Directory.Delete(_root, true);

    [Theory]
    [InlineData("../outside")]
    [InlineData("/absolute")]
    [InlineData("C:\\Windows")]
    [InlineData(".ipcast-internal.part")]
    [InlineData("a/../../outside")]
    public void RejectsPathsOutsideShareAndInternalFiles(string path)
    {
        var fs = new SharedFileSystem(_root);
        Assert.False(fs.Execute(new("1", "mkdir", path)).Success);
    }

    [Fact]
    public async Task ResumesInterruptedTransferAndVerifiesContent()
    {
        var sourceRoot = Directory.CreateDirectory(Path.Combine(_root, "source")).FullName;
        var destinationRoot = Directory.CreateDirectory(Path.Combine(_root, "destination")).FullName;
        var content = new byte[SharedFileSystem.ChunkSize * 3 + 13];
        Random.Shared.NextBytes(content);
        await File.WriteAllBytesAsync(Path.Combine(sourceRoot, "test.bin"), content);
        var source = new SharedFileSystem(sourceRoot);
        var destination = new SharedFileSystem(destinationRoot);
        var writes = 0;
        Task<FileSystemResponse> Read(FileSystemRequest r, CancellationToken _) => Task.FromResult(source.Execute(r));
        Task<FileSystemResponse> FailAfterOneChunk(FileSystemRequest r, CancellationToken _)
        {
            if (r.Operation == "write" && ++writes == 2) throw new IOException("Network interrupted");
            return Task.FromResult(destination.Execute(r));
        }
        await Assert.ThrowsAsync<IOException>(() => ManagedFileCopy.CopyAsync(Read, FailAfterOneChunk, "test.bin", "test.bin", true));
        Assert.False(File.Exists(Path.Combine(destinationRoot, "test.bin")));
        long firstOffset = -1;
        Task<FileSystemResponse> Resume(FileSystemRequest r, CancellationToken _)
        {
            if (r.Operation == "write" && firstOffset < 0) firstOffset = r.Offset;
            return Task.FromResult(destination.Execute(r));
        }
        await ManagedFileCopy.CopyAsync(Read, Resume, "test.bin", "test.bin", true);
        Assert.Equal(SharedFileSystem.ChunkSize, firstOffset);
        Assert.Equal(content, await File.ReadAllBytesAsync(Path.Combine(destinationRoot, "test.bin")));
    }

    [Fact]
    public void CannotDeleteRootOrReplaceExistingFile()
    {
        var fs = new SharedFileSystem(_root);
        File.WriteAllText(Path.Combine(_root, "existing"), "keep");
        File.WriteAllText(Path.Combine(_root, "source"), "new");
        Assert.False(fs.Execute(new("1", "delete", "")).Success);
        Assert.False(fs.Execute(new("2", "copy", "source", "existing")).Success);
        Assert.Equal("keep", File.ReadAllText(Path.Combine(_root, "existing")));
    }
}
