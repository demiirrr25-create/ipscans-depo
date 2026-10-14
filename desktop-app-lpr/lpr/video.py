"""Sequential offline video evaluation; never reconnects/replays after EOF."""
from pathlib import Path
import math
import time
from .tracking import TrackedConsensus


def analyze_video(pipeline, path, *, every=1, max_frames=300, on_result=None,
                  cancelled=lambda:False, capture_factory=None, region=None):
    import cv2
    target = Path(path)
    if not target.is_file():
        raise ValueError("Recorded video must be a local file")
    if every < 1 or not 1 <= max_frames <= 100000:
        raise ValueError("Invalid video sampling limits")
    cap = (capture_factory or cv2.VideoCapture)(str(target))
    engine = TrackedConsensus("RECORDED",region=region)
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
            if media_time is not None:
                decisions=engine.observe(predictions,read_count,media_time,media_time,
                                         frame.shape[1],frame.shape[0])
                item["decisions"]=decisions
                item["decision"]=decisions[0] if len(decisions)==1 else None
                for decision in decisions:
                    counts[decision["status"]]=counts.get(decision["status"],0)+1
                if not decisions:item["status"]="no_plate_in_region"
            else:
                engine.reset()
                item["status"]="unknown_fps"
            if on_result:
                on_result(item)
    finally:
        cap.release()
    return {"source":"recorded_video","frames_read":read_count,"frames_analyzed":analyzed,
            "decision_counts":counts,"cancelled":bool(cancelled()),"barrier_commands":0}
