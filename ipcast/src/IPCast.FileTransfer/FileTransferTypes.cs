namespace IPCast.FileTransfer;

public sealed record FileTransferProgress(long BytesTransferred, long TotalBytes)
{
    public double FractionComplete => TotalBytes <= 0 ? 0 : (double)BytesTransferred / TotalBytes;
}

public sealed record FileTransferResult(bool Success, string? Error);

/// <summary>An inbound file offer awaiting the local user's accept/reject decision (spec §7/§17).</summary>
public sealed record IncomingFileOffer(string TransferId, string FileName, long FileSizeBytes);

/// <summary>The local user's answer to an <see cref="IncomingFileOffer"/>: accept with a save path, or reject with a reason.</summary>
public sealed record FileOfferDecision(bool Accept, string? SavePath, string? RejectReason = null)
{
    public static FileOfferDecision Reject(string reason) => new(false, null, reason);

    public static FileOfferDecision AcceptTo(string savePath) => new(true, savePath);
}

public delegate Task<FileOfferDecision> FileOfferHandler(IncomingFileOffer offer);
