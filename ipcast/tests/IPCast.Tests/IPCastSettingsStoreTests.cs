using IPCast.Client.Persistence;

namespace IPCast.Tests;

public sealed class IPCastSettingsStoreTests
{
    [Fact]
    public void Load_WhenSettingsDoNotExist_ReturnsDefaults()
    {
        var directory = CreateTempDirectory();
        try
        {
            var store = new IPCastSettingsStore(directory);

            Assert.Equal(IPCastSettings.Default, store.Load());
        }
        finally
        {
            Directory.Delete(directory, recursive: true);
        }
    }

    [Fact]
    public void SaveAndLoad_PersistSupportedSettings()
    {
        var directory = CreateTempDirectory();
        try
        {
            var store = new IPCastSettingsStore(directory);
            var settings = new IPCastSettings(StreamQuality.High, 30);

            store.Save(settings);

            Assert.Equal(settings, store.Load());
        }
        finally
        {
            Directory.Delete(directory, recursive: true);
        }
    }

    [Fact]
    public void Save_RejectsUnsupportedFrameRate()
    {
        var directory = CreateTempDirectory();
        try
        {
            var store = new IPCastSettingsStore(directory);

            Assert.Throws<ArgumentOutOfRangeException>(() => store.Save(new IPCastSettings(StreamQuality.High, 24)));
        }
        finally
        {
            Directory.Delete(directory, recursive: true);
        }
    }

    private static string CreateTempDirectory()
    {
        var directory = Path.Combine(Path.GetTempPath(), "IPCastSettingsTests", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(directory);
        return directory;
    }
}