using System.Net.Security;
using System.Security.Cryptography.X509Certificates;

namespace IPCast.Network;

/// <summary>
/// The certificate-validation policy shared by <see cref="IPCastHost"/> and
/// <see cref="IPCastConnector"/>. There is no PKI yet: devices don't have any pre-shared way to
/// know which certificate a given ID is "supposed" to present, so we accept whatever certificate
/// the peer offers rather than rejecting every connection outright. This still encrypts the
/// channel against a passive eavesdropper - it does not yet stop an active man-in-the-middle.
/// Pinning the certificate to a device ID (learned on first connect, like SSH host keys) is the
/// natural next hardening step.
/// </summary>
internal static class TlsPolicy
{
    public static bool AcceptAnyCertificate(object sender, X509Certificate? certificate, X509Chain? chain, SslPolicyErrors sslPolicyErrors) => true;
}
