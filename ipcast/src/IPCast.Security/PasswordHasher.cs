using System.Security.Cryptography;

namespace IPCast.Security;

/// <summary>
/// PBKDF2-HMAC-SHA256 password hashing (OWASP-recommended iteration count as of this writing).
/// Never stores or compares passwords in plaintext.
/// </summary>
public static class PasswordHasher
{
    private const int SaltSizeBytes = 16;
    private const int HashSizeBytes = 32;
    public const int DefaultIterations = 210_000;

    public static (byte[] Salt, byte[] Hash) Hash(string password, int iterations = DefaultIterations)
    {
        var salt = RandomNumberGenerator.GetBytes(SaltSizeBytes);
        var hash = Rfc2898DeriveBytes.Pbkdf2(password, salt, iterations, HashAlgorithmName.SHA256, HashSizeBytes);
        return (salt, hash);
    }

    public static bool Verify(string password, byte[] salt, byte[] expectedHash, int iterations)
    {
        var actualHash = Rfc2898DeriveBytes.Pbkdf2(password, salt, iterations, HashAlgorithmName.SHA256, expectedHash.Length);
        return CryptographicOperations.FixedTimeEquals(actualHash, expectedHash);
    }
}
