namespace IPCast.Network;

/// <summary>
/// A simple sliding-window rate limiter (spec §11) - caps how many failed unattended-access
/// attempts a given key (a claimed device ID) can make in a time window, to slow down password
/// brute-forcing without needing an external dependency.
/// </summary>
public sealed class RateLimiter
{
    private readonly int _maxAttempts;
    private readonly TimeSpan _window;
    private readonly Dictionary<string, Queue<DateTimeOffset>> _attempts = new();
    private readonly object _lock = new();

    public RateLimiter(int maxAttempts, TimeSpan window)
    {
        _maxAttempts = maxAttempts;
        _window = window;
    }

    public bool IsAllowed(string key)
    {
        lock (_lock)
        {
            Prune(key);
            return !_attempts.TryGetValue(key, out var queue) || queue.Count < _maxAttempts;
        }
    }

    public void RecordFailedAttempt(string key)
    {
        lock (_lock)
        {
            Prune(key);
            if (!_attempts.TryGetValue(key, out var queue))
            {
                queue = new Queue<DateTimeOffset>();
                _attempts[key] = queue;
            }

            queue.Enqueue(DateTimeOffset.UtcNow);
        }
    }

    private void Prune(string key)
    {
        if (!_attempts.TryGetValue(key, out var queue))
        {
            return;
        }

        var cutoff = DateTimeOffset.UtcNow - _window;
        while (queue.Count > 0 && queue.Peek() < cutoff)
        {
            queue.Dequeue();
        }
    }
}
