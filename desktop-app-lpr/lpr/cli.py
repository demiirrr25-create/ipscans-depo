import argparse
from dataclasses import asdict
import importlib.util
import json
import os
from pathlib import Path
import platform
from queue import Empty
import sys
import time

from .core import Consensus, Reading, normalize_plate
from .metrics import summarize
from .store import EventStore


def emit(value):
    print(json.dumps(value,ensure_ascii=False),flush=True)


def doctor():
    modules = ("cv2","numpy","onnxruntime","fast_plate_ocr","paddleocr","paddle","PySide6")
    result = {"python":platform.python_version(),"platform":platform.platform(),
              "dependencies":{name:importlib.util.find_spec(name) is not None for name in modules},
              "hardware_tested":False,"barrier_control":"not_implemented"}
    emit(result)
    return 0


def demo(database):
    engine = Consensus()
    store = EventStore(database)
    try:
        for idx,(text,score) in enumerate([
            ("34 ABC 123",.96),("34ABC123",.94),("34ABC123",.97),
            ("34ABC123",.99),("06AB1234",.52),("99ZZ999",.99)]):
            result = engine.observe(Reading("SIMULATED",idx,idx*.1,text,score),idx*.1)
            store.append(result)
            emit({"source":"synthetic_ocr_fixture","decision":asdict(result)})
        emit({"stored_events":len(store.search()),"barrier_commands":0,
              "real_recognition_accuracy":None})
    finally:
        store.close()
    return 0


def benchmark(pipeline, manifest, output):
    import cv2
    from .vision import canonical_path
    path = canonical_path(manifest)
    data = json.loads(path.read_text(encoding="utf-8"))
    if not data.get("dataset_id") or data.get("usage_authorized") is not True:
        raise ValueError("An identified, authorized dataset is required")
    rows = []
    for case in data["samples"]:
        target = canonical_path(path.parent/case["image"])
        if not target.is_relative_to(path.parent):
            raise ValueError("Dataset images must be under the manifest directory")
        frame = cv2.imread(str(target))
        if frame is None:
            raise ValueError("Dataset image could not be read")
        predictions,latency = pipeline.analyze(frame)
        predicted = normalize_plate(predictions[0]["text"]) if len(predictions) == 1 else ""
        rows.append({"image":case["image"],"expected":normalize_plate(case["expected"]),
                     "predicted":predicted,"latency_ms":latency,
                     "ambiguous":len(predictions)>1})
    report = {"dataset_id":data["dataset_id"],"synthetic":bool(data.get("synthetic",False)),
              "evaluation":getattr(pipeline,"evaluation",False),
              "scope":"one_plate_per_image; ambiguous detections count as abstentions",
              "latency_scope":"detector+ocr; excludes decoding and RTSP transport",
              "metrics":summarize(rows),"rows":rows,
              "python":platform.python_version(),"providers":pipeline.detector.providers}
    Path(output).write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
    emit(report["metrics"])
    return 0


def live(pipeline, args):
    if getattr(pipeline,"evaluation",False):
        raise ValueError("Evaluation models are restricted to offline inputs")
    from .camera import CameraConfig, CameraWorker
    source = os.environ.get(args.source_env)
    if not source:
        raise ValueError("Camera source environment variable is missing")
    worker = CameraWorker(CameraConfig(source,camera_id=args.camera))
    store,engine = EventStore(args.database),Consensus()
    worker.start()
    deadline = time.monotonic()+args.seconds
    last_status = None
    try:
        while time.monotonic() < deadline:
            if worker.status != last_status:
                emit({"camera":args.camera,"status":worker.status})
                last_status = worker.status
            try:
                frame = worker.frames.get(timeout=.25)
            except Empty:
                continue
            predictions,latency = pipeline.analyze(frame.image)
            if len(predictions) != 1:
                # Until tracking/ROI are implemented, refuse cross-vehicle consensus.
                engine = Consensus()
                emit({"camera":args.camera,"status":"no_plate" if not predictions else "ambiguous",
                      "detections":len(predictions)})
                continue
            prediction = predictions[0]
            decision = engine.observe(Reading(args.camera,frame.sequence,frame.captured_at,
                prediction["text"],prediction["confidence"]),time.monotonic())
            store.append(decision)
            emit({"source":"live_rtsp","camera":args.camera,"decision":asdict(decision),"inference_ms":latency,
                  "capture_to_decision_ms":(time.monotonic()-frame.captured_at)*1000,
                  "dropped_frames":worker.dropped})
    except KeyboardInterrupt:
        pass
    finally:
        worker.stop()
        worker.join(timeout=7)
        store.close()
    if worker.is_alive():
        emit({"status":"capture_shutdown_timeout"})
        return 2
    return 0


