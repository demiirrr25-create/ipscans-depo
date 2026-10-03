using System.Security.Cryptography;
using System.Text;

namespace IPCast.FileTransfer;

public sealed record FileEntry(string Name, bool IsDirectory, long Size, DateTime LastWriteUtc)
{
    public override string ToString() => IsDirectory ? $"▸ {Name}/" : $"{Name}  ({Size:N0} bytes)";
}
public sealed record FileSystemRequest(string Id, string Operation, string Path = "", string? Destination = null,
    long Offset = 0, byte[]? Data = null, string? Sha256 = null, long Size = 0);
public sealed record FileSystemResponse(string Id, bool Success, string? Error = null, FileEntry[]? Entries = null,
    byte[]? Data = null, long Size = 0, string? Sha256 = null);

/// <summary>File operations confined to a locally selected shared folder. Reparse points are rejected.</summary>
public sealed class SharedFileSystem
{
    public const int ChunkSize = 128 * 1024;
    private readonly string _root;
    public SharedFileSystem(string root)
    {
        _root = Path.TrimEndingDirectorySeparator(Path.GetFullPath(root));
        if (!Directory.Exists(_root)) throw new DirectoryNotFoundException();
        RejectLink(_root);
    }

    private static void RejectLink(string path)
    {
        if ((File.GetAttributes(path) & FileAttributes.ReparsePoint) != 0)
            throw new UnauthorizedAccessException("Symbolic links and junctions cannot be shared.");
    }

    private string Resolve(string relative, bool allowRoot = false)
    {
        if (relative.Length > 2048 || Path.IsPathRooted(relative) || relative.Contains(':'))
            throw new UnauthorizedAccessException("Use a relative path inside the shared folder.");
        var components = relative.Replace('\\', '/').Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (components.Any(c => c is "." or ".." || c.StartsWith(".ipcast-", StringComparison.OrdinalIgnoreCase) ||
            c.IndexOfAny(Path.GetInvalidFileNameChars()) >= 0 || c.EndsWith(' ') || c.EndsWith('.')))
            throw new UnauthorizedAccessException("Invalid shared path.");
        if (components.Length == 0 && !allowRoot) throw new UnauthorizedAccessException("The shared root cannot be changed.");
        var result = _root;
        RejectLink(result);
        foreach (var part in components)
        {
            result = Path.Combine(result, part);
            if (File.Exists(result) || Directory.Exists(result)) RejectLink(result);
        }
        return result;
    }

    private static string Hash(string path)
    {
        using var stream = File.OpenRead(path);
        return Convert.ToHexString(SHA256.HashData(stream)).ToLowerInvariant();
    }

    private string PartialPath(string target, string hash)
    {
        if (hash.Length != 64 || !hash.All(Uri.IsHexDigit)) throw new InvalidDataException("Invalid file checksum.");
        var key = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(target + hash)));
        var path = Path.Combine(Path.GetDirectoryName(target)!, ".ipcast-" + key + ".part");
        if (File.Exists(path)) RejectLink(path);
        return path;
    }

    public FileSystemResponse Execute(FileSystemRequest request)
    {
        try
        {
            var path = Resolve(request.Path, request.Operation == "list");
            switch (request.Operation)
            {
                case "list":
                    var entries = new DirectoryInfo(path).EnumerateFileSystemInfos()
                        .Where(f => (f.Attributes & FileAttributes.ReparsePoint) == 0 &&
                            !f.Name.StartsWith(".ipcast-", StringComparison.OrdinalIgnoreCase))
                        .Take(10001).Select(f => new FileEntry(f.Name, f is DirectoryInfo,
                            f is FileInfo file ? file.Length : 0, f.LastWriteTimeUtc)).ToArray();
                    if (entries.Length > 10000) throw new IOException("This folder has more than 10,000 entries. Open a smaller folder.");
                    return new(request.Id, true, Entries: entries.OrderByDescending(e => e.IsDirectory).ThenBy(e => e.Name).ToArray());
                case "stat":
                    return new(request.Id, true, Size: new FileInfo(path).Length, Sha256: Hash(path));
                case "read":
                    using (var input = File.OpenRead(path))
                    {
                        if (request.Offset < 0 || request.Offset > input.Length) throw new InvalidDataException("Invalid read offset.");
                        input.Position = request.Offset;
                        var data = new byte[(int)Math.Min(ChunkSize, input.Length - request.Offset)];
                        input.ReadExactly(data);
                        return new(request.Id, true, Data: data, Size: input.Length);
                    }
                case "begin":
                    if (request.Size < 0 || request.Sha256 is null) throw new InvalidDataException("Invalid upload metadata.");
                    var partial = PartialPath(path, request.Sha256);
                    using (var output = new FileStream(partial, FileMode.OpenOrCreate, FileAccess.Write, FileShare.None))
                    {
                        if (output.Length > request.Size || request.Offset < 0) output.SetLength(0);
                        return new(request.Id, true, Size: output.Length);
                    }
                case "write":
                    if (request.Data is null || request.Data.Length > ChunkSize || request.Sha256 is null ||
                        request.Offset < 0 || request.Size < request.Offset || request.Data.Length > request.Size - request.Offset)
                        throw new InvalidDataException("Invalid upload chunk.");
                    using (var output = new FileStream(PartialPath(path, request.Sha256), FileMode.Open, FileAccess.Write, FileShare.None))
                    {
                        if (output.Length != request.Offset) throw new InvalidDataException("Upload offset does not match.");
                        output.Position = request.Offset;
                        output.Write(request.Data);
                        return new(request.Id, true, Size: output.Length);
                    }
                case "finish":
                    if (request.Sha256 is null) throw new InvalidDataException("Missing checksum.");
                    var finished = PartialPath(path, request.Sha256);
                    if (new FileInfo(finished).Length != request.Size || Hash(finished) != request.Sha256)
                        throw new InvalidDataException("File verification failed. Delete the partial transfer and retry.");
                    File.Move(finished, path, overwrite: false);
                    return new(request.Id, true, Size: request.Size);
                case "mkdir":
                    Directory.CreateDirectory(path);
                    break;
                case "rename":
                case "move":
                    var destination = Resolve(request.Destination ?? throw new InvalidDataException("Missing destination."));
                    if (Directory.Exists(path)) Directory.Move(path, destination);
                    else File.Move(path, destination, overwrite: false);
                    break;
                case "copy":
                    File.Copy(path, Resolve(request.Destination ?? throw new InvalidDataException("Missing destination.")), overwrite: false);
                    break;
                case "delete":
                    if (Directory.Exists(path)) Directory.Delete(path, recursive: false);
                    else File.Delete(path);
                    break;
                default:
                    throw new InvalidDataException("Unsupported file operation.");
            }
            return new(request.Id, true);
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or ArgumentException or NotSupportedException)
        {
            return new(request.Id, false, ex is UnauthorizedAccessException ? "Access outside the shared folder is not permitted." : ex.Message);
        }
    }
}
