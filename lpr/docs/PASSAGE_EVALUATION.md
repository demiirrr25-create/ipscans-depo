# Fixed-camera passage diagnostic — 2026-10-14

The 106-second daylight recording produced nine visually labelled crossings (five entry, four exit). The initial application pipeline found all nine but emitted two false reverse crossings. A conservative association scale gate removed both false events on replay, preserving all nine expected events. This is a debugging result on one development clip, **not a production accuracy estimate**.

| Run | Expected | Predicted | Matched | Extra | Missed |
|---|---:|---:|---:|---:|---:|
| Before scale gate | 9 | 11 | 9 | 2 | 0 |
| After scale gate | 9 | 9 | 9 | 0 | 0 |

## Protocol and source

[Road traffic – cobblestone road](https://commons.wikimedia.org/wiki/File:Road_traffic_%E2%80%93_cobblestone_road.webm), Sounds of Changes / Technical Museum of Slovenia. Video: Barbara Rezar Grilc; sound: Boštjan Troha; photo: Dušan Oblak. Commons licensing section states [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/); its summary additionally mentions CC BY 4.0. Preserve attribution and verify terms before redistributing derivatives. Source footage and weights are not bundled in this checkpoint.

The original video's SHA-256 is pinned in `tests/fixtures/road-passages.json`. Before inference, Codex visually inspected raw frames every second across 0–106 seconds and finer 0.1-second samples around the first crossing. The line, time window, labels, sampling rate and 0.75-second matching tolerance were fixed before the baseline run. Labels use the approximate bottom center of the visible vehicle, with up to 0.5-second timing uncertainty. This is a single AI visual annotation pass, not an independent human-adjudicated reference; sparse inspection can miss very brief events.

Normalized line: `(0.05, 0.65)` to `(0.85, 0.65)`. Downward motion is entry, upward motion exit. Matching requires the same line and direction, within the fixed time window, one prediction per label. Duplicate and wrong-direction predictions count as false positives. Empty-reference rates are undefined rather than reported as perfect.

## Failure and correction

At 38.2 and 100.0 seconds, a departing foreground vehicle uncovered a parked vehicle. IoU overlap allowed the old identity to attach to the parked car, moving its bottom center backward across the line. The tracker now rejects associations when either box dimension changes by more than a factor of 2.5 between observations. Ambiguous identities are retired; the new observation needs a new track. Tests retain both observed geometry failures and a smooth scale-change case.

This gate is deliberately conservative. Clipped or rapidly changing boxes can lose identity, potentially missing a crossing. It does not solve all occlusions or identity switches. Because the correction was informed by this recording, the replay is a regression/development check; a separate held-out set is still required.

## Reproduction

Run from `lpr/`, supplying the downloaded originals and a new output filename:

```text
python scripts/evaluate_passages.py --video PATH/road.webm --model PATH/yolox_nano.onnx --labels tests/fixtures/road-passages.json --output PATH/new-result.json
```

The evaluator refuses mismatched video/model hashes, existing output files and videos ending before the labelled interval. It invokes the application's unchanged YOLOX adapter, tracker and line-crossing engine, with no OCR, camera access or user database access. It records per-sample tracks, event times, matching results, artifact hashes and execution environment. Frame times use the file's reported constant 25 FPS; variable-frame-rate input is not qualified by this evaluator.

Input: 1920×1080, 25 FPS; inference sampled at 5 FPS, 531 samples. YOLOX-Nano input 416×416. Windows 11 build 26200, Intel64 Family 6 Model 183 Stepping 1, 16 logical CPUs, Python 3.13.16, OpenCV 5.0.0, ONNX Runtime 1.31.0 CPU provider, two inference threads. Corrected run: median detection/tracking time 13.64 ms, maximum 36.47 ms, 23.25 seconds total offline replay. This excludes OCR, live transport and UI and is not a multi-camera capacity or live-latency claim.

No Turkish plate text was labelled or scored. Night, rain, camera movement, substantial occlusion and long-duration operation remain outside this diagnostic. The existing dev3 installer predates this source correction and automatic retention changes.
