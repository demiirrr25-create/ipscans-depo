# LPR PRO 0.4.1 — Multi-camera evaluation beta

## Working features

- Independent spatial tracks for up to 16 plate detections per frame. Each track needs repeated high-confidence Turkish plate readings. Ambiguous overlaps, missing detections and reconnects retire accumulated evidence. Passage cooldown survives reconnects. This conservative IoU tracker is not a validated identity tracker through occlusions.
- One shared ONNX pipeline schedules 1–16 RTSP cameras in round-robin order. Each capture queue holds only its newest frame. Stale frames are dropped before inference; evidence that ages out during inference cannot become recognized. A reconnect during inference discards that result. Camera health, drops, reconnects, processed frames and capture-to-decision latency are emitted per camera.
- Camera-specific rectangular ROI, stored by an administrator. Coordinates are normalized left/top/right/bottom; a detection's center must lie inside. Detection still runs on the full image; ROI is an evidence filter, not a performance crop.
- Desktop observation duration of 1–120 minutes and an “Observe all cameras” action. Maximum configuration is not measured hardware throughput. One inference error ends the worker session and is surfaced as an error; inference is shared, not per-camera process isolation. There is no live video mosaic.
- Parking ledger with operator-confirmed entry/exit, capacity, current occupants and elapsed minutes. Transactional anti-passback and unique request IDs prevent duplicate entries/retries. This is a record of manually verified passages, not automatic permission enforcement. Recognition and rule simulation do not alter occupancy or consume grants. No relay commands are sent.
- Administrator SQLite snapshot backup with integrity check and exclusive creation. Restore manually with the application stopped, retaining the original database until verification. Camera credentials remain bound to the original Windows user by DPAPI. The database and its backup are not whole-file encrypted.
- Benchmark reports add condition-specific metrics from each sample's optional `condition` label (for example day/night/rain). Existing one-plate-per-image evaluation scope remains unchanged.
- Turkish/English parking controls, multiple recognition results in history without double-saving the compatibility `decision` field, and recognition cancellation if recording permission/session expires.

## Run

Install `requirements-windows.txt` in Python 3.13 x64. Run `python -m pytest -q`, then `python scripts/build_windows.py`. The Windows executable is `dist/IPScans-LPR-Pro.exe`.

In Cameras, set the ROI of each saved camera, choose the observation duration and select one or all cameras. Live mode requires intact local model files and source/license metadata. No commercial approval or reviewer flag is required. Existing approval metadata is left unchanged; this does not change upstream license rights.

CLI multi-camera configuration is an environment variable containing JSON such as:

```json
[{"id":"entry-1","source_env":"LPR_ENTRY_SOURCE","roi":[0,0.2,1,1]},
 {"id":"exit-1","source_env":"LPR_EXIT_SOURCE","roi":[0,0,1,1]}]
```

Supply authorized RTSP URLs in those source environment variables, then run `python -m lpr.cli live --models models.json --cameras-env LPR_CAMERAS --seconds 300`. Do not put camera secrets in command arguments. Environment variables are an ephemeral transport, not a replacement for a credential vault. The GUI stores camera secrets using DPAPI.

## Verification

45 source tests passed on Windows before packaging, including two-vehicle tracking, ambiguity, missing frames, stale frames, ROI, isolated camera consensus, fair scheduling, shutdown, model integrity and approval-free startup, parking capacity, anti-passback, retry idempotence, role restrictions, backup integrity and desktop result persistence. Frozen executable image/video inference is additionally checked on explicitly synthetic local fixtures. This does not measure field recognition accuracy.

## Still required before commercial field deployment

Authorized, independently labeled Turkish and foreign plate datasets; night/rain/glare/motion testing; sustained multi-camera/GPU measurement; camera/firmware compatibility; ONVIF and native ANPR integration; physical relay interlocks and verified controller drivers; signed installer/update and rollback; centralized multi-site management and tamper-resistant audit.

Parking records and their receipt IDs are retained until an explicit future parking-retention feature is implemented. The existing retention action deletes recognition observations and their corrections only; it does not delete parking/audit records. Capacity changes below current occupancy are allowed, but additional entries are blocked until capacity is available. Manual exits remain possible regardless of current grant validity, so occupancy can be corrected for an observed departure.

This release is unsigned, local-first evaluation software. No “world's best”, production certification, measured 16-camera capacity or universal plate coverage claim is made.

## 0.4.1 user-requested model policy

Removed commercial approval/reviewer fields as runtime gates. Downloaded models can run against authorized live cameras without an activation approval. SHA-256 and path containment remain enforced. Model-license notices remain available; the application does not declare third-party rights cleared.
