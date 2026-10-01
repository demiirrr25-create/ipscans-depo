using System.Net;
using System.Net.Sockets;
using IPCast.Network;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace IPCast.Server;

/// <summary>WebSocket ingress for HTTP-only cloud hosts; session TLS stays between clients.</summary>
public static class RelayWebHost
{
    public static WebApplication Create(string[] args, int port)
    {
        var builder = WebApplication.CreateBuilder(args);
        builder.WebHost.ConfigureKestrel(options =>
        {
            options.ListenAnyIP(port);
            options.Limits.MaxConcurrentConnections = 80;
            options.Limits.MaxConcurrentUpgradedConnections = 64;
            options.Limits.MaxRequestBodySize = 4096;
        });
        builder.Services.AddSingleton(_ => new RelayServer(0, IPAddress.Loopback));
        var app = builder.Build();
        var relay = app.Services.GetRequiredService<RelayServer>();
        relay.Start();
        app.UseWebSockets(new WebSocketOptions
        {
            KeepAliveInterval = TimeSpan.FromSeconds(20),
            KeepAliveTimeout = TimeSpan.FromSeconds(20)
        });
        app.MapGet("/healthz", () => Results.Ok(new { status = "ok", transport = "ipcast-websocket-v1" }));
        var slots = new SemaphoreSlim(64, 64);
        app.Map("/relay", async context =>
        {
            if (!context.WebSockets.IsWebSocketRequest) { context.Response.StatusCode = 400; return; }
            // Desktop clients send no Origin; arbitrary websites must not use this ingress.
            if (context.Request.Headers.ContainsKey("Origin")) { context.Response.StatusCode = 403; return; }
            if (!await slots.WaitAsync(0, context.RequestAborted)) { context.Response.StatusCode = 503; return; }
            try
            {
                using var socket = await context.WebSockets.AcceptWebSocketAsync();
                using var stream = new WebSocketStream(socket);
                using var tcp = new TcpClient();
                using var lifetime = CancellationTokenSource.CreateLinkedTokenSource(context.RequestAborted, app.Lifetime.ApplicationStopping);
                await tcp.ConnectAsync(IPAddress.Loopback, relay.Port, lifetime.Token);
                var upstream = stream.CopyToAsync(tcp.GetStream(), 65536, lifetime.Token);
                var downstream = tcp.GetStream().CopyToAsync(stream, 65536, lifetime.Token);
                await Task.WhenAny(upstream, downstream);
                lifetime.Cancel();
                stream.Dispose();
                tcp.Dispose();
                try { await Task.WhenAll(upstream, downstream); }
                catch (Exception ex) when (ex is IOException or OperationCanceledException or ObjectDisposedException or System.Net.WebSockets.WebSocketException) { }
            }
            catch (Exception ex) when (ex is IOException or OperationCanceledException or SocketException or System.Net.WebSockets.WebSocketException) { }
            finally { slots.Release(); }
        });
        return app;
    }
}
