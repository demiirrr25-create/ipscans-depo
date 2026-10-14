"""Replay a local, hash-pinned video against labels fixed before inference.

Runs the application's unmodified detector/tracker/crossing path, without OCR.
No downloads, camera connections, or access to the user's database.
"""
import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import platform
import statistics
import sys
import time

sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from lpr.lines import CrossingLine
from lpr.passage_metrics import score_passages
from lpr.passages import VehiclePassages
from lpr.vehicles import YoloxVehicleDetector


def digest(path):
    with path.open('rb') as stream:return hashlib.file_digest(stream,'sha256').hexdigest()


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    for name in ('video','model','labels','output'):parser.add_argument('--'+name,type=Path,required=True)
    args=parser.parse_args()
    if args.output.exists():parser.error('Use a new output file to preserve previous results')
    labels=json.loads(args.labels.read_text(encoding='utf-8'))
    for name in ('video','model'):
        if digest(getattr(args,name))!=labels[name+'_sha256']:parser.error(name+' hash does not match labels')
    score_passages(labels['events'],[],labels['tolerance'])
    start,end,rate=labels['start'],labels['end'],labels['sample_fps']
    if not all(math.isfinite(v) for v in (start,end,rate)) or not 0<=start<end or not 1<=rate<=60:
        parser.error('Invalid evaluation interval or sample rate')
    import cv2
    import onnxruntime
    detector=YoloxVehicleDetector(dict(format='yolox_raw_coco',input_size=416,resolved_path=str(args.model)))
    passages=VehiclePassages('evaluation',[CrossingLine(**line) for line in labels['lines']])
    capture=cv2.VideoCapture(str(args.video))
    fps=capture.get(cv2.CAP_PROP_FPS)
    if not capture.isOpened() or not math.isfinite(fps) or fps<=0:raise RuntimeError('Cannot decode video')
    index=0;next_sample=start;actual=[];samples=[];latencies=[];last_decoded=-1
    began=time.perf_counter()
    try:
        while True:
            ok,frame=capture.read()
            if not ok:break
            at=index/fps;last_decoded=at
            if at>end:break
            if at+1e-9>=next_sample:
                h,w=frame.shape[:2]
                tick=time.perf_counter();vehicles=detector.detect(frame)
                events=passages.observe(vehicles,[],index,at,at,w,h)
                latencies.append((time.perf_counter()-tick)*1000)
                actual.extend(dict(id=e['event_id'],time=at,line_id=e['line_id'],direction=e['direction'],track_id=e['track_id']) for e in events)
                samples.append(dict(time=at,tracks=[dict(id=t.id,hits=t.hits,kind=t.vehicle.kind,box=vars(t.vehicle.box)) for t in passages.tracker.tracks.values()]))
                next_sample+=1/rate
            index+=1
    finally:capture.release()
    if last_decoded<end-1/fps:raise RuntimeError('Video ended before the labelled interval')
    result=dict(scope=labels['scope'],labels_sha256=digest(args.labels),video_sha256=labels['video_sha256'],model_sha256=labels['model_sha256'],
        environment=dict(python=platform.python_version(),platform=platform.platform(),processor=platform.processor(),logical_cpus=os.cpu_count(),opencv=cv2.__version__,onnxruntime=onnxruntime.__version__,provider='CPUExecutionProvider',inference_threads=2),
        video_fps=fps,start=start,end=end,sample_fps=rate,sampled_frames=len(samples),wall_seconds=time.perf_counter()-began,
        pipeline_median_ms=statistics.median(latencies),pipeline_max_ms=max(latencies),
        metrics=score_passages(labels['events'],actual,labels['tolerance']),actual=actual,samples=samples)
    with args.output.open('x',encoding='utf-8') as stream:json.dump(result,stream,indent=2,allow_nan=False)
    print(json.dumps({k:v for k,v in result.items() if k not in ('samples','actual')},indent=2))


if __name__=='__main__':main()
