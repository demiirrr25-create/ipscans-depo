namespace IPCast.FileTransfer;

public static class ManagedFileCopy
{
    public delegate Task<FileSystemResponse> Endpoint(FileSystemRequest request, CancellationToken ct);

    public static async Task CopyAsync(Endpoint source, Endpoint destination, string sourcePath, string destinationPath,
        bool resume, IProgress<FileTransferProgress>? progress = null, CancellationToken ct = default)
    {
        var metadata = await source(new("", "stat", sourcePath), ct).ConfigureAwait(false);
        if (!metadata.Success || metadata.Sha256 is null) throw new IOException(metadata.Error ?? "Unable to inspect source.");
        var start = await destination(new("", "begin", destinationPath, Offset: resume ? 0 : -1,
            Sha256: metadata.Sha256, Size: metadata.Size), ct).ConfigureAwait(false);
        if (!start.Success) throw new IOException(start.Error);
        var offset = start.Size;
        if (offset < 0 || offset > metadata.Size) throw new InvalidDataException("Invalid resume offset.");
        progress?.Report(new(offset, metadata.Size));
        while (offset < metadata.Size)
        {
            ct.ThrowIfCancellationRequested();
            var chunk = await source(new("", "read", sourcePath, Offset: offset), ct).ConfigureAwait(false);
            if (!chunk.Success || chunk.Data is null || chunk.Data.Length == 0 ||
                chunk.Data.Length > metadata.Size - offset || chunk.Size != metadata.Size)
                throw new IOException("The source changed or could not be read.");
            var written = await destination(new("", "write", destinationPath, Offset: offset,
                Data: chunk.Data, Sha256: metadata.Sha256, Size: metadata.Size), ct).ConfigureAwait(false);
            if (!written.Success) throw new IOException(written.Error);
            offset += chunk.Data.Length;
            progress?.Report(new(offset, metadata.Size));
        }
        var finished = await destination(new("", "finish", destinationPath,
            Sha256: metadata.Sha256, Size: metadata.Size), ct).ConfigureAwait(false);
        if (!finished.Success) throw new IOException(finished.Error);
    }
}
