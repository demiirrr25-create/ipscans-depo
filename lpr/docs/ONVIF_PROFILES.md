# ONVIF Media1 profiles — 2026-10-14 checkpoint

Final automated suite: **130 tests passed**. Source-mode UI rendered and inspected; physical-camera results are recorded below.

Camera setup now offers ONVIF. Enter a camera host, service port and camera account, discover its advertised media profiles, and select a profile by name, encoding and resolution. The resulting RTSP URI goes through the existing decoded-frame preview test before it can be saved. Main/sub streams are selected from the camera's advertised profiles, rather than inferred from URL suffixes.

The client performs only GetCapabilities(Media), GetProfiles and GetStreamUri. It changes no camera settings. It uses WS-Security UsernameToken PasswordDigest and HTTP Digest when challenged, with a 3-second socket timeout, a 1-MiB response limit and up to 64 video profiles. Service and RTSP endpoints must retain the explicitly selected host; HTTP redirects, system proxies, HTTPS downgrade and XML DTD/entity declarations are refused. XML responses must be UTF-8. Errors do not include credentials, raw SOAP or source URLs. Camera accounts and clock synchronization must be valid.

Network requests run in a daemon Python thread. Qt stays responsive and cancellation closes the dialog without accepting a source. At most one request operation is pending. Cancellation does not forcibly abort an in-flight socket operation; socket timeouts remain necessary. Editing connection fields invalidates old profiles. Authorization is checked before each operation and while polling its result.

## Real camera evidence

The user-designated Mercusys MC510 responded on ONVIF port 2020 using the existing locally protected camera account. No account or firmware configuration was changed. GetProfiles returned three profiles. Each advertised URI was independently opened through the isolated native decoder for eight seconds:

| Advertised format | Advertised resolution | Decoded resolution | Delivered frames | Shutdown |
|---|---|---|---:|---|
| H264 | 2304×1296 | 2304×1296 | 100 | Clean |
| H264 | 1280×720 | 1280×720 | 95 | Clean |
| JPEG | 640×360 | 640×360 | 300 | Clean |

The JPEG run emitted native MJPEG overread/decode warnings even though it returned frames. It is **not qualified as error-free MJPEG support**. The generic worker's null `last_error` does not report these codec-level warnings. Native stderr is now redirected to the null device inside the decoder process because some codec builds bypass the OpenCV log-level setting and could otherwise expose source information. Structured codec-error telemetry remains unfinished; silence must not be interpreted as codec health.

Unit/integration tests cover WSSE digest formation, XML escaping, plaintext password exclusion from SOAP, invalid/oversized/DTD/UTF-16 response rejection, cross-host endpoint rejection, advertised URI construction, asynchronous profile retrieval, explicit profile selection and invalidation after connection changes. The UI screenshot uses synthetic endpoint/account data and profile metadata, not private camera imagery.

## Scope still open

This is targeted discovery at an entered host, not LAN multicast WS-Discovery. Only Media1 is implemented; Media2-only cameras, clock-skew recovery, diverse vendors, H265 and HTTPS devices are not yet verified. Same-host checks deliberately reject cameras advertising a different hostname/IP alias. The code is not an ONVIF conformance certification. This source checkpoint is not yet part of a released signed installer.

Protocol references: [ONVIF Media service specification](https://www.onvif.org/specs/srv/media/ONVIF-Media-Service-Spec-v211.pdf), [ONVIF programmer guide](https://www.onvif.org/wp-content/uploads/2016/12/ONVIF_WG-APG-Application_Programmers_Guide-1.pdf), [Mercusys RTSP/ONVIF setup](https://www.mercusys.com/fr/faq-1168/).
