using IPCast.Client.Persistence;
using IPCast.Network;

namespace IPCast.Tests;

public class ManagedRelayPreferencesTests
{
    [Theory]
    [InlineData("{}")]
    [InlineData("{\"RelayAddress\":\"\",\"ClipboardSync\":false}")]
    [InlineData("{\"RelayAddress\":null,\"ClipboardSync\":false}")]
    [InlineData("{\"RelayAddress\":\"invalid endpoint\",\"ClipboardSync\":false}")]
    [InlineData("{\"RelayAddress\":\"127.0.0.1:9876\",\"ClipboardSync\":false}")]
    [InlineData("broken json")]
    [InlineData(null)]
    public void OldProfilesUseManagedRelayWithoutManualConfiguration(string? json)
    {
        var directory = Path.Combine(Path.GetTempPath(), "IPCastPrefs_" + Guid.NewGuid());
        Directory.CreateDirectory(directory);
        try
        {
            if (json is not null) File.WriteAllText(Path.Combine(directory, "preferences.json"), json);
            var store = new PreferencesStore(directory);
            var prefs = store.Load();
            Assert.Equal(Preferences.DefaultRelayAddress, prefs.RelayAddress);
            Assert.True(RelayAddress.TryParse(prefs.RelayAddress, out var relay));
            Assert.Equal("wss", relay!.WebSocketUri!.Scheme);
            if (json?.Contains("false") == true) Assert.False(prefs.ClipboardSync);
            store.Save(prefs with { RelayAddress = "", ClipboardSync = false });
            Assert.Equal(Preferences.DefaultRelayAddress, store.Load().RelayAddress);
            Assert.False(store.Load().ClipboardSync);
        }
        finally { Directory.Delete(directory, true); }
    }
}
