# LPR Pro next generation — 0.5.0.dev2

14 October 2026. Development checkpoint, not a production release.

## Confirmed causes of missing live video

1. `opencv_capture()` unconditionally called `cv2.setLogLevel(0)`. The pinned OpenCV 5.0.0.93 wheel does not expose that method, so opening a camera failed before `VideoCapture`. A real MJPEG decoding test reproduced this failure. The call is now capability-checked, and native URL logging is disabled.
2. The camera action started an OCR CLI subprocess and displayed JSON recognition results. No camera video frames were delivered to a Qt video surface. Starting that action also required an OCR manifest. A new model-independent live preview provides the missing frame-to-display path.

## Implemented

- Decode and display a saved RTSP camera without loading OCR models.
- Test camera before saving: enable confirmation only after a fresh decoded frame is displayed.
- Mark a connection as connected only after a decoded frame; separate opening, waiting for frames, interruption, oversized frames and exhausted retry budget.
- Exponential reconnect delay with a finite failure budget; clear disconnected/stale frames.
- Display resolution, decoded-frame rate estimate and age since local decode. This age is **not end-to-end camera latency**.
- Keep capture off the Qt thread; wait asynchronously for shutdown; revoke preview when the authenticated session expires.
- Draw up to 16 named PTS lines, edit endpoints, translate, delete, reverse direction, and explicitly save them.
- Store normalized coordinates transactionally in SQLite with authorization and audit records; restore after application restart.
- Preserve aspect ratio with letterboxing and resize/fullscreen coordinate conversion.
- Unit-tested finite-segment directional crossing primitive with hysteresis and per-track duplicate suppression.
- Move the existing product and its tests/notices under `lpr/`, preserving Python package imports.
- Black/white base palette, vector logo, PNG assets, Windows ICO, packaged application icon.
- `camera-test` CLI diagnostics available in source and the frozen build; accepts the source through an environment variable, never a command-line URL.

## Verification

- Full suite: **58 passed**, Windows, Python 3.13.16, PySide6 6.8.3, OpenCV 5.0.0.93. Includes existing product/operations/OCR tests.
- Actual local Mercusys MC510: 202 decoded frames in 15.12 seconds, resolution 2304×1296, first frame 2.56 seconds after starting capture. The 15.09 FPS final estimate is a capture observation, not a benchmark or OCR throughput claim. Clean worker shutdown confirmed.
- Actual RTSP through Qt offscreen preview: 115 frames displayed and painted in a 10-second test; worker stopped cleanly. This exercises Qt painting, not physical monitor appearance.
- Final frozen Windows EXE: exit code 0; 115 real RTSP frames displayed and painted, 2304×1296, no reported capture error, clean shutdown. No separate Python installation was used by this child executable.
- Test host CPU: 13th Gen Intel Core i5-13400F; Windows 11 build 26200. One physical camera, software decode, no OCR during the preview tests. RAM/GPU utilization, packet transport and end-to-end latency were not measured.
- Generated MJPEG AVI decoded by the actual OpenCV/FFmpeg backend.
- Qt interaction tests cover draw, endpoint edit, translate, delete and resizing. Persistence test closes and reopens SQLite. A rendered checkerboard fixture was visually inspected; it is not a real camera screenshot.
- Camera credentials were decrypted only in memory for the designated host, never printed. Test frames were not saved.

## Architecture decision

The application is Python/PySide6, not browser-based. The immediate correction therefore keeps native Qt rendering with the existing OpenCV/FFmpeg decoder rather than adding a web relay or replacing the desktop framework. This decision is supported by the successful physical camera test. The current backend cannot reliably distinguish all RTSP authentication/path/codec errors, explicitly choose transport per camera, or guarantee hard termination of a broken native decoder. Those require the next isolated capture-service iteration.

## Still required before acceptance

**Checkpoint update (0.5.0.dev3):** the historical list below describes dev1/dev2. Vehicle detection/tracking and passage persistence are now integrated (see VEHICLE_PIPELINE.md); filtered, paginated passage history and CSV/XLSX/PDF exports are implemented (see PASSAGE_HISTORY.md). A real current-user preview installer and frozen runtime checks now pass (see WINDOWS_INSTALLER.md). Field accuracy, full deployment qualification and the other remaining requirements are not thereby complete.

