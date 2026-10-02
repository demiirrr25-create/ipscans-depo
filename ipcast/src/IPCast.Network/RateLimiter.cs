namespace IPCast.Network;

/// <summary>
/// A simple sliding-window rate limiter (spec §11) - caps how many failed unattended-access
/// attempts a given key (the TCP peer address) can make in a time window, to slow down password
/// brute-forcing without needing an external dependency.
/// </summary>
public sealed class RateLimiter
{
    private const int MaxTrackedKeys = 4096;
    private readonly int _maxAttempts;
    private readonly TimeSpan _window;
    private readonly Dictionary<string, AttemptState> _attempts = new();
    private readonly Queue<(string Key, DateTimeOffset Timestamp)> _allAttempts = new();
    private readonly object _lock = new();

    public RateLimiter(int maxAttempts, TimeSpan window)
    {
        _maxAttempts = maxAttempts;
        _window = window;
    }

    public bool TryBeginAttempt(string key)
    {
        lock (_lock)
        {
            PruneExpiredAttempts();
            if (!_attempts.TryGetValue(key, out var state))
            {
                if (_attempts.Count >= MaxTrackedKeys)
                {
                    return false;
                }

                state = new AttemptState();
                _attempts[key] = state;
            }

            if (state.Failures.Count + state.InProgress >= _maxAttempts)
            {
                return false;
            }

            state.InProgress++;
            return true;
        }
    }

    public void CompleteAttempt(string key, bool failed)
    {
        lock (_lock)
        {
            if (!_attempts.TryGetValue(key, out var state) || state.InProgress == 0)
            {
                throw new InvalidOperationException("No unattended-access attempt is in progress for this key.");
            }

            state.InProgress--;
            if (failed)
            {
                var timestamp = DateTimeOffset.UtcNow;
                state.Failures.Enqueue(timestamp);
                _allAttempts.Enqueue((key, timestamp));
            }

            if (state.Failures.Count == 0 && state.InProgress == 0)
            {
                _attempts.Remove(key);
            }
        }
    }

    private void PruneExpiredAttempts()
    {
        var cutoff = DateTimeOffset.UtcNow - _window;
        while (_allAttempts.TryPeek(out var attempt) && attempt.Timestamp < cutoff)
        {
            _allAttempts.Dequeue();
            if (!_attempts.TryGetValue(attempt.Key, out var state))
            {
                continue;
            }

            state.Failures.Dequeue();
            if (state.Failures.Count == 0 && state.InProgress == 0)
            {
                _attempts.Remove(attempt.Key);
            }
        }
    }

    private sealed class AttemptState
    {
        public Queue<DateTimeOffset> Failures { get; } = new();
        public int InProgress { get; set; }
    }
}
