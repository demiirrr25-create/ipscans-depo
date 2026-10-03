using IPCast.Client.Persistence;

namespace IPCast.Tests;

public sealed class AddressBookTests : IDisposable
{
    private readonly string _directory = Path.Combine(Path.GetTempPath(), "IPCastAddressBook_" + Guid.NewGuid());
    private FavoriteDevicesStore Store => new(_directory);
    [Fact] public void LegacyAddressBookRetainsIdsAndGetsDefaultMetadata()
    {
        Directory.CreateDirectory(_directory);
        File.WriteAllText(Path.Combine(_directory, "favorite-devices.json"), "[{\"name\":\"Office\",\"deviceId\":\"123456789\",\"lastConnectedUtc\":null}]");
        var device = Assert.Single(Store.GetAll());
        Assert.Equal("Personal", device.Group); Assert.Equal("", device.Tags); Assert.Equal("123 456 789", device.FormattedId);
    }
    [Fact] public void ExportImportRoundtripPreservesMetadataAndNeverOverwritesExistingDevices()
    {
        Store.Add("Office", "123456789"); Store.SetDetails("123456789", "Work", "server, accounting", "Upstairs"); Store.SetMacAddress("123456789", "00-11-22-33-44-55");
        var export = Store.Export(); Store.Rename("123456789", "Renamed");
        Assert.Equal(0, Store.Import(export)); Assert.Equal("Renamed", Assert.Single(Store.GetAll()).Name);
        Store.Remove("123456789"); Assert.Equal(1, Store.Import(export));
        var device = Assert.Single(Store.GetAll()); Assert.Equal("Upstairs", device.Notes); Assert.Equal("Work", device.Group); Assert.Equal("00-11-22-33-44-55", device.MacAddress);
    }
    [Fact] public void InvalidImportIsAtomic()
    {
        Store.Add("Existing", "111222333");
        Assert.Throws<InvalidDataException>(() => Store.Import("[{\"name\":\"Valid\",\"deviceId\":\"123456789\"},{\"name\":\"Bad\",\"deviceId\":\"oops\"}]"));
        Assert.Equal("111222333", Assert.Single(Store.GetAll()).DeviceId);
    }
    [Theory]
    [InlineData("null")]
    [InlineData("[null]")]
    [InlineData("[{\"name\":null,\"deviceId\":\"123456789\"}]")]
    public void RejectsNullOrIncompleteImports(string json) => Assert.Throws<InvalidDataException>(() => Store.Import(json));
    [Fact] public void DuplicateAndFormattedIdsAreMergedOnce()
    {
        Assert.Equal(1, Store.Import("[{\"name\":\"One\",\"deviceId\":\"123 456 789\"},{\"name\":\"Two\",\"deviceId\":\"123456789\"}]"));
        Assert.Equal("123456789", Assert.Single(Store.GetAll()).DeviceId);
    }
    [Fact] public void ReaddingDevicePreservesDetailsAndLastConnection()
    {
        Store.Add("Office", "123456789"); Store.SetDetails("123456789", "Work", "server", "Note"); Store.NotifyConnected("123456789"); Store.Add("New name", "123456789");
        var device = Assert.Single(Store.GetAll()); Assert.Equal("Work", device.Group); Assert.NotNull(device.LastConnectedUtc);
    }
    public void Dispose() { if (Directory.Exists(_directory)) Directory.Delete(_directory, true); }
}
