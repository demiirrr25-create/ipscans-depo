using System.Text.Json;
using IPCast.Network.Protocol;

namespace IPCast.Network;

/// <summary>Permission-gated, bounded text chat over the authenticated session transport.</summary>
public sealed class SessionChat : IDisposable
{
    public const int MaximumMessageLength = 4000;
    private readonly SessionMessageLoop _loop;
    private readonly bool _allowed;
    private int _closed;
    public event Action<string>? MessageReceived;
    public event Action? Ended;
    public string RemoteDeviceId { get; }

    public SessionChat(SessionMessageLoop loop, RemoteSession session)
    {
        _loop = loop;
        _allowed = session.GrantedPermissions.HasFlag(ConnectionPermissions.Chat);
        RemoteDeviceId = session.RemoteDeviceId.Formatted;
        _loop.MessageReceived += OnMessage;
        _loop.Ended += Dispose;
    }

    public async Task SendAsync(string text, CancellationToken ct = default)
    {
        ObjectDisposedException.ThrowIf(_closed != 0, this);
        if (!_allowed) throw new InvalidOperationException("Chat permission was not granted.");
        if (string.IsNullOrWhiteSpace(text) || text.Length > MaximumMessageLength)
            throw new ArgumentException("Enter between 1 and 4000 characters.", nameof(text));
        await _loop.SendAsync(MessageType.ChatText, new ChatTextMessage(text), ct).ConfigureAwait(false);
    }

    private void OnMessage(MessageType type, JsonElement payload)
    {
        if (!_allowed || _closed != 0 || type != MessageType.ChatText) return;
        var message = payload.Deserialize<ChatTextMessage>();
        if (message is null || string.IsNullOrWhiteSpace(message.Text) || message.Text.Length > MaximumMessageLength)
            throw new InvalidDataException("Invalid chat message.");
        MessageReceived?.Invoke(message.Text);
    }

    public void Dispose()
    {
        if (Interlocked.Exchange(ref _closed, 1) != 0) return;
        _loop.MessageReceived -= OnMessage;
        _loop.Ended -= Dispose;
        Ended?.Invoke();
    }
}
