# IPCast 1.1 Preview

Automatic relay remains enabled for every client profile. Close older instances and update both computers. The device owner still approves access and the viewer verifies device trust.

## Performance

- Balanced: 1600-pixel longest edge, JPEG 60, up to 20 fps.
- Speed: 1280-pixel longest edge, JPEG 45, up to 20 fps.
- Quality: 2560-pixel longest edge, JPEG 80, up to 15 fps.
- Choose Settings → Display performance on the computer being shared, before connecting.
- Large frames are paced against average application-data budgets (including estimated base64 overhead): Balanced 1 MiB/s, Speed 384 KiB/s, Quality 2 MiB/s. FPS decreases when needed instead of always sending at the maximum rate. These are pacing targets, not physical-link throughput guarantees.
- Encode/send time now counts toward the frame interval instead of adding a fixed 200 ms delay.
- Unchanged desktops skip JPEG encoding and transmission, with a one-second refresh.
- The viewer keeps only the latest pending rendered frame instead of adding every frame to the UI dispatch queue.
- Standard JPEG framing is retained for protocol compatibility. This release does not add a hardware video codec or a new relay capacity tier.

Synthetic 3840×2160 texture benchmark, same Windows computer, five warmed encoding iterations (excludes capture, network and rendering): previous JPEG70 520859 bytes / 97.68 ms; Balanced 355420 bytes / 52.13 ms; Speed 151725 bytes / 34.10 ms; Quality 1088279 bytes / 90.74 ms. These measurements are not end-to-end latency or universal speed guarantees. Quality can use more bandwidth than the previous default.

## Design and accessibility

Original connected-screen vector logo, embedded Windows executable/window icon, navy/teal palette, clearer sections, persistent connection-field labels, accessible names, 44-pixel minimum button/input targets, keyboard focus styling and scrollable small-window layout. Home and Settings were rendered with Avalonia's headless Skia backend at normal and minimum window sizes. This is not a full screen-reader certification.

## Validation

84 automated tests passed, including bandwidth pacing, aspect-ratio preservation/no upscaling, idle frame suppression/refresh, permissions and existing transport tests. The previous Auto Relay release was reported working by the owner. New release performance on two physical computers still needs comparative field measurement.
