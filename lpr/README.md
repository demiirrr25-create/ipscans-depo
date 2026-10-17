# IPScans LPR Pro 0.5.0.dev2 — Windows development preview

This checkpoint adds model-independent live camera preview, saved PTS line editing, shared-stream OCR and 1/2/4/9/16 camera layouts. See [current verification and remaining work](docs/NEXT_GENERATION_PROGRESS.md) and [Turkish usage instructions](docs/TRY_PREVIEW_TR.md). Automatic vehicle line-crossing events, persistent multi-camera background OCR, signed installation and production deployment are not complete.

Local ONNX plate detection/OCR, independent plate tracks, per-camera regions, 1–16 camera scheduling, a Turkish/English desktop interface and operator-confirmed parking records.

No commercial approval or activation flag is required. Source/license metadata, model SHA-256 checks and path containment remain enforced. Third-party license terms are unchanged. No physical barrier commands are implemented.

## Start

Run the Windows EXE and create an administrator account (at least 12 password characters). Download the local models in Settings, then select an image/video or configure authorized RTSP cameras. Downloaded models can also run live; no reviewer approval field is required.

Hikvision and Dahua main-stream address profiles and custom RTSP URLs are available. Configure each camera's reading region, choose 1–120 minutes and observe one or all cameras. Sixteen is a configuration limit, not measured throughput on an average PC. Camera-native ANPR events and ONVIF are not yet implemented.

The Parking tab records operator-confirmed physical passages, current occupancy, capacity and repeated-entry protection. Recognition alone does not modify occupancy. Settings can create an integrity-checked database backup. Camera credentials in a backup remain tied to the same Windows user.

## Source and build

Use Python 3.13 x64 in a clean environment:

```powershell
python -m pip install -r requirements-windows.txt
python -m pytest -q
python scripts/prepare_notices.py
python scripts/build_windows.py
```

Run the source GUI with `python -c "from lpr.application import main; main()"`.

```powershell
python -m lpr.cli doctor
python -m lpr.cli image --models models/evaluation-models.json sample.jpg
python -m lpr.cli video --models models/evaluation-models.json sample.mp4 --roi 0 0.2 1 1
python -m lpr.cli live --models models/evaluation-models.json --source-env LPR_RTSP --seconds 300
python -m lpr.cli live --models models/evaluation-models.json --cameras-env LPR_CAMERAS --seconds 300
```

Supply camera URLs through environment variables, not command arguments. The GUI uses DPAPI for persistent credentials. CLI output may contain plate text; keep real footage and results in authorized locations.

## Evidence and limitations

45 source tests passed; the frozen EXE passed local synthetic image/video inference, approval-free live initialization against an intentionally unavailable loopback endpoint, and an offscreen startup check. No real camera, relay, field accuracy or 16-camera throughput claim follows from those tests.

- [0.4 release notes and multi-camera configuration](docs/RELEASE_0.4.md)
- [Camera / Ethernet relay compatibility matrix](docs/DEVICE_COMPATIBILITY.md)
- [Competitive research and production roadmap](docs/COMPETITIVE_RESEARCH_2026-10.md)
- [Frozen verification evidence](docs/verification-0.4.json)
- [Third-party notices](third-party-notices/)

Prior 0.1–0.3 documents are historical. Their commercial-approval runtime restrictions are superseded by 0.4.1. This unsigned beta is not a completed automatic barrier-control product.
