# Relay deployment and acceptance

The relay is a long-running raw TCP service. The Next.js/Vercel website deployment does not host it. No public relay has been provisioned by this change.

Build from the repository root on a Docker host:

```sh
docker build -f ipcast/deploy/Dockerfile -t ipcast-relay .
docker run -d --name ipcast-relay --restart unless-stopped -p 9876:9876 --memory=512m --cpus=1 ipcast-relay
docker logs ipcast-relay
```

This incurs the hosting provider's compute and bandwidth costs. Select a host and budget before deployment. Allow TCP 9876 in its firewall; do not place this behind an HTTP-only proxy. Configure the server's reachable IP:9876 in **Settings → Relay** on both clients. Save the setting and keep the receiving client running. The receiving client registers automatically, so only the viewer presses Connect. All clients and the relay must use this version.

The relay has bounded pending registrations and a 512-connection cap. It has no user accounts, quotas, or authenticated device directory. Device identifiers are visible to the relay; session payloads are TLS encrypted between devices. Use a restricted pilot before opening a public service. Clients require a user-approved SHA-256 certificate fingerprint on the first connection and after certificate changes, before sending an unattended-access password. Compare that fingerprint with the receiving device's Settings over a trusted channel.

## Required real-device acceptance checks

1. Two Windows PCs on the same LAN: ID discovery, reject/accept, permissions, screen, all keyboard modifiers and mouse buttons, multi-monitor positioning, clipboard on/off.
2. Use the remote computer's actual LAN IP and displayed listening port for direct connection. The port is allocated on launch; do not guess the local computer's port.
3. Transfer an empty file and a multi-megabyte file. Check hashes. Cancel a transfer; verify a later transfer and a fresh connection still work. The receiver must choose a destination.
4. Close the viewer and disconnect from the sharer. Verify screen transmission stops. Reconnect and restart the app; verify preferences and identity persist.
5. Repeat over two separate internet connections using the deployed relay. Restart the relay and verify clients register again. Reject a changed certificate and confirm no password is sent.

Windows service operation before login, UAC/secure-desktop control, remote reboot/system information, audio, mobile clients, adaptive video encoding and AnyDesk feature parity are not implemented. Do not advertise those as available. Automated protocol tests are not a substitute for these real-device checks.
