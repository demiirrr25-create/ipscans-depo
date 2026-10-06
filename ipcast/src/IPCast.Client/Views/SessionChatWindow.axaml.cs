using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Interactivity;
using Avalonia.Threading;
using IPCast.Network;
using Avalonia.Platform.Storage;

namespace IPCast.Client.Views;

public partial class SessionChatWindow : Window
{
    private readonly SessionChat? _chat;
    private readonly Queue<string> _messages = new();
    private bool _ended;
    private bool _sending;
    private int _unread;
    private int _historyCharacters;

    public SessionChatWindow() => InitializeComponent();

    public SessionChatWindow(SessionChat chat) : this()
    {
        _chat = chat;
        PeerText.Text = $"Connected to {chat.RemoteDeviceId}";
        chat.MessageReceived += OnMessage;
        chat.Ended += OnEnded;
        Activated += (_, _) => { _unread = 0; Title = "IPCast — Session chat"; };
        Closing += (_, e) => { if (!_ended) { e.Cancel = true; Hide(); } };
        Closed += (_, _) =>
        {
            chat.MessageReceived -= OnMessage;
            chat.Ended -= OnEnded;
            chat.Dispose();
            _messages.Clear();
        };
    }

    private void OnMessage(string text) => Dispatcher.UIThread.Post(() =>
    {
        if (_ended) return;
        Append(_chat!.RemoteDeviceId, text);
        if (!IsActive)
        {
            Title = $"IPCast — Session chat ({++_unread} unread)";
            if (!IsVisible) Show();
        }
    });

    private void OnEnded() => Dispatcher.UIThread.Post(() => { _ended = true; Close(); });

    private void Append(string author, string text)
    {
        var entry = $"[{DateTime.Now:HH:mm:ss}] {author}\n{text}";
        _messages.Enqueue(entry);
        _historyCharacters += entry.Length;
        while (_messages.Count > 200 || _historyCharacters > 64000)
            _historyCharacters -= _messages.Dequeue().Length;
        Transcript.Text = string.Join("\n\n", _messages);
        Transcript.CaretIndex = Transcript.Text.Length;
    }

    private async void OnSendClick(object? sender, RoutedEventArgs e) => await SendAsync();
    private async void OnSaveTranscriptClick(object? sender, RoutedEventArgs e)
    {
        var snapshot = Transcript.Text ?? "";
        var file = await StorageProvider.SaveFilePickerAsync(new FilePickerSaveOptions { Title = "Save chat transcript", SuggestedFileName = $"IPCast-chat-{DateTime.Now:yyyyMMdd-HHmmss}.txt", DefaultExtension = "txt", ShowOverwritePrompt = true });
        if (file is null) return;
        try { await using var stream = await file.OpenWriteAsync(); stream.SetLength(0); await using var writer = new StreamWriter(stream); await writer.WriteAsync(snapshot); StatusText.Text = "Transcript saved to your chosen file."; }
        catch (Exception ex) { StatusText.Text = "Save failed: " + ex.Message; }
    }
    private async void OnInputKeyDown(object? sender, KeyEventArgs e)
    {
        if (e.Key != Key.Enter) return;
        e.Handled = true;
        await SendAsync();
    }

    private async Task SendAsync()
    {
        if (_chat is null || _ended || _sending || string.IsNullOrWhiteSpace(MessageInput.Text)) return;
        var text = MessageInput.Text;
        _sending = true; SendButton.IsEnabled = false;
        try
        {
            await _chat.SendAsync(text);
            if (_ended) return;
            Append("You", text);
            if (MessageInput.Text == text) MessageInput.Text = string.Empty;
            StatusText.Text = "Message sent • Select messages to copy";
        }
        catch (Exception) { StatusText.Text = "Message could not be sent. Check the connection and retry."; }
        finally { _sending = false; SendButton.IsEnabled = !_ended; }
    }
}
