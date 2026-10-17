# Video decoder selection and evidence

`CameraConfig.decoder_mode` and `IsolatedCapture(..., decoder_mode=...)` accept
`software` (the compatibility default) or `auto`. The direct
`opencv_capture(source, decoder_mode=...)` entry point has the same selection.
This controls video decoding; it does not enable CUDA/TensorRT OCR inference.

Camera management exposes this as **Video çözücü tercihi** in the camera editor.
The selection is stored per camera in `camera_metadata.decoder_mode`, with an
additive default-software migration. Saving a name without supplying a new
decoder preference preserves the existing choice. Only administrators can change
it. The table labels the requested preference, never an inferred active GPU.

`auto` passes `CAP_PROP_HW_ACCELERATION=VIDEO_ACCELERATION_ANY` when opening
OpenCV's FFmpeg capture. If that attempt cannot open, one new capture explicitly
prefers software. A failed read/open can switch subsequent worker retries to
software; those retries consume the existing configured retry budget. There is
no hidden unbounded reconnect loop. Each native open/read still has a 3-second
FFmpeg timeout; the parent process still enforces a 10-second total open deadline,
4-second read deadline and bounded child termination. A hung hardware release
cannot keep the UI waiting indefinitely. A user-configured zero retry budget is
respected even if the initial decoder fails.

The existing latest-frame shared buffer, frame capacity, source secrecy and
TCP/UDP isolation remain unchanged. Optional injected capture factories keep
their original `factory(source)` interface and need not implement telemetry.

## Actual versus requested acceleration

Both `IsolatedCapture.decoder_info` and `CameraWorker.decoder_info` contain:

| Field | Meaning |
|---|---|
| `requested` | `software` or `auto` |
| `actual` | Backend-reported `software`, `d3d11`, `vaapi`, `mfx`, `drm`, or `unknown` |
| `hardware_active` | True only after a decoded frame and a specific hardware enum from the FFmpeg backend |
| `evidence` | `not_opened`, `backend_property`, `decoded_frame_and_backend_property`, or `unavailable` |
| `fallback` / `fallback_reason` | Whether/why software was selected after an automatic request |
| `backend` / `codec` | Verified FFmpeg backend and an allowlisted four-character codec, otherwise unknown/null |

The `ANY` request value is never evidence of an active GPU decoder. Unsupported
properties or a different backend produce `unknown`, not a hardware claim. The
reported state proves the backend's selection and successful decoding; it does
not measure GPU utilization or promise a performance improvement.

These semantics follow OpenCV's documented [open-time capture
properties](https://docs.opencv.org/4.13.0/d4/d15/group__videoio__flags__base.html)
and [acceleration preferences and return
values](https://docs.opencv.org/4.13.0/dc/dfc/group__videoio__flags__others.html).

## Sanitized decoder diagnostics

Inside each isolated child, a background reader drains native stderr in bounded
4 KiB chunks. It records only fixed category counts: `codec_error`,
`authentication_failed`, `network_timeout`, `connection_refused`. Raw native
messages, RTSP URLs and credentials are neither emitted nor written to files.
Frames/control messages carry only those counts. `CameraWorker.decoder_errors`
exposes them; `last_error` uses a fixed vocabulary when decoding fails.

Counts are diagnostic hints, not exact failed-frame totals. Several FFmpeg lines
may describe one frame; unknown log formats and messages split across chunks may
not match a category. No classified errors does not establish a corruption-free
stream. Parent-observed process exits/timeouts remain separate error categories.

## Validation on 2026-10-15

Unit tests use simulated decoder backends and validate explicit CPU fallback,
timeouts, request-versus-actual reporting, unknown capability handling, retry
limits, structured errors and suppression of a credential-bearing native stderr
write. Existing transport/camera/grid tests pass; they remain simulated tests.

A separate **real MC510** camera test used the saved authorized connection at
`192.168.1.100`, decrypted in memory from the existing database without modifying
its configuration. OpenCV 5.0.0, FFmpeg, TCP, H.264, 2304 × 1296:

| Request | Window | Decoded frames | First frame | Observed decoder |
|---|---:|---:|---:|---|
| software | 10 s | 129 | 2.45 s | software |
| auto | 10 s | 130 | 2.54 s | D3D11, backend property after decoded frames |

Both stopped cleanly with zero reconnects and no classified native errors.
Evidence: task workspace `work/mercusys-decode-acceleration.json`. These short
tests establish working decoding in both modes on this host/camera, not a speed
comparison, long-run reliability, H.265/MJPEG compatibility or support for every
GPU. Metadata/UI tests additionally cover legacy migration, restart persistence,
operator mutation denial, saved combo-box selection and name-only updates that
preserve the decoder choice. Operator shell tests confirm that renaming a camera
keeps its existing capture worker while updating the tile and event feed.
