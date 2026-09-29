using IPCast.Shared;
using Xunit;

namespace IPCast.Tests;

public class DeviceIdTests
{
    [Theory]
    [InlineData("847293615", "847 293 615")]
    [InlineData("847 293 615", "847 293 615")]
    [InlineData("847-293-615", "847 293 615")]
    public void TryParse_AcceptsValidNineDigitIds(string input, string expectedFormatted)
    {
        Assert.True(DeviceId.TryParse(input, out var id));
        Assert.Equal(expectedFormatted, id.Formatted);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("12345678")] // too short
    [InlineData("1234567890")] // too long
    [InlineData("012345678")] // leading zero
    [InlineData("12345678a")] // non-digit
    public void TryParse_RejectsInvalidIds(string? input)
    {
        Assert.False(DeviceId.TryParse(input, out _));
    }

    [Fact]
    public void Equality_ComparesByValue()
    {
        Assert.True(DeviceId.TryParse("111222333", out var a));
        Assert.True(DeviceId.TryParse("111 222 333", out var b));
        Assert.Equal(a, b);
        Assert.True(a == b);
    }
}
