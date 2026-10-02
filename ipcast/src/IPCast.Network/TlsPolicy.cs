using System.Net.Security;
using System.Security.Cryptography.X509Certificates;

namespace IPCast.Network;

/// <summary>
/// The certificate-validation policy shared by <see cref="IPCastHost"/> and
/// <see cref="IPCastConnector"/>. There is no PKI yet: devices don't have any pre-shared way to
/// validate a peer during the TLS handshake. The client therefore completes the handshake to
/// obtain the peer fingerprint, then requires explicit approval and enforces the stored pin
/// before proceeding with the IPCast protocol.
/// </summary>
internal static class TlsPolicy
{
    public static bool AcceptAnyCertificate(object sender, X509Certificate? certificate, X509Chain? chain, SslPolicyErrors sslPolicyErrors) => true;
}
