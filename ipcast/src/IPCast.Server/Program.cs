namespace IPCast.Server;

/// <summary>
/// Runs a standalone relay server (spec §12-13). Not started automatically by anything else in
/// this solution - only relevant if you choose to host one yourself somewhere (a machine you own,
/// or hosting you've decided to pay for). See ipcast/README.md before running this in production:
/// it has no authentication, rate limiting, or TLS of its own yet (the P2P traffic it relays is
/// already end-to-end TLS-protected between the two IPCast clients, but the relay's own control
/// channel is not).
/// </summary>
internal static class Program
{
    private static async Task Main(string[] args)
    {
        var port = args.Length > 0 && int.TryParse(args[0], out var p) ? p : 9876;
        if (port is < 1 or > 65535) throw new ArgumentOutOfRangeException(nameof(args), "Port must be between 1 and 65535.");

        await using var server = new RelayServer(port);
        server.Start();

        Console.WriteLine($"IPCast relay server listening on port {server.Port}. Press Ctrl+C to stop.");

        var shutdown = new TaskCompletionSource();
        Console.CancelKeyPress += (_, e) =>
        {
            e.Cancel = true;
            shutdown.TrySetResult();
        };

        await shutdown.Task;
    }
}
