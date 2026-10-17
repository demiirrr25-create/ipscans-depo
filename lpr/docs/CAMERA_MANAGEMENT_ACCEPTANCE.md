# Camera management and discovery acceptance

Implemented as additive metadata storage around existing camera identities and encrypted stream credentials:

- Editable camera name, brand, model, location, entry/exit direction and enabled state.
- Safe host/protocol display without returning stream passwords to the table.
- Archive and restore; restore keeps the camera disabled until explicitly enabled. History, calibration and credentials survive both actions.
- Management operations require an authenticated administrator and write audit records.
- Native ANPR mode is disabled because no native event adapter has passed device acceptance.
- ONVIF discovery displays IP, discovery name, queried manufacturer/model and explicit unverified ANPR status. The existing bounded three-second IPv4 WS-Discovery probe now offers a local network interface choice.
- Device information and advertised ONVIF Media, Events and Analytics services are queried only after selecting a device and entering its camera credentials. An advertised service does not prove native plate recognition, vehicle images or entry/exit event support.
- The camera must still pass the decoded live preview flow before saving.

## Automated verification

28 targeted tests passed: metadata/identity preservation, role enforcement, archive/restore, native mode refusal, management callbacks, WS-Discovery safety, authenticated profile selection and conservative capability interpretation. Tests use isolated synthetic records and mocks; they are not physical Hikvision or Dahua acceptance tests.

## Physical device verification — 15 October 2026

A read-only query of the user's designated Mercusys MC510 at 192.168.1.100 returned manufacturer `tp-link`, model `Tapo MC510`, firmware `1.2.2 Build 260526 Rel.12948n`. Media, Events and Analytics service endpoints were advertised. Native ANPR remains unverified. No camera settings or user database records were changed by this probe; no credentials appear in the evidence output.

## Still open

Hikvision SADP, Dahua proprietary discovery, native ANPR event adapters and their duplicate-event integration, IP-range scanning, and physical Hikvision/Dahua acceptance are not implemented or verified by this work. WS-Discovery does not imply those capabilities. IPv6 discovery is not supported.
