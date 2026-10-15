# ONVIF network discovery checkpoint — 2026-10-15

Camera setup now includes an asynchronous three-second IPv4 WS-Discovery search. Results appear in a selection list. Choosing a result fills the host, port, HTTP/HTTPS setting and advertised device-service path. Credentials from a previous camera are cleared. Discovery itself sends no camera account or password, and selecting an address does not automatically authenticate or save a camera. The operator next retrieves media profiles and verifies decoded live video.

The implementation sends up to three probes to 239.255.255.250:3702 with multicast TTL 1. Each search uses a fresh message UUID. Responses must reference that request UUID. Duplicate endpoint/identity pairs are removed. The search is bounded by its deadline, 512 received packets and 64 results; datagrams and XML responses have explicit size limits. DTD/entity declarations are rejected. Advertised device endpoints must be HTTP(S), contain no credentials, and use the same IP as the responding datagram. These filters reduce accidental/malicious redirection; unauthenticated discovery is not proof of device identity.

Real local-network test found one device, including the user-designated MC510, advertising `http://192.168.1.100:2020/onvif/device_service`. No device configuration or account was changed. Previous profile tests verified the selected camera's H264 main/sub streams; discovery is a separate evidence item and does not itself prove video decoding.

Final test report: **140 tests, zero failures, zero errors**. Added coverage includes correlated and unrelated responses, sender/endpoint mismatch, embedded credentials, invalid ports/schemes, deduplication, bounded search, pre-send cancellation, preservation of custom service paths, explicit UI selection and clearing previous credentials. The source-mode dialog was rendered and visually inspected with synthetic account/endpoint data.

Limitations: IPv4 only; the UI uses the operating system's default multicast route. The discovery API accepts an explicit IPv4 interface but adapter selection is not exposed in the UI. Firewalls, VLAN boundaries, non-discoverable cameras and hostname-only advertised endpoints may yield no result; manual entry remains available. IPv6, multi-adapter coverage, discovery proxies and broad vendor compatibility remain unverified. This checkpoint is not a new signed installer release.

Protocol reference: [ONVIF Core Specification, device discovery](https://www.onvif.org/specs/2412/ONVIF-Core-Spec-v2412.pdf).