def main(argv=None):
    parser = argparse.ArgumentParser(description="IPScans LPR Pro development preview; no barrier output")
    commands = parser.add_subparsers(dest="command",required=True)
    commands.add_parser("doctor")
    setup=commands.add_parser("setup-models")
    setup.add_argument("--output",required=True)
    device=commands.add_parser("device-status")
    device.add_argument("--protocol",choices=["Modbus TCP","Shelly RPC"],required=True)
    device.add_argument("--host",required=True)
    device.add_argument("--port",type=int,required=True)
    device.add_argument("--unit",type=int,default=1)
    device.add_argument("--channel",type=int,default=0)
    d = commands.add_parser("demo",help="synthetic OCR evidence; no AI inference")
    d.add_argument("--database",default=":memory:")
    for command in ("image","live","benchmark","video"):
        p = commands.add_parser(command)
        p.add_argument("--models",required=True,help="reviewed local model manifest")
        p.add_argument("--gpu",action="store_true")
        if command in {"image","video"}:
            p.add_argument("path")
            if command == "video":
                p.add_argument("--every",type=int,default=1)
                p.add_argument("--max-frames",type=int,default=300)
        elif command == "live":
            p.add_argument("--source-env",default="IPSCANS_LPR_RTSP")
            p.add_argument("--camera",default="camera-1")
            p.add_argument("--database",default=":memory:")
            p.add_argument("--seconds",type=float,default=60)
        else:
            p.add_argument("--dataset",required=True)
            p.add_argument("--output",required=True)
        if command != "live":
            p.add_argument("--evaluation",action="store_true",help="Offline evaluation only; not a commercial-use approval")
    args = parser.parse_args(argv)
    try:
        if args.command == "device-status":
            from .devices import read_modbus_coil,read_shelly_switch
            state=(read_modbus_coil(args.host,args.port,args.unit,args.channel) if args.protocol=="Modbus TCP"
                   else read_shelly_switch(args.host,args.port,args.channel))
            emit({"relay_state":state,"barrier_commands":0})
            return 0
        if args.command == "setup-models":
            from .model_setup import prepare
            target=prepare(args.output,progress=lambda name:emit({"verified":name}))
            emit({"model_manifest":str(target)})
            return 0
        if args.command == "doctor":
            return doctor()
        if args.command == "demo":
            return demo(args.database)
        from .vision import build_pipeline
        if args.command == "live" and not 0 < args.seconds <= 86400:
            raise ValueError("Run duration must be 0..86400 seconds")
        pipeline = build_pipeline(args.models,args.gpu,evaluation=getattr(args,"evaluation",False))
        if args.command == "benchmark":
            return benchmark(pipeline,args.dataset,args.output)
        if args.command == "live":
            return live(pipeline,args)
        if args.command == "video":
            from .video import analyze_video
            emit(analyze_video(pipeline,args.path,every=args.every,max_frames=args.max_frames,on_result=emit))
            return 0
        import cv2
        frame = cv2.imread(args.path)
        if frame is None:
            raise ValueError("Image could not be read")
        readings,latency = pipeline.analyze(frame)
        emit({"source":"offline_image","evaluation":getattr(args,"evaluation",False),
              "readings":[{**r,"box":asdict(r["box"])} for r in readings],"inference_ms":latency})
        return 0
    except Exception as exc:
        # Paths, credentials and raw native/model exceptions are deliberately not emitted.
        emit({"error":type(exc).__name__,"message":"İşlem tamamlanamadı. Bağımlılıkları, yerel model manifestini ve giriş yapılandırmasını kontrol edin."})
        return 2


if __name__ == "__main__":
    sys.exit(main())
