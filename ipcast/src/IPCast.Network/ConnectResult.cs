namespace IPCast.Network;

/// <summary>The outcome of an outbound connection attempt (spec §4: request -> accept/reject -> connect).</summary>
public sealed class ConnectResult
{
    private ConnectResult(bool success, bool rejected, string? error, RemoteSession? session)
    {
        Success = success;
        Rejected = rejected;
        Error = error;
        Session = session;
    }

    public bool Success { get; }

    /// <summary>True when the remote user explicitly declined the request (as opposed to a network failure).</summary>
    public bool Rejected { get; }

    public string? Error { get; }
    public RemoteSession? Session { get; }

    public static ConnectResult Succeeded(RemoteSession session) => new(true, false, null, session);

    public static ConnectResult Reject(string reason) => new(false, true, reason, null);

    public static ConnectResult Failed(string error) => new(false, false, error, null);
}
