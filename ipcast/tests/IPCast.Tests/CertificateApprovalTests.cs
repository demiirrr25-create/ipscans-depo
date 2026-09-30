using System.Net;
using IPCast.Network;
using IPCast.Shared;

namespace IPCast.Tests;

public class CertificateApprovalTests
{
    [Fact]
    public async Task RejectedCertificate_StopsBeforeConnectionRequestAndPassword()
    {
        using var certificate = TestCertificateFactory.CreateSelfSigned();
        await using var host = new IPCastHost(certificate);
        var requests = 0;
        var policy = new CountingPolicy();
        host.UnattendedAccessPolicy = policy;
        host.OnConnectionRequested = _ => { Interlocked.Increment(ref requests); return Task.FromResult(ConnectionDecision.Reject("test")); };
        host.Start();
        var connector = new IPCastConnector(DeviceId.FromValidatedRaw("123456789")) {
            VerifyPeerCertificateAsync = (_, fingerprint) => {
                Assert.Equal(certificate.GetCertHashString(System.Security.Cryptography.HashAlgorithmName.SHA256), fingerprint);
                return Task.FromResult(false);
            }
        };
        var result = await connector.ConnectAsync(new IPEndPoint(IPAddress.Loopback, host.Port),
            DeviceId.FromValidatedRaw("987654321"), ConnectionPermissions.Clipboard, password: "test-only-password");
        Assert.True(result.Rejected);
        Assert.Equal(0, requests);
        Assert.Equal(0, policy.Attempts);
    }

    private sealed class CountingPolicy : IUnattendedAccessPolicy
    {
        public int Attempts;
        public ConnectionPermissions? TryAuthenticate(string password) { Interlocked.Increment(ref Attempts); return null; }
    }
}
