using System.Buffers.Binary;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;

namespace IPCast.Security;

/// <summary>RFC 6238, SHA-1, 30-second steps, six decimal digits.</summary>
public static class Totp
{
    private const string Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    public static string CreateSecret() => Encode(RandomNumberGenerator.GetBytes(20));
    private static string Encode(byte[] bytes)
    {
        var result = new StringBuilder(); var bits = 0; var value = 0;
        foreach (var b in bytes) { value = (value << 8) | b; bits += 8; while (bits >= 5) { result.Append(Alphabet[(value >> (bits - 5)) & 31]); bits -= 5; } }
        if (bits > 0) result.Append(Alphabet[(value << (5 - bits)) & 31]); return result.ToString();
    }
    private static byte[] Decode(string secret)
    {
        if (secret.Length is < 16 or > 128) throw new ArgumentException("Invalid authenticator secret.");
        var bytes = new List<byte>(); var value = 0; var bits = 0;
        foreach (var c in secret.ToUpperInvariant())
        {
            var index = Alphabet.IndexOf(c); if (index < 0) throw new ArgumentException("Invalid authenticator secret.");
            value = (value << 5) | index; bits += 5;
            if (bits >= 8) { bytes.Add((byte)(value >> (bits - 8))); bits -= 8; }
        }
        return bytes.ToArray();
    }
    public static string Generate(string secret, long timeStep, int digits = 6)
    {
        if (timeStep < 0 || digits is < 6 or > 8) throw new ArgumentOutOfRangeException(nameof(timeStep));
        var key = Decode(secret);
        try
        {
            Span<byte> counter = stackalloc byte[8]; BinaryPrimitives.WriteInt64BigEndian(counter, timeStep);
            var hash = HMACSHA1.HashData(key, counter); var offset = hash[^1] & 15;
            var value = BinaryPrimitives.ReadUInt32BigEndian(hash.AsSpan(offset, 4)) & 0x7fffffff;
            var modulo = digits == 6 ? 1_000_000u : digits == 7 ? 10_000_000u : 100_000_000u;
            return (value % modulo).ToString(new string('0', digits), CultureInfo.InvariantCulture);
        }
        finally { CryptographicOperations.ZeroMemory(key); }
    }
    public static long? Match(string secret, string? code, DateTimeOffset now, long lastAcceptedStep = -1)
    {
        if (code is null || code.Length != 6 || code.Any(c => c < '0' || c > '9')) return null;
        var current = now.ToUnixTimeSeconds() / 30;
        foreach (var step in new[] { current, current - 1, current + 1 })
            if (step >= 0 && step > lastAcceptedStep && CryptographicOperations.FixedTimeEquals(Encoding.ASCII.GetBytes(Generate(secret, step)), Encoding.ASCII.GetBytes(code))) return step;
        return null;
    }
}
