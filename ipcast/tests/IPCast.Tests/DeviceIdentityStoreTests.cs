using IPCast.Security;
using Xunit;

namespace IPCast.Tests;

public class DeviceIdentityStoreTests : IDisposable
{
    private readonly string _tempDirectory;

    public DeviceIdentityStoreTests()
    {
        _tempDirectory = Path.Combine(Path.GetTempPath(), "IPCastTests_" + Guid.NewGuid());
    }

    public void Dispose()
    {
        if (Directory.Exists(_tempDirectory))
        {
            Directory.Delete(_tempDirectory, recursive: true);
        }
    }

    [Fact]
    public void LoadOrCreate_GeneratesAndPersistsIdOnFirstRun()
    {
        var store = new DeviceIdentityStore(_tempDirectory);

        var id = store.LoadOrCreate();

        Assert.Equal(9, id.Raw.Length);
        Assert.True(File.Exists(Path.Combine(_tempDirectory, "device-identity.json")));
    }

    [Fact]
    public void LoadOrCreate_ReturnsSameIdAcrossRestarts()
    {
        var first = new DeviceIdentityStore(_tempDirectory).LoadOrCreate();
        var second = new DeviceIdentityStore(_tempDirectory).LoadOrCreate();

        Assert.Equal(first, second);
    }

    [Fact]
    public void LoadOrCreate_RegeneratesWhenFileIsCorrupt()
    {
        Directory.CreateDirectory(_tempDirectory);
        File.WriteAllText(Path.Combine(_tempDirectory, "device-identity.json"), "{ not valid json");

        var id = new DeviceIdentityStore(_tempDirectory).LoadOrCreate();

        Assert.Equal(9, id.Raw.Length);
    }
}
