using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;

namespace IPCast.Tests;

internal static class TestCertificateFactory
{
    public static X509Certificate2 CreateSelfSigned()
    {
        using var rsa = RSA.Create(2048);
        var request = new CertificateRequest("CN=IPCast Test", rsa, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
        return request.CreateSelfSigned(DateTimeOffset.UtcNow.AddDays(-1), DateTimeOffset.UtcNow.AddYears(1));
    }
}
