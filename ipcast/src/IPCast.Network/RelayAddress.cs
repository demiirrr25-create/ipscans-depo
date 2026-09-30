using System.Net;

namespace IPCast.Network;

public sealed record RelayAddress(IPEndPoint? TcpEndpoint, Uri? WebSocketUri)
{
    public static bool TryParse(string? input, out RelayAddress? address)
    {
        address = null;
        if (string.IsNullOrWhiteSpace(input)) return false;
        input = input.Trim();
        if (Uri.TryCreate(input, UriKind.Absolute, out var uri)
            && (uri.Scheme == "wss" || (uri.Scheme == "ws" && uri.IsLoopback))
            && uri.Port > 0 && string.IsNullOrEmpty(uri.UserInfo)
            && string.IsNullOrEmpty(uri.Fragment) && string.IsNullOrEmpty(uri.Query))
        {
            address = new(null, uri);
            return true;
        }
        if (IPCastService.TryParseEndpoint(input, 9876, out var endpoint))
        {
            address = new(endpoint, null);
            return true;
        }
        return false;
    }
    public override string ToString() => WebSocketUri?.AbsoluteUri ?? TcpEndpoint!.ToString();
}
