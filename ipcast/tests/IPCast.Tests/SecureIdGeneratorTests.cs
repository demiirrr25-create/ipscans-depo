using IPCast.Security;
using Xunit;

namespace IPCast.Tests;

public class SecureIdGeneratorTests
{
    [Fact]
    public void Generate_ProducesNineDigitIdWithNoLeadingZero()
    {
        for (var i = 0; i < 200; i++)
        {
            var id = SecureIdGenerator.Generate();
            Assert.Equal(9, id.Raw.Length);
            Assert.NotEqual('0', id.Raw[0]);
            Assert.All(id.Raw, c => Assert.True(char.IsAsciiDigit(c)));
        }
    }

    [Fact]
    public void Generate_IsNotConstant()
    {
        var ids = new HashSet<string>();
        for (var i = 0; i < 50; i++)
        {
            ids.Add(SecureIdGenerator.Generate().Raw);
        }

        // Astronomically unlikely to collide 50 times out of ~900M values unless generation is broken.
        Assert.True(ids.Count > 1);
    }
}
