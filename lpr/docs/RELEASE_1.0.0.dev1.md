# IPScans LPR Pro 1.0.0.dev1

Windows development preview, 15 October 2026. This is not Production v1.0.

The operator workspace now has five main pages: live dashboard, cameras, vehicles/residents, events and settings. Live camera cards share their capture stream with calibration and OCR. Camera names retain their stable identities and update without restarting streams.

Trigger lines, recognition lines and rectangular/polygon recognition or vehicle regions are independent. Direction filters, repeat windows and delayed plate matching are configurable. Vehicle crossings feed a durable encrypted delivery journal; evidence crops come only from their corresponding frame. Corrections preserve the original event and record a reason.

The vehicle registry includes blocks, units, residents, multiple authorized owners, vehicle status and permissions, CSV/XLSX import/export. Event search includes reviewed plate, registered/unknown state, block/unit, camera, time and direction. Unreviewed low-confidence readings do not inherit resident information.

ONVIF discovery reads reported device information and service capabilities without treating an analytics service as proof of native ANPR. Optional per-camera automatic hardware decoding falls back to software. A six-step setup guide and administrator update-verification screen are included. Update downloads remain disabled without a configured trusted publisher; no installer runs automatically.

## Evidence and limits

- The combined desktop baseline passed 248 tests before final release integration. Separate event-filter and update-screen checks also passed. These are software tests, not physical-camera qualifications.
- On the available MC510, the live dashboard displayed 143 frames and processed 57 OCR frames during a short session. Renaming retained the same capture worker; capture and OCR stopped cleanly.
- A separate 10-second MC510 comparison decoded 129 software frames and 130 automatic-mode frames. OpenCV reported D3D11 after decoded frames in automatic mode. This is not a performance guarantee or proof for other hosts.
- At the user's request, further field/long-run qualification was deferred for this preview publication. Only packaging/startup and publication checks are performed for this release.
- Hikvision/Dahua physical devices, native camera ANPR adapters, SADP/proprietary discovery, 4/9/16 physical-camera capacity, independent Turkish plate/night/rain accuracy and clean Windows installation remain unqualified.
- The installer is unsigned. Model/data commercial distribution clearance is pending. Physical barrier actuation is disabled. Protected backup/restore is not implemented; the existing administrator SQLite backup remains a plaintext snapshot with integrity verification.

## Upgrade and rollback

Close the application and create an administrator database backup before upgrading. The preview installer uses the same installation identity as 0.5.0.dev4 and preserves the application data directory. New registry/calibration/review tables are additive. Retain the backup before returning to the previous binary because that version cannot manage the new registry/calibration features.

Previous installer: https://github.com/demiirrr25-create/ipscans-depo/releases/tag/lpr-v0.5.0.dev4

Camera passwords and the delivery journal are protected for the same Windows account. The installer includes the application runtime; recognition models are separate downloads. The package contains no operator database or camera credentials.
