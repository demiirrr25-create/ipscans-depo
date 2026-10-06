using IPCast.Network;
using IPCast.Shared;

namespace IPCast.Client.ViewModels;

public partial class MainWindowViewModel
{
    private CancellationTokenSource? _reconnectCts;
    private string? _connectedTarget;
    private ConnectionPermissions _connectedPermissions;

    private async Task RecoverConnectionAsync(SessionMessageLoop endedLoop, bool networkFailure)
    {
        if (!ReferenceEquals(_activeSessionLoop, endedLoop)) return;
        var target = _connectedTarget;
        var permissions = _connectedPermissions;
        var retry = networkFailure && AutomaticReconnect && _activeSession?.IsInitiator == true && target is not null && _shutdownTask is null;
        await DisconnectAsync();
        if (!retry) { StatusMessage = "Disconnected."; return; }
        using var recovery = new CancellationTokenSource(TimeSpan.FromMinutes(3));
        _reconnectCts = recovery;
        IsConnecting = true;
        try
        {
            for (var attempt = 1; attempt <= 3; attempt++)
            {
                StatusMessage = $"Network interrupted. Reconnecting ({attempt}/3); the remote owner must accept again.";
                await Task.Delay(TimeSpan.FromSeconds(attempt * 2), recovery.Token);
                // Never reuse a prior approval or retain an unattended password after the original handshake.
                using var timeout = CancellationTokenSource.CreateLinkedTokenSource(recovery.Token);
                timeout.CancelAfter(TimeSpan.FromSeconds(45));
                var result = await NetworkService.ConnectAsync(target!, permissions, ct: timeout.Token);
                if (result.Success)
                {
                    if (recovery.IsCancellationRequested) { result.Session!.Dispose(); return; }
                    AttachSession(result.Session!);
                    RecordHistory(result.Session!.RemoteDeviceId, "Outgoing", "Reconnected");
                    StatusMessage = "Secure connection restored. File transfers can be resumed in Files.";
                    return;
                }
                if (result.Rejected) { StatusMessage = "Reconnect declined. Connect manually when the remote owner is ready."; return; }
            }
            StatusMessage = "Unable to reconnect. Check the remote device and retry.";
        }
        catch (OperationCanceledException) { StatusMessage = "Reconnect stopped. You can connect again."; }
        catch (Exception ex) { AuditLog.Default.Write(AuditEvent.ApplicationError, AuditLevel.Warning, error: ex); StatusMessage = "Unable to restore the connection. Please retry."; }
        finally
        {
            if (ReferenceEquals(_reconnectCts, recovery)) _reconnectCts = null;
            IsConnecting = false;
        }
    }
}
