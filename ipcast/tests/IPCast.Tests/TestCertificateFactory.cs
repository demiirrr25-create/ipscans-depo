using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;

namespace IPCast.Tests;

internal static class TestCertificateFactory
{
    public static X509Certificate2 CreateSelfSigned()
    {
        using var rsa = RSA.Create(2048);
        var request = new CertificateRequest("CN=IPCast Test", rsa, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);

        // Matches DeviceCertificateStore.Generate() - Windows' SChannel needs these extensions to
        // accept a self-signed cert for TLS at all (Linux's OpenSSL-backed SslStream doesn't).
        request.CertificateExtensions.Add(new X509KeyUsageExtension(
            X509KeyUsageFlags.DigitalSignature | X509KeyUsageFlags.KeyEncipherment, critical: false));
        request.CertificateExtensions.Add(new X509EnhancedKeyUsageExtension(
            [new Oid("1.3.6.1.5.5.7.3.1")], critical: false));
        request.CertificateExtensions.Add(new X509BasicConstraintsExtension(false, false, 0, false));

        var ephemeral = request.CreateSelfSigned(DateTimeOffset.UtcNow.AddDays(-1), DateTimeOffset.UtcNow.AddYears(1));

        // CreateSelfSigned's key is ephemeral - Windows' SChannel refuses to use it as a TLS
        // server certificate. Round-trip through PKCS#12 to force a real, persistable key.
        return X509CertificateLoader.LoadPkcs12(
            ephemeral.Export(X509ContentType.Pfx), password: null, X509KeyStorageFlags.Exportable);
    }
}
