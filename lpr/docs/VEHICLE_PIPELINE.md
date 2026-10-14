# Vehicle detection and passage integration

The vehicle detector is separate from the plate detector. The evaluation candidate is the official YOLOX-Nano ONNX release documented at https://github.com/Megvii-BaseDetection/YOLOX/tree/main/demo/ONNXRuntime . Its input is float32 NCHW BGR 0..255, top-left letterboxed to 416×416. Output is the raw COCO tensor; the adapter decodes stride grids and filters car, motorcycle, bus and truck classes.

Pinned artifact: `https://github.com/Megvii-BaseDetection/YOLOX/releases/download/0.1.1rc0/yolox_nano.onnx`, 3,659,407 bytes, SHA-256 `c789161ed43c8269fcd4e67c67eeeb4e80c622da2eb296a20bc6007bd18a0b7d`. This checksum was measured from the official download; it is not an upstream signature.

The upstream repository is Apache-2.0 (notice retained under `third-party-notices/YOLOX`). The adapter follows its documented tensor contract. Complete commercial weight/training-data distribution review remains open. The model is downloaded explicitly for evaluation, not bundled in the application binary.

The initial independent tracker uses mutual unambiguous IoU matching, a velocity prediction, high-confidence births and lower-confidence continuation. It is not ByteTrack. Ambiguous or missing tracks are retired rather than inventing motion through an occlusion. This trades missed passages for fewer false vehicle associations and requires evaluation against representative recordings.

Passages use the vehicle box's bottom center and a finite normalized line segment. A track must have at least three observations. Direction, line, camera and vehicle track determine an idempotent event ID. Plate evidence is assigned only when the plate lies fully inside exactly one tracked vehicle and that vehicle has only one plate candidate in the frame. Temporal votes, confidence and plate format determine whether the plate needs review. A vehicle may produce an unread passage: no plate is fabricated.

Physical vehicle crossing, identity stability under occlusion, night/rain performance and OCR accuracy still need real labeled validation. Unit tests are not evidence of those field results.

## Validation checkpoint, 2026-10-14

The official model loaded with input `[1,3,416,416]` and output `[1,3549,85]`; a blank frame produced zero detections. Automated tests cover tensor decoding, vehicle class filtering, low-score continuation, ambiguous association, missing frames, direction, duplicate suppression, unread passages, conflicting OCR evidence, database replay protection and retention. A worker integration test exercises vehicle inference through the existing shared camera snapshot interface.

An independently sourced night video was also evaluated: **Cars Passing by at Night**, Maximilian Schönherr, 2024-01-03, https://commons.wikimedia.org/wiki/File:Cars_Passing_by_at_Night.webm . License: https://creativecommons.org/licenses/by-sa/4.0/ (CC BY-SA 4.0). Original 3,827,853-byte video SHA-256: `f15a2299b70fe4f43b87e411ccc05641d34e4dd74139c3247acf61f630e3b3c0`. The source video is not bundled in the product. Local inspection derivatives are subject to the same attribution/share-alike terms.

All 372 video frames decoded (24 FPS). Sampling every five frames and resizing to 1280×720 yielded 75 inference samples; 65 had at least one candidate at the low continuation threshold. These counts are diagnostic, **not accuracy metrics**. Visual inspection showed camera panning and low-confidence false candidates. This clip does not establish fixed-camera passage accuracy, and no Turkish OCR accuracy is claimed. A static-camera labeled dataset remains required. Camera movement rejection is not implemented yet; line crossings assume a stationary camera.
