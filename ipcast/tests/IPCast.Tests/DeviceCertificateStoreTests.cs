using IPCast.Security;
using Xunit;

namespace IPCast.Tests;

public class DeviceCertificateStoreTests : IDisposable
{
    private readonly string _tempDirectory;

    public DeviceCertificateStoreTests()
    {
        _tempDirectory = Path.Combine(Path.GetTempPath(), "IPCastCertTests_" + Guid.NewGuid());
    }

    public void Dispose()
    {
        if (Directory.Exists(_tempDirectory))
        {
            Directory.Delete(_tempDirectory, recursive: true);
        }
    }

    [Fact]
    public void LoadOrCreate_GeneratesAndPersistsCertificateOnFirstRun()
    {
        var store = new DeviceCertificateStore(_tempDirectory);

        using var certificate = store.LoadOrCreate();

        Assert.True(certificate.HasPrivateKey);
        Assert.True(File.Exists(Path.Combine(_tempDirectory, "device-cert.pfx")));
    }

    [Fact]
    public void LoadOrCreate_ReturnsSameCertificateAcrossRestarts()
    {
        using var first = new DeviceCertificateStore(_tempDirectory).LoadOrCreate();
        using var second = new DeviceCertificateStore(_tempDirectory).LoadOrCreate();

        Assert.Equal(first.Thumbprint, second.Thumbprint);
    }

    [Fact]
    public void LoadOrCreate_RegeneratesWhenFileIsCorrupt()
    {
        Directory.CreateDirectory(_tempDirectory);
        File.WriteAllText(Path.Combine(_tempDirectory, "device-cert.pfx"), "not a real pfx");

        using var certificate = new DeviceCertificateStore(_tempDirectory).LoadOrCreate();

        Assert.True(certificate.HasPrivateKey);
    }
}
