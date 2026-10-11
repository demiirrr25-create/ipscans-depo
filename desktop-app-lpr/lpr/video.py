"""Sequential offline video evaluation; never reconnects/replays after EOF."""
from pathlib import Path
import math
import time
from .core import Consensus, Reading


def analyze_video(pipeline, path, *, every=1, max_frames=300, on_result=None,
                  cancelled=lambda:False, capture_factory=None):
    import cv2
    target = Path(path)
    if not target.is_file():
        raise ValueError("Recorded video must be a local file")
    if every < 1 or not 1 <= max_frames <= 100000:
        raise ValueError("Invalid video sampling limits")
    cap = (capture_factory or cv2.VideoCapture)(str(target))
    engine = Consensus()
    read_count = analyzed = 0
    counts = {}
    fps = float(cap.get(cv2.CAP_PROP_FPS))
    if not math.isfinite(fps) or not 0 < fps <= 240:
        fps = None
    try:
        if not cap.isOpened():
            raise ValueError("Video cannot be opened")
        while read_count < max_frames and not cancelled():
            ok,frame = cap.read()
            if not ok:
                break
            read_count += 1
            if (read_count-1) % every:
                continue
            predictions,latency = pipeline.analyze(frame)
            analyzed += 1
            media_time = (read_count-1)/fps if fps else None
            item = {"source":"recorded_video","frame":read_count,"media_seconds":media_time,
                    "inference_ms":latency,"detections":len(predictions),"decision":None}
            if len(predictions)==1 and media_time is not None:
                prediction=predictions[0]
                # Media time is used ONLY for offline consensus, never wall-clock authorization.
                r=Reading("RECORDED",read_count,media_time,prediction["text"],prediction["confidence"])
                decision=engine.observe(r,media_time)
                item["decision"]=vars(decision)
                counts[decision.status]=counts.get(decision.status,0)+1
            else:
                engine=Consensus()
                item["status"]="unknown_fps" if fps is None else ("no_plate" if not predictions else "ambiguous")
            if on_result:
                on_result(item)
    finally:
        cap.release()
    return {"source":"recorded_video","frames_read":read_count,"frames_analyzed":analyzed,
            "decision_counts":counts,"cancelled":bool(cancelled()),"barrier_commands":0}
