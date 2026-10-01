using System.Text.Json;
using IPCast.Network;
using IPCast.Network.Protocol;

namespace IPCast.FileTransfer;

/// <summary>Receives files the peer offers over an already-established session (spec §7).</summary>
public sealed class FileReceiver : IDisposable
{
    private readonly SessionMessageLoop _loop;
    private readonly RemoteSession _session;
    private FileStream? _activeFile;
    private long _activeExpectedSize;
    private string? _activeTransferId;
    private int _offerPending;
    private bool _disposed;

    public FileReceiver(SessionMessageLoop loop, RemoteSession session)
    {
        _loop = loop;
        _session = session;
        _loop.MessageReceived += OnMessageReceived;
    }

    /// <summary>Must be set for incoming offers to ever be accepted; asks the UI where (or whether) to save the file.</summary>
    public FileOfferHandler? OnFileOffered { get; set; }

    public event Action<FileTransferProgress>? ProgressChanged;

    /// <summary>Raised with the local file path once a transfer completes successfully.</summary>
    public event Action<string>? FileReceived;

    public event Action<Exception>? Faulted;

    private async void OnMessageReceived(MessageType type, JsonElement payload)
    {
        try
        {
            switch (type)
            {
                case MessageType.FileOffer:
                    await HandleOfferAsync(payload.Deserialize<FileOfferMessage>()!).ConfigureAwait(false);
                    break;

                case MessageType.FileChunk:
                    await HandleChunkAsync(payload.Deserialize<FileChunkMessage>()!).ConfigureAwait(false);
                    break;
                case MessageType.FileTransferCancel:
                    if (payload.Deserialize<FileTransferCancelMessage>()?.TransferId == _activeTransferId)
                    {
                        _activeFile?.Dispose();
                        _activeFile = null;
                        _activeTransferId = null;
                    }
                    break;
            }
        }
        catch (Exception ex)
        {
            _activeFile?.Dispose();
            _activeFile = null;
            _activeTransferId = null;
            Faulted?.Invoke(ex);
        }
    }

    private async Task HandleOfferAsync(FileOfferMessage offer)
    {
        if (offer.FileSizeBytes < 0 || _activeFile is not null || Interlocked.CompareExchange(ref _offerPending, 1, 0) != 0)
        {
            await _loop.SendAsync(MessageType.FileOfferResponse,
                new FileOfferResponseMessage(offer.TransferId, false, "Invalid offer or another transfer is in progress."));
            return;
        }
        try
        {
        if (!_session.GrantedPermissions.HasFlag(ConnectionPermissions.FileTransfer))
        {
            await _loop.SendAsync(
                MessageType.FileOfferResponse,
                new FileOfferResponseMessage(offer.TransferId, false, "File transfer isn't permitted for this connection."))
                .ConfigureAwait(false);
            return;
        }

        var handler = OnFileOffered;
        var decision = handler is null
            ? FileOfferDecision.Reject("No one is available to accept file transfers right now.")
            : await handler(new IncomingFileOffer(offer.TransferId, offer.FileName, offer.FileSizeBytes)).ConfigureAwait(false);

        if (_disposed) return;
        if (!decision.Accept || decision.SavePath is null)
        {
            await _loop.SendAsync(
                MessageType.FileOfferResponse,
                new FileOfferResponseMessage(offer.TransferId, false, decision.RejectReason ?? "Declined."))
                .ConfigureAwait(false);
            return;
        }

        _activeTransferId = offer.TransferId;
        _activeExpectedSize = offer.FileSizeBytes;
        _activeFile = File.Create(decision.SavePath);

        await _loop.SendAsync(MessageType.FileOfferResponse, new FileOfferResponseMessage(offer.TransferId, true, null))
            .ConfigureAwait(false);
        }
        finally { Interlocked.Exchange(ref _offerPending, 0); }
    }

    private async Task HandleChunkAsync(FileChunkMessage chunk)
    {
        if (_activeFile is null || chunk.TransferId != _activeTransferId)
        {
            return;
        }

        if (chunk.Offset != _activeFile.Position || chunk.Data.LongLength > _activeExpectedSize - chunk.Offset
            || (chunk.IsLast && chunk.Offset + chunk.Data.LongLength != _activeExpectedSize))
            throw new InvalidDataException("File chunk offset or size does not match the accepted offer.");
        _activeFile.Write(chunk.Data, 0, chunk.Data.Length);
        ProgressChanged?.Invoke(new FileTransferProgress(chunk.Offset + chunk.Data.Length, _activeExpectedSize));

        if (chunk.IsLast)
        {
            var path = _activeFile.Name;
            _activeFile.Dispose();
            _activeFile = null;
            _activeTransferId = null;
            FileReceived?.Invoke(path);
            await _loop.SendAsync(MessageType.FileTransferComplete, new FileTransferCompleteMessage(chunk.TransferId, true)).ConfigureAwait(false);
        }
    }

    public void Dispose()
    {
        _disposed = true;
        _loop.MessageReceived -= OnMessageReceived;
        _activeFile?.Dispose();
        _activeFile = null;
    }
}
