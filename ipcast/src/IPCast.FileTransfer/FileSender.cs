using System.Text.Json;
using IPCast.Network;
using IPCast.Network.Protocol;

namespace IPCast.FileTransfer;

/// <summary>Sends a single local file to the connected peer over an already-established session (spec §7).</summary>
public sealed class FileSender
{
    // Comfortably under MessageStream's 1 MiB per-message cap even after base64 inflation (~33%) and JSON overhead.
    private const int ChunkSizeBytes = 256 * 1024;

    public async Task<FileTransferResult> SendFileAsync(
        SessionMessageLoop loop,
        RemoteSession session,
        string localFilePath,
        IProgress<FileTransferProgress>? progress = null,
        CancellationToken ct = default)
    {
        if (!session.GrantedPermissions.HasFlag(ConnectionPermissions.FileTransfer))
        {
            return new FileTransferResult(false, "File transfer wasn't granted for this connection.");
        }

        if (!File.Exists(localFilePath))
        {
            return new FileTransferResult(false, "File not found.");
        }

        var transferId = Guid.NewGuid().ToString("N");
        var fileInfo = new FileInfo(localFilePath);
        var responseTcs = new TaskCompletionSource<FileOfferResponseMessage>();

        void OnMessage(MessageType type, JsonElement payload)
        {
            if (type != MessageType.FileOfferResponse)
            {
                return;
            }

            var response = payload.Deserialize<FileOfferResponseMessage>();
            if (response is not null && response.TransferId == transferId)
            {
                responseTcs.TrySetResult(response);
            }
        }

        loop.MessageReceived += OnMessage;
        try
        {
            await loop.SendAsync(MessageType.FileOffer, new FileOfferMessage(transferId, fileInfo.Name, fileInfo.Length), ct)
                .ConfigureAwait(false);

            var response = await responseTcs.Task.WaitAsync(TimeSpan.FromSeconds(30), ct).ConfigureAwait(false);
            if (!response.Accepted)
            {
                return new FileTransferResult(false, response.Reason ?? "The peer declined the file.");
            }

            await using var fileStream = File.OpenRead(localFilePath);
            var buffer = new byte[ChunkSizeBytes];
            long sent = 0;
            int read;
            while ((read = await fileStream.ReadAsync(buffer, ct).ConfigureAwait(false)) > 0)
            {
                sent += read;
                var isLast = sent >= fileInfo.Length;
                var chunkData = read == buffer.Length ? buffer : buffer[..read];

                await loop.SendAsync(MessageType.FileChunk, new FileChunkMessage(transferId, sent - read, chunkData, isLast), ct)
                    .ConfigureAwait(false);
                progress?.Report(new FileTransferProgress(sent, fileInfo.Length));
            }

            return new FileTransferResult(true, null);
        }
        catch (Exception ex) when (ex is IOException or TimeoutException or OperationCanceledException)
        {
            return new FileTransferResult(false, ex.Message);
        }
        finally
        {
            loop.MessageReceived -= OnMessage;
        }
    }
}
