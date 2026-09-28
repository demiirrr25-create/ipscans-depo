using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using IPCast.Shared;

namespace IPCast.Security;

/// <summary>
/// Generates and persists a self-signed TLS certificate for this device, used to encrypt the
/// Phase 2 connection channel. This is opportunistic encryption (defends against a passive
/// eavesdropper on the same LAN/Wi-Fi) - without a PKI or an out-of-band way to compare
/// certificates, it does not yet defend against an active man-in-the-middle. That needs
/// certificate pinning tied to a trusted introduction, which is a later hardening step.
/// </summary>
public sealed class DeviceCertificateStore
{
    private readonly string _filePath;

    public DeviceCertificateStore(string? directory = null)
    {
        directory ??= AppPaths.GetAppDataDirectory();
        _filePath = Path.Combine(directory, "device-cert.pfx");
    }

    public X509Certificate2 LoadOrCreate()
    {
        if (File.Exists(_filePath))
        {
            try
            {
                return X509CertificateLoader.LoadPkcs12FromFile(_filePath, password: null, X509KeyStorageFlags.Exportable);
            }
            catch (CryptographicException)
            {
                // Corrupt/unreadable file: fall through and regenerate.
            }
        }

        var certificate = Generate();
        Save(certificate);
        return certificate;
    }

    private static X509Certificate2 Generate()
    {
        using var rsa = RSA.Create(2048);
        var request = new CertificateRequest("CN=IPCast Device", rsa, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);

        // Windows' SChannel (unlike Linux's OpenSSL-backed SslStream) rejects a TLS handshake
        // against a certificate lacking these extensions - without them, AuthenticateAsServerAsync
        // fails with an unexplained EOF on Windows even though the exact same certificate works
        // fine on Linux. Caught by this repo's windows-latest CI, not locally in this dev sandbox.
        request.CertificateExtensions.Add(new X509KeyUsageExtension(
            X509KeyUsageFlags.DigitalSignature | X509KeyUsageFlags.KeyEncipherment, critical: false));
        request.CertificateExtensions.Add(new X509EnhancedKeyUsageExtension(
            [new Oid("1.3.6.1.5.5.7.3.1")], critical: false)); // Server Authentication
        request.CertificateExtensions.Add(new X509BasicConstraintsExtension(false, false, 0, false));

        var notBefore = DateTimeOffset.UtcNow.AddDays(-1);
        var notAfter = DateTimeOffset.UtcNow.AddYears(10);
        return request.CreateSelfSigned(notBefore, notAfter);
    }

    private void Save(X509Certificate2 certificate)
    {
        var directory = Path.GetDirectoryName(_filePath)!;
        Directory.CreateDirectory(directory);
        var bytes = certificate.Export(X509ContentType.Pfx);

        var tempPath = _filePath + ".tmp";
        File.WriteAllBytes(tempPath, bytes);
        File.Move(tempPath, _filePath, overwrite: true);
    }
}
