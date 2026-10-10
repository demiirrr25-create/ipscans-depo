"""Explicit opt-in download of pinned upstream models for offline development only.

No upload, executable code download, training or commercial approval is performed.
"""
import argparse
import hashlib
import json
from pathlib import Path
import urllib.request

ASSETS={
 "detector.onnx":("https://github.com/ankandrew/open-image-models/releases/download/assets/yolo-v9-t-384-license-plates-end2end.onnx",
    "888397b96d761c89db40bc9c305838e8652660f5e282c2cadebbe8d2951a77a8"),
 "ocr/model.onnx":("https://github.com/ankandrew/cnn-ocr-lp/releases/download/arg-plates/cct_xs_v2_global.onnx",
    "8031afb5fdc6b4d80462c9d542f1284ebd2cfddf5dbacd62609848d7e2855f44"),
 "ocr/config.yaml":("https://github.com/ankandrew/cnn-ocr-lp/releases/download/arg-plates/cct_xs_v2_global_plate_config.yaml",
    "0335c74a305173bb6f393efed0fde03cadeaa0b649ed8e19f431016d8232d0a6")}


def prepare(root,progress=lambda value:None):
    root=Path(root).resolve();root.mkdir(parents=True,exist_ok=True)
    for name,(url,sha) in ASSETS.items():
        path=root/name
        if path.exists():
            if hashlib.sha256(path.read_bytes()).hexdigest()!=sha:
                raise ValueError(f"Existing asset checksum mismatch: {name}")
        else:
            with urllib.request.urlopen(url,timeout=60) as response:
                data=response.read(50*1024*1024+1)
            if len(data)>50*1024*1024 or hashlib.sha256(data).hexdigest()!=sha:
                raise ValueError(f"Downloaded asset checksum mismatch: {name}")
            path.parent.mkdir(parents=True,exist_ok=True)
            with path.open("xb") as stream:stream.write(data)
        progress(name)
    manifest={"license":"Upstream library repositories MIT; commercial weight/data clearance pending",
        "source":"https://github.com/ankandrew/open-image-models/releases/tag/assets",
        "reviewed_by":"Development source review; not legal approval", "reviewed_at":"2026-10-10",
        "evaluation_permitted":True,"commercial_use_approved":False,
        "detector":{"path":"detector.onnx","sha256":ASSETS["detector.onnx"][1],
            "format":"batch_xyxy_class_score","input_size":384,"threshold":.5},
        "ocr":{"backend":"fast_plate_ocr","path":"ocr","model_file":"model.onnx","config_file":"config.yaml",
            "files":{"model.onnx":ASSETS["ocr/model.onnx"][1],"config.yaml":ASSETS["ocr/config.yaml"][1]}}}
    target=root/"evaluation-models.json"
    # Never overwrite an operator's commercial manifest.
    target.write_text(json.dumps(manifest,indent=2),encoding="utf-8")
    return target


if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output",default="models/evaluation")
    args=parser.parse_args()
    print(prepare(args.output))
