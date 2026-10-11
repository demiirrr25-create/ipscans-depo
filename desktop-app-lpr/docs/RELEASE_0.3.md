# IPScans LPR Pro 0.3.0 — Evaluation beta

This release is an independent, local Windows evaluation application. It is not a finished commercial access-control system. No physical barrier command is implemented or sent.

## Implemented

- Standalone x64 Windows executable; local ONNX image/video inference in a cancellable child process.
- First-run administrator setup, bcrypt password hashes, administrator/operator/auditor roles, five-failure sign-in lock and eight-hour sessions.
- Windows per-user DPAPI protection of stored RTSP URLs and credentials.
- Hikvision main stream `/Streaming/Channels/{channel}01` and Dahua main stream `/cam/realmonitor?channel={channel}&subtype=0` connection profiles; custom RTSP input. Actual camera/firmware compatibility remains unverified.
- Live RTSP observation limited to 60 seconds per UI run, using a commercially reviewed local model manifest. No live view grid, ONVIF discovery or native camera ANPR event subscription yet.
- Vehicle allow/block rules, validity interval, direction and use-count eligibility simulation. Simulation never consumes uses or actuates a device.
- Local SQLite observations, human corrections with reasons, audit records, filtered CSV export (up to 5,000 recent matching rows), and manual retention purge. Audit remains local and is not tamper-proof against the Windows user or administrator. Purge is logical deletion, not secure disk erasure.
- Read-only Modbus TCP function 01 single-coil status and Shelly Gen2+ RPC Switch.GetStatus for unauthenticated local devices. User must provide the correct unit/address/channel. No scan of the network, coil writes, relay pulse, authentication setup or universal device compatibility.
- Optional explicit evaluation model download with pinned hashes. No user images are uploaded. Downloaded evaluation models cannot be used in live mode. Weight/training-data commercial clearance remains pending; models are not bundled in the EXE.

## Verification and limits

Unit/integration evidence is in verification.json, frozen-smoke.json and prior inference/video reports. Synthetic samples are useful regression inputs, not proof of real-world recognition accuracy. Previously measured inference latency is a small CPU sample, not a sustained multi-camera benchmark.

Outstanding: real authorized Turkish field footage, night/rain/angle testing, physical Hikvision/Dahua models and firmware, native ANPR/ONVIF, verified relay actuation and safety wiring, automatic retention scheduling, multi-camera capacity and tracking, GPU packaging, signed commercial licenses, installation/update service, code-signing certificate and production security review.

This beta is unsigned. Do not describe it as error-free, universally compatible or production certified.

## First run

1. Run the EXE on Windows 10/11 x64 and create the administrator account. No default password exists.
2. In Settings choose the evaluation model download (about 11 MB), or select your own reviewed manifest in Recognition.
3. Choose an authorized image/video. Inspect the result and history. Evaluation scores are not calibrated real-world accuracy estimates.
4. Local data: `%LOCALAPPDATA%/IPScans/LPR Pro`. Camera secrets can only be decrypted in the same Windows user context. Back up while the application is closed. An administrator editing or deleting this folder can bypass the application's local controls.

## Protocol references

- Hikvision integration: https://tpp.hikvision.com/tpp/ParkingIntegration
- Dahua traffic setup: https://dahuawiki.com/Traffic
- Shelly RPC: https://shelly-api-docs.shelly.cloud/gen2/ComponentsAndServices/Switch/
- Modbus specification: https://www.modbus.org/specifications

## Third-party software

The distribution uses Python, PySide6/Qt, OpenCV, NumPy, ONNX Runtime, fast-plate-ocr, bcrypt and their dependencies. Bundled license notices are included in the accompanying notices archive. Upstream source/build information is linked there. Models are separately downloaded and retain their upstream terms. No claim that library licensing alone clears model/training-data rights is made.
