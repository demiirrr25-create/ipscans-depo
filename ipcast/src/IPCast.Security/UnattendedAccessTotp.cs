using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Text;

namespace IPCast.Security;

public sealed partial class UnattendedAccessStore
{
    public void EnableTwoFactor(string secret, string verificationCode, DateTimeOffset? now = null)
    {
        var step = Totp.Match(secret, verificationCode, now ?? DateTimeOffset.UtcNow);
        if (step is null) throw new ArgumentException("The verification code is incorrect. Check your authenticator and device clock.");
        var record = TryLoad();
        if (record?.Enabled != true) throw new InvalidOperationException("Enable unattended access first.");
        using var certificate = new DeviceCertificateStore(Path.GetDirectoryName(_filePath)).LoadOrCreate();
        using var rsa = certificate.GetRSAPublicKey() ?? throw new CryptographicException("Device encryption key unavailable.");
        record.ProtectedTotpSecret = Convert.ToBase64String(rsa.Encrypt(Encoding.ASCII.GetBytes(secret), RSAEncryptionPadding.OaepSHA256));
        record.LastTotpStep = step.Value;
        Save(record);
    }

    public void DisableTwoFactor(string password)
    {
        if (!VerifyPassword(password)) throw new UnauthorizedAccessException("Incorrect unattended access password.");
        var record = TryLoad() ?? throw new InvalidOperationException("Unattended access is not configured.");
        record.ProtectedTotpSecret = null; record.LastTotpStep = -1; Save(record);
    }

    public bool VerifyCredentials(string password, string? code, DateTimeOffset? now = null)
    {
        try
        {
            if (!Directory.Exists(Path.GetDirectoryName(_filePath))) return false;
            // Serialize authentications across processes too: one time step cannot be replayed.
            using var lease = new FileStream(_filePath + ".auth.lock", FileMode.OpenOrCreate, FileAccess.ReadWrite, FileShare.None);
            if (!VerifyPassword(password)) return false;
            var record = TryLoad(); if (record?.Enabled != true) return false;
            if (string.IsNullOrEmpty(record.ProtectedTotpSecret)) return true;
            using var certificate = new DeviceCertificateStore(Path.GetDirectoryName(_filePath)).LoadOrCreate();
            using var rsa = certificate.GetRSAPrivateKey(); if (rsa is null) return false;
            var bytes = rsa.Decrypt(Convert.FromBase64String(record.ProtectedTotpSecret), RSAEncryptionPadding.OaepSHA256);
            try
            {
                var step = Totp.Match(Encoding.ASCII.GetString(bytes), code, now ?? DateTimeOffset.UtcNow, record.LastTotpStep);
                if (step is null) return false;
                record.LastTotpStep = step.Value; Save(record); return true;
            }
            finally { CryptographicOperations.ZeroMemory(bytes); }
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or CryptographicException or FormatException or ArgumentException) { return false; }
    }
}
