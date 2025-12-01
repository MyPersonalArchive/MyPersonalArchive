using System.Collections.Concurrent;

namespace Backend.WebApi.Services;

public class PairingCodeLimiter(int maxAttempts, TimeSpan window)
{
    private readonly ConcurrentDictionary<string, RateLimitEntry> _attempts = new();

	public bool IsAllowed(string key)
    {
        var now = DateTime.UtcNow;
        
        // Clean up old entries periodically
        if (Random.Shared.Next(100) < 5)
        {
            CleanupOldEntries(now);
        }

        var entry = _attempts.GetOrAdd(key, _ => new RateLimitEntry());

        lock (entry)
        {
            // Remove attempts outside the window
            entry.Attempts.RemoveAll(timestamp => now - timestamp > window);

            // Check if under limit
            if (entry.Attempts.Count >= maxAttempts)
            {
                return false;
            }

            // Record this attempt
            entry.Attempts.Add(now);
            return true;
        }
    }

    public void Reset(string key)
    {
        _attempts.TryRemove(key, out _);
    }

    private void CleanupOldEntries(DateTime now)
    {
        var keysToRemove = _attempts
            .Where(kvp => 
            {
                lock (kvp.Value)
                {
                    return kvp.Value.Attempts.Count == 0 || 
                           now - kvp.Value.Attempts.Max() > window;
                }
            })
            .Select(kvp => kvp.Key)
            .ToList();

        foreach (var key in keysToRemove)
        {
            _attempts.TryRemove(key, out _);
        }
    }

    private class RateLimitEntry
    {
        public List<DateTime> Attempts { get; } = [];
    }
}
