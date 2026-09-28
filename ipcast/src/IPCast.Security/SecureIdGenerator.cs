using System.Security.Cryptography;
using IPCast.Shared;

namespace IPCast.Security;

/// <summary>
/// Generates cryptographically secure, uniformly distributed 9-digit IPCast device IDs.
/// Uses RandomNumberGenerator (not Random) so IDs can't be predicted or brute-forced by an attacker
/// who observes a few of them, and GetInt32's rejection sampling avoids modulo bias.
/// </summary>
public static class SecureIdGenerator
{
    private const int MinValue = 100_000_000; // smallest 9-digit number
    private const int MaxValueExclusive = 1_000_000_000; // one past the largest 9-digit number

    public static DeviceId Generate()
    {
        var value = RandomNumberGenerator.GetInt32(MinValue, MaxValueExclusive);
        return DeviceId.FromValidatedRaw(value.ToString());
    }
}
