using IPCast.Security;
using IPCast.Network;
using IPCast.Shared;
using System.Net;

namespace IPCast.Tests;

public sealed class TwoFactorTests : IDisposable
{
    private readonly string _directory = Path.Combine(Path.GetTempPath(), "IPCastTwoFactor_" + Guid.NewGuid());
    [Theory]
    [InlineData(59L, "94287082")]
    [InlineData(1111111109L, "07081804")]
    [InlineData(1111111111L, "14050471")]
    [InlineData(1234567890L, "89005924")]
    [InlineData(2000000000L, "69279037")]
    [InlineData(20000000000L, "65353130")]
    public void MatchesRfc6238Sha1Vectors(long unixTime, string expected) =>
        Assert.Equal(expected, Totp.Generate("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", unixTime / 30, 8));

    [Fact] public void PasswordAloneCannotBypassTwoFactorAndCodesCannotBeReplayed()
    {
        var store = new UnattendedAccessStore(_directory); store.Enable("correct horse battery staple");
        var secret = Totp.CreateSecret(); var now = DateTimeOffset.FromUnixTimeSeconds(1800000000); var step = now.ToUnixTimeSeconds() / 30;
        store.EnableTwoFactor(secret, Totp.Generate(secret, step), now);
        Assert.DoesNotContain(secret, File.ReadAllText(Path.Combine(_directory, "unattended-access.json")));
        Assert.Null(new UnattendedAccessPolicy(store).TryAuthenticate("correct horse battery staple"));
        Assert.False(store.VerifyCredentials("correct horse battery staple", null, now));
        Assert.False(store.VerifyCredentials("wrong", Totp.Generate(secret, step + 1), now.AddSeconds(30)));
        Assert.True(store.VerifyCredentials("correct horse battery staple", Totp.Generate(secret, step + 1), now.AddSeconds(30)));
        Assert.False(new UnattendedAccessStore(_directory).VerifyCredentials("correct horse battery staple", Totp.Generate(secret, step + 1), now.AddSeconds(30)));
        Assert.Throws<UnauthorizedAccessException>(() => store.DisableTwoFactor("wrong"));
        store.DisableTwoFactor("correct horse battery staple");
        Assert.True(store.VerifyCredentials("correct horse battery staple", null));
    }

    [Fact] public async Task AuthenticatorCodeTravelsThroughTlsHandshake()
    {
        var store = new UnattendedAccessStore(_directory); store.Enable("a strong test password");
        var secret = Totp.CreateSecret(); var now = DateTimeOffset.UtcNow;
        store.EnableTwoFactor(secret, Totp.Generate(secret, now.ToUnixTimeSeconds() / 30 - 1), now);
        await using var host = new IPCastHost(TestCertificateFactory.CreateSelfSigned()) { UnattendedAccessPolicy = new UnattendedAccessPolicy(store) };
        host.Start();
        host.SessionEstablished += s => s.Dispose();
        var result = await new IPCastConnector(DeviceId.FromValidatedRaw("111222333")).ConnectAsync(new IPEndPoint(IPAddress.Loopback, host.Port), DeviceId.FromValidatedRaw("444555666"), ConnectionPermissions.ViewScreen,
            password: "a strong test password", oneTimeCode: Totp.Generate(secret, DateTimeOffset.UtcNow.ToUnixTimeSeconds() / 30));
        Assert.True(result.Success, result.Error); result.Session?.Dispose();
    }
    [Fact] public void InvalidEnrollmentDoesNotEnableTwoFactor()
    {
        var store = new UnattendedAccessStore(_directory); store.Enable("a strong test password");
        Assert.Throws<ArgumentException>(() => store.EnableTwoFactor(Totp.CreateSecret(), "invalid"));
        Assert.False(store.GetStatus().TwoFactorEnabled);
    }
    public void Dispose() { if (Directory.Exists(_directory)) Directory.Delete(_directory, true); }
}
