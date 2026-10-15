# LPR Pro 0.5.0.dev4 — development preview

This Windows preview consolidates the RTSP preview repair, isolated native decoding, persisted TCP/UDP/Auto transport, ONVIF profile selection and IPv4 network discovery, camera grids, editable crossing lines, vehicle passage tracking, filtered passage history, CSV/XLSX/PDF exports and opt-in automatic retention.

The camera center now offers continuous OCR across its cameras using one shared model pipeline and fair rounds over existing capture snapshots. It does not open duplicate streams for OCR. Each camera has separate tracking and passage evidence. An inference failure disables that camera's processing while other cameras continue; a full result queue or persistence failure visibly stops processing. Closing the center stops its capture and OCR. This is not yet an unattended Windows service. Stop group OCR before opening line editing or per-camera OCR; restarting group OCR uses the saved line definitions.

Real MC510 center check: one model load, one capture worker, 156 displayed frames and 60 OCR batches in a 15-second run, clean shutdown. This establishes simultaneous video/inference, not plate accuracy or multi-physical-camera capacity. Separate tests validated real TCP/UDP and ONVIF H264 main/sub streams. A 106-second labelled development traffic clip found nine expected passages; a tracker correction removed two false reverse events on the same clip. This is a development regression result, not independent field accuracy.

The package is unsigned, installs for the current Windows user and does not bundle evaluation model weights. Optional desktop shortcuts and Windows sign-in startup are supported; startup is off by default. Existing user data remains in LocalAppData, outside the installation folder. Back up records before evaluation.

## Not yet qualified for production

- Signed installer/update trust, rollback and clean-machine qualification.
- Representative Turkish plate OCR accuracy, rectification, rain/night/occlusion performance and commercial model/data clearance.
- Detailed RTSP/codec diagnosis, hardware decode, H265, reliable MC510 JPEG decoding, IPv6/multiple-network-interface discovery and broad vendor tests.
- Long-duration/multiple-physical-camera load and memory testing; decoder cleanup after a parent crash.
- Full operator UI redesign, polygon drawing, image evidence cards and expanded health reports.

Do not infer completion of these items from the unit test count, successful camera frames or a downloadable installer. Physical barrier actuation is not provided.

## Release validation (2026-10-15)

144 desktop tests and 21 website tests passed. Installed-package verification rendered 40 synthetic passage rows and exported CSV/XLSX/PDF (three PDF pages). Real installer tests passed for shortcuts, opt-in/opt-out startup, reinstallation and uninstall with a preserved test file. The final frozen executable displayed 144 TCP and 135 UDP frames on the MC510 in separate 12-second checks at 2304x1296, one capture connection each, with clean shutdown. These checks ran on the development Windows computer, not a clean-machine matrix.

