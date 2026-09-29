using IPCast.Security;
using Xunit;

namespace IPCast.Tests;

public class PasswordHasherTests
{
    [Fact]
    public void Verify_AcceptsCorrectPassword()
    {
        var (salt, hash) = PasswordHasher.Hash("correct horse battery staple");
        Assert.True(PasswordHasher.Verify("correct horse battery staple", salt, hash, PasswordHasher.DefaultIterations));
    }

    [Fact]
    public void Verify_RejectsWrongPassword()
    {
        var (salt, hash) = PasswordHasher.Hash("correct horse battery staple");
        Assert.False(PasswordHasher.Verify("wrong password", salt, hash, PasswordHasher.DefaultIterations));
    }

    [Fact]
    public void Hash_NeverProducesTheSameSaltTwice()
    {
        var (saltA, _) = PasswordHasher.Hash("same password");
        var (saltB, _) = PasswordHasher.Hash("same password");
        Assert.NotEqual(saltA, saltB);
    }
}

public class UnattendedAccessStoreTests : IDisposable
{
    private readonly string _tempDirectory = Path.Combine(Path.GetTempPath(), "IPCastUnattendedStoreTests_" + Guid.NewGuid());

    public void Dispose()
    {
        if (Directory.Exists(_tempDirectory))
        {
            Directory.Delete(_tempDirectory, recursive: true);
        }
    }

    [Fact]
    public void GetStatus_IsDisabledByDefault()
    {
        var store = new UnattendedAccessStore(_tempDirectory);
        Assert.False(store.GetStatus().Enabled);
    }

    [Fact]
    public void Enable_ThenVerifyPassword_RoundTrips()
    {
        var store = new UnattendedAccessStore(_tempDirectory);
        store.Enable("correct horse battery staple");

        Assert.True(store.GetStatus().Enabled);
        Assert.True(store.VerifyPassword("correct horse battery staple"));
        Assert.False(store.VerifyPassword("wrong"));
    }

    [Fact]
    public void Enable_RejectsWeakPassword()
    {
        var store = new UnattendedAccessStore(_tempDirectory);
        Assert.Throws<ArgumentException>(() => store.Enable("short"));
    }

    [Fact]
    public void Disable_StopsPasswordFromVerifying()
    {
        var store = new UnattendedAccessStore(_tempDirectory);
        store.Enable("correct horse battery staple");
        store.Disable();

        Assert.False(store.GetStatus().Enabled);
        Assert.False(store.VerifyPassword("correct horse battery staple"));
    }

    [Fact]
    public void Settings_PersistAcrossNewStoreInstances()
    {
        new UnattendedAccessStore(_tempDirectory).Enable("correct horse battery staple");
        var reloaded = new UnattendedAccessStore(_tempDirectory);

        Assert.True(reloaded.GetStatus().Enabled);
        Assert.True(reloaded.VerifyPassword("correct horse battery staple"));
    }
}