- Persistent background OCR for all cameras with fair shared-model scheduling. Selected-camera preview now has simultaneous OCR over its existing capture; the old standalone OCR subprocess remains exclusive with opening the camera center.
- Vehicle detector and tracker integrated with the line-crossing primitive. Existing OCR tracking follows **plate boxes**. The new line primitive is deliberately not wired to that as proof of vehicle passage. No automatic passage counting claim is made.
- Vehicle/plate model licensing and data provenance review, rectification, improved temporal fusion, and a lawful representative Turkish plate dataset with measured recognition accuracy.
- Per-camera TCP/UDP selection and fallback, detailed RTSP diagnostics, ONVIF discovery, substream selection, hardware decode fallback, H.265 and multi-camera integration tests.
- Real disconnect/restart tests, long-duration memory/load measurements, physical vehicle crossing tests, fullscreen user validation and polygon editing.
- Complete operator dashboard and camera grids, live event cards with images, indexed filters, XLSX/PDF reporting, automatic retention, security/dependency audit and upgrade migration tests.
- Real installer with shortcuts, opt-in autostart, signed updates, rollback and clean-machine install tests. The development EXE is **not an installer** and is not digitally signed.
- Website review and verified deployment/download. The existing release metadata remains pinned to the previously published release. No production deployment was performed for this checkpoint.

## Sources reviewed

- [Mercusys MC510 specifications](https://www.mercusys.com/en/product/smart-camera/mc510/v1/): RTSP and ONVIF are listed by the manufacturer. Model identification was supplied by the user.
- [YOLOX upstream](https://github.com/Megvii-BaseDetection/YOLOX): Apache-2.0 code candidate for vehicle detection; no new weights included in this checkpoint.
- [ByteTrack upstream](https://github.com/FoundationVision/ByteTrack): MIT code candidate for vehicle tracking; not yet integrated.

Upstream repository licenses alone do not establish clearance for all weights, datasets, codec binaries or the complete commercial distribution.

## 0.5.0.dev2 — shared capture and camera center

- Added a thread-safe, non-consuming latest-frame snapshot. Frames are published read-only and invalidated with a generation change when capture disconnects.
- OCR consumes that snapshot on its own thread at a bounded sampling interval. Preview uses its independent one-frame queue; slow inference does not consume or block its frames.
- Inference across a disconnect or beyond the evidence age limit is discarded. The result queue has a fixed capacity; overload halts OCR visibly instead of silently growing memory. Model and persistence failures stop OCR while leaving video available.
- Preview OCR results are delivered to `Operations.record` on the Qt thread with current session authorization. This preserves SQLite thread affinity and keeps physical parking passages separate from recognition observations.
- Camera center provides 1/2/4/9/16 layouts, pagination, camera names, resolution/FPS and online state. Detail reuses the existing worker. Closing detail stops its OCR but leaves the grid capture running. Closing the center stops its owned captures. Hidden pages retain their camera connections.
- **67 tests passed** after this change, including simulated 16-camera layout, isolated failure, shared-worker lifecycle, stale-generation rejection, actual SQLite persistence and OCR backpressure tests. These are not a 16-physical-camera performance qualification.
- Real MC510 shared-stream test, 15 seconds: **one capture connection**, 192 video frames displayed/painted, 62 frames analyzed by the existing local ONNX/OCR pipeline, 62 result batches delivered, zero stale inferences. No plate detections occurred in this interval, so this does not establish OCR recognition accuracy.
- Real camera-center/detail test: **one capture connection**, 160 grid frame updates, 102 detail frame updates, 26 OCR frames processed. Capture stayed alive after closing detail and stopped on center close.
- The four-tile layout was rendered and visually inspected using explicit grid fixtures, not substituted camera screenshots.

The preceding 58-test and frozen-preview results describe dev1. Final dev2 EXE diagnostics: exit code 0, one capture connection, 191 frames displayed/painted, 61 OCR frames processed and 61 result batches delivered in 15 seconds, 2304×1296, clean capture and OCR shutdown. The existing local model files were used; the EXE did not depend on an external Python installation. These results do not measure plate accuracy. Remaining acceptance items above, including actual vehicle tracking, still apply.
