# Northflank WebSocket relay pilot

Use a **free project** and a single free combined service. This is a limited pilot, not an availability or capacity guarantee. Do not enable paid resources or add a paid Layer 4 load balancer.

- Source branch: `codex/ipcast-connection-repairs`
- Build context: `/`
- Dockerfile: `/ipcast/deploy/Dockerfile.web`
- Public port: `8080`, protocol HTTP
- Instances: exactly 1 (pairing state lives in memory)
- HTTP health check: `GET /healthz`, port 8080
- Client relay setting: `wss://<assigned-service-domain>/relay`

The pilot endpoint is `wss://p01--ipcast-relay--d5n8c99gjxdn.code.run/relay`.
New Windows profiles use it by default. Existing saved relay settings, including an explicit empty value, are preserved. The deployed endpoint passed the TLS/clipboard/frame/file/reconnect integration test on 2026-09-30. Both test clients ran on the same Windows host through the public endpoint; this is not a two-physical-device acceptance test.

To run the network integration check against an owned deployment, set `IPCAST_TEST_RELAY_URL` and run only `WebSocketRelay_TlsClipboardLargeFrameFileAndReconnect`. It creates random test device IDs and transfers random test data; leave the variable unset for ordinary offline/CI tests.

Northflank terminates the outer HTTPS/WebSocket TLS. IPCast establishes a separate end-to-end TLS session inside that connection. The remote certificate must still be approved by the viewer. Public `ws://` addresses are rejected; loopback `ws://` is allowed for automated local tests. Never disable certificate validation on the outer WSS connection.

The gateway connects only to its own private loopback relay, never to a caller-supplied destination. It accepts at most 64 concurrent WebSocket connections, bounds initial registration messages to 4 KiB and 10 seconds, and rejects browser Origin headers. Waiting device registrations expire after 60 seconds and clients reconnect. These limits do not replace account quotas, authenticated device-directory ownership, or provider bandwidth limits; use a controlled pilot before public distribution. No secrets belong in client relay URLs.

The free tier has finite resources. Track memory, transfer usage and disconnects in the Northflank dashboard. Never enable artificial keepalive traffic to evade hosting limits. WebSocket ping/pong is only for active connection health.

Validation includes loopback Kestrel/WebSocket + end-to-end TLS, certificate comparison, clipboard, 2 MiB frame integrity, multi-chunk file SHA-256 equality, reconnect, address validation and browser-Origin rejection. Before a public release, repeat from two physical Windows devices on separate networks; verify cancellation, user refusal, input and capture, relay restart and long-running sessions.
