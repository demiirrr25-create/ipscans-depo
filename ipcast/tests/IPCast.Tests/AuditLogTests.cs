using IPCast.Shared;
using Xunit;
namespace IPCast.Tests;
public class AuditLogTests
{
    [Fact] public void NeverSerializesExceptionMessagesOrUnvalidatedDeviceData()
    {
        var root = Path.Combine(Path.GetTempPath(), "ipcast-log-" + Guid.NewGuid().ToString("N"));
        try
        {
            new AuditLog(root).Write(AuditEvent.ApplicationError, AuditLevel.Error, "private-token", new Exception("secret-password"));
            var text = File.ReadAllText(Path.Combine(root, "ipcast.jsonl"));
            Assert.DoesNotContain("private-token", text);
            Assert.DoesNotContain("secret-password", text);
            Assert.Contains("ApplicationError", text);
        }
        finally { Directory.Delete(root, true); }
    }
}
