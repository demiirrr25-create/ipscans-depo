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
                     "ambiguous":len(predictions)>1,"condition":str(case.get("condition","unspecified"))})
    report = {"dataset_id":data["dataset_id"],"synthetic":bool(data.get("synthetic",False)),
              "evaluation":getattr(pipeline,"evaluation",False),
              "scope":"one_plate_per_image; ambiguous detections count as abstentions",
              "latency_scope":"detector+ocr; excludes decoding and RTSP transport",
              "metrics":summarize(rows),"rows":rows,
              "by_condition":{condition:summarize([r for r in rows if r['condition']==condition])
                              for condition in sorted({r['condition'] for r in rows})},
              "python":platform.python_version(),"providers":pipeline.detector.providers}
    Path(output).write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
    emit(report["metrics"])
    return 0


def live(pipeline, args):
    from .runtime import observe_cameras
    if args.cameras_env:
        config=json.loads(os.environ.get(args.cameras_env,"[]"))
        if not isinstance(config,list) or not 1<=len(config)<=16:
            raise ValueError("Expected 1..16 camera configurations")
        cameras=[{"id":c["id"],"source":os.environ.get(c["source_env"],""),
                  "roi":c.get("roi",[0,0,1,1]),"transport":c.get('transport','tcp')} for c in config]
    else:
        cameras=[{"id":args.camera,"source":os.environ.get(args.source_env,""),
                  "roi":list(vars(args.region).values())}]
    return observe_cameras(pipeline,cameras,args.seconds,args.database,emit)


def main(argv=None):
    parser = argparse.ArgumentParser(description="IPScans LPR Pro development preview; no barrier output")
    commands = parser.add_subparsers(dest="command",required=True)
    commands.add_parser("doctor")
    package_test=commands.add_parser('package-test',help='Synthetic UI/database/report check; never connects to cameras')
    package_test.add_argument('--output',required=True,help='New output directory; must not already exist')
    camera_test=commands.add_parser("camera-test",help="Decode or display an RTSP stream without OCR models")
    camera_test.add_argument("--source-env",default="IPSCANS_LPR_RTSP")
    camera_test.add_argument("--seconds",type=float,default=10)
    camera_test.add_argument("--transport",choices=['tcp','udp'],default='tcp')
    camera_test.add_argument("--preview",action="store_true")
    camera_test.add_argument("--models",help="Optional local manifest for simultaneous preview and OCR diagnostics")
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
        if command in {"live","video"}:
            p.add_argument("--roi",nargs=4,type=float,metavar=("LEFT","TOP","RIGHT","BOTTOM"),default=[0,0,1,1])
        if command in {"image","video"}:
            p.add_argument("path")
            if command == "video":
                p.add_argument("--every",type=int,default=1)
                p.add_argument("--max-frames",type=int,default=300)
        elif command == "live":
            p.add_argument("--source-env",default="IPSCANS_LPR_RTSP")
            p.add_argument("--cameras-env",help="Environment variable with camera IDs, source_env names and ROI; no URLs")
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
        if args.command=='package-test':
            from .package_check import check_package
            result=check_package(args.output);emit(result);return 0 if result['passed'] else 2
        if args.command == "camera-test":
            from .diagnostics import probe_camera
            result=probe_camera(os.environ.get(args.source_env,""),args.seconds,args.preview,args.models,args.transport)
            emit(result)
            healthy=result.get("frames_received",result.get("frames_displayed",0)) and result["shutdown_completed"]
            if args.models:healthy=healthy and result.get("ocr_processed",0)>0 and result.get("ocr_shutdown_completed",False)
            return 0 if healthy else 2
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
        if args.command in {"live","video"}:
            from .tracking import Region
            args.region=Region(*args.roi)
        if args.command == "live" and not 0 < args.seconds <= 86400:
            raise ValueError("Run duration must be 0..86400 seconds")
        pipeline = build_pipeline(args.models,args.gpu,evaluation=getattr(args,"evaluation",False))
        if args.command == "benchmark":
            return benchmark(pipeline,args.dataset,args.output)
        if args.command == "live":
            return live(pipeline,args)
        if args.command == "video":
            from .video import analyze_video
            emit(analyze_video(pipeline,args.path,every=args.every,max_frames=args.max_frames,on_result=emit,region=args.region))
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
