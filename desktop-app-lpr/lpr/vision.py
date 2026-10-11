"""Optional local inference adapters; model files must be supplied explicitly."""
from dataclasses import dataclass
from pathlib import Path
import hashlib
import json
import math
import os
import time


def verify_artifact(path, sha256):
    if not isinstance(sha256, str) or len(sha256) != 64:
        raise ValueError("A SHA-256 digest is required")
    digest = hashlib.sha256()
    with Path(path).open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024*1024), b""):
            digest.update(chunk)
    if digest.hexdigest() != sha256.lower():
        raise ValueError("Model checksum mismatch")


def canonical_path(path):
    # Normalize dot segments before filesystem resolution (Windows/Python 3.14).
    return Path(os.path.abspath(path)).resolve()


def load_manifest(path, *, evaluation=False):
    path = canonical_path(path)
    value = json.loads(path.read_text(encoding="utf-8"))
    for field in ("license", "source", "reviewed_by", "reviewed_at"):
        if not value.get(field) or str(value[field]).startswith("REQUIRED"):
            raise ValueError(f"Model provenance missing: {field}")
    if evaluation:
        if value.get("evaluation_permitted") is not True:
            raise ValueError("Model evaluation permission is not recorded")
    elif value.get("commercial_use_approved") is not True:
        raise ValueError("Model commercial-use review is not approved")
    # This is an operator review record, not legal verification or a signature.
    for name in ("detector", "ocr"):
        artifact = value[name]
        root = canonical_path(path.parent / artifact["path"])
        if not root.is_relative_to(path.parent):
            raise ValueError("Model must reside under manifest directory")
        artifact["resolved_path"] = str(root)
        if name == "detector":
            verify_artifact(root, artifact["sha256"])
        else:
            if not artifact.get("files"):
                raise ValueError("OCR file checksums required")
            for filename, sha in artifact["files"].items():
                item = canonical_path(root / filename)
                if not item.is_relative_to(root):
                    raise ValueError("Invalid OCR file path")
                verify_artifact(item, sha)
            if artifact.get("backend") == "fast_plate_ocr":
                for field in ("model_file", "config_file"):
                    if artifact.get(field) not in artifact["files"]:
                        raise ValueError("OCR runtime files must have verified checksums")
    return value


@dataclass(frozen=True)
class Box:
    x1: int
    y1: int
    x2: int
    y2: int
    score: float


def iou(a, b):
    intersect = max(0, min(a.x2,b.x2)-max(a.x1,b.x1))*max(0,min(a.y2,b.y2)-max(a.y1,b.y1))
    union = (a.x2-a.x1)*(a.y2-a.y1)+(b.x2-b.x1)*(b.y2-b.y1)-intersect
    return intersect/union if union else 0


def decode_boxes(rows, width, height, size, scale, pad_x, pad_y, threshold=.5):
    """Strict end-to-end detector contract: [x1,y1,x2,y2,score,class] in input pixels."""
    boxes = []
    if len(rows) > 10000:
        raise ValueError("Detector exceeded output capacity")
    for row in rows:
        if len(row) != 6:
            raise ValueError("Expected postprocessed Nx6 detector output")
        x1,y1,x2,y2,score,cls = map(float,row)
        if not all(math.isfinite(v) for v in (x1,y1,x2,y2,score,cls)):
            continue
        if cls != 0 or not threshold <= score <= 1 or x2 <= x1 or y2 <= y1:
            continue
        box = Box(max(0,min(width,int((x1-pad_x)/scale))),
                  max(0,min(height,int((y1-pad_y)/scale))),
                  max(0,min(width,int((x2-pad_x)/scale))),
                  max(0,min(height,int((y2-pad_y)/scale))),score)
        if box.x2-box.x1 >= 8 and box.y2-box.y1 >= 4:
            boxes.append(box)
    kept = []
    for box in sorted(boxes,key=lambda b:b.score,reverse=True):
        if all(iou(box,k) < .45 for k in kept):
            kept.append(box)
    return kept[:16]


class OnnxDetector:
    def __init__(self, artifact, gpu=False):
        import onnxruntime as ort
        self.size = int(artifact.get("input_size",640))
        self.format = artifact.get("format")
        if not 64 <= self.size <= 2048 or self.format not in {"xyxy_score_class", "batch_xyxy_class_score"}:
            raise ValueError("Unsupported detector model contract")
        self.threshold = float(artifact.get("threshold", .5))
        if not math.isfinite(self.threshold) or not 0 <= self.threshold <= 1:
            raise ValueError("Invalid detector threshold")
        providers = ["CPUExecutionProvider"]
        if gpu:
            if "CUDAExecutionProvider" not in ort.get_available_providers():
                raise ValueError("CUDA requested but unavailable")
            providers.insert(0,"CUDAExecutionProvider")
        opts = ort.SessionOptions()
        opts.intra_op_num_threads = 2
        self.session = ort.InferenceSession(artifact["resolved_path"],sess_options=opts,providers=providers)
        inputs = self.session.get_inputs()
        if len(inputs) != 1 or inputs[0].type != "tensor(float)":
            raise ValueError("Expected one float32 NCHW RGB input")
        shape = inputs[0].shape
        if len(shape) != 4 or any(isinstance(actual,int) and actual != expected
                for actual,expected in zip(shape,[1,3,self.size,self.size])):
            raise ValueError("Detector input shape disagrees with manifest")
        self.name = inputs[0].name
        self.providers = self.session.get_providers()
        if gpu and "CUDAExecutionProvider" not in self.providers:
            raise ValueError("CUDA provider failed to initialize")

    def detect(self, frame):
        import cv2
        import numpy as np
        h,w = frame.shape[:2]
        scale = min(self.size/w,self.size/h)
        nw,nh = max(1,round(w*scale)),max(1,round(h*scale))
        px,py = (self.size-nw)//2,(self.size-nh)//2
        canvas = np.full((self.size,self.size,3),114,dtype=np.uint8)
        canvas[py:py+nh,px:px+nw] = cv2.resize(frame,(nw,nh))
        tensor = np.ascontiguousarray(canvas[:,:,::-1].transpose(2,0,1)[None],dtype=np.float32)/255.0
        output = self.session.run(None,{self.name:tensor})[0]
        if output.ndim == 3 and output.shape[0] == 1:
            output = output[0]
        if self.format == "batch_xyxy_class_score":
            if output.ndim != 2 or output.shape[1] != 7:
                raise ValueError("Expected Nx7 batch,xyxy,class,score output")
            output = output[output[:,0] == 0][:,[1,2,3,4,6,5]]
        if output.ndim != 2 or output.shape[1] != 6:
            raise ValueError("Raw YOLO tensors are unsupported: export end-to-end Nx6")
        return decode_boxes(output,w,h,self.size,scale,px,py,self.threshold)


class FastPlateRecognizer:
    """Local ONNX OCR; never asks the model hub to download anything."""
    def __init__(self, artifact, gpu=False):
        import onnxruntime as ort
        from fast_plate_ocr import LicensePlateRecognizer
        root = Path(artifact["resolved_path"])
        providers = ["CPUExecutionProvider"]
        if gpu:
            if "CUDAExecutionProvider" not in ort.get_available_providers():
                raise ValueError("CUDA requested but unavailable")
            providers.insert(0,"CUDAExecutionProvider")
        opts = ort.SessionOptions()
        opts.intra_op_num_threads = 2
        self.model = LicensePlateRecognizer(onnx_model_path=root/artifact["model_file"],
            plate_config_path=root/artifact["config_file"],providers=providers,sess_options=opts)
        self.providers = self.model.model.get_providers()
        if gpu and "CUDAExecutionProvider" not in self.providers:
            raise ValueError("OCR CUDA provider failed to initialize")

    def recognize(self, crop):
        import cv2
        import numpy as np
        mode = self.model.config.image_color_mode
        converted = cv2.cvtColor(crop,cv2.COLOR_BGR2RGB if mode == "rgb" else cv2.COLOR_BGR2GRAY)
        prediction = self.model.run(converted,return_confidence=True)[0]
        scores = prediction.char_probs
        if not prediction.plate or scores is None or not len(scores):
            return "",0.0
        # Weakest character prevents high average confidence hiding one uncertain digit.
        return prediction.plate,float(np.min(scores[:len(prediction.plate)]))


class PaddleRecognizer:
    def __init__(self, artifact, gpu=False):
        from paddleocr import TextRecognition
        self.model = TextRecognition(model_name=artifact["model_name"],
            model_dir=artifact["resolved_path"],device="gpu:0" if gpu else "cpu")

    def recognize(self, crop):
        results = list(self.model.predict(input=crop,batch_size=1))
        if not results:
            return "",0.0
        return str(results[0]["rec_text"]),float(results[0]["rec_score"])


class Pipeline:
    def __init__(self, detector, recognizer):
        self.detector,self.recognizer = detector,recognizer

    def analyze(self, frame):
        import numpy as np
        if not isinstance(frame,np.ndarray) or frame.dtype != np.uint8 or frame.ndim != 3 or frame.shape[2] != 3:
            raise ValueError("Expected a uint8 BGR image")
        if min(frame.shape[:2]) < 1 or frame.shape[0]*frame.shape[1] > 3840*2160:
            raise ValueError("Image dimensions exceed pipeline limits")
        started = time.perf_counter()
        readings = []
        for box in self.detector.detect(frame):
            crop = frame[box.y1:box.y2,box.x1:box.x2].copy()
            if crop.size == 0:
                continue
            text,score = self.recognizer.recognize(crop)
            if not math.isfinite(score) or not 0 <= score <= 1:
                raise ValueError("OCR returned invalid confidence")
            readings.append({"text":text,"confidence":score,"box":box})
        return readings,(time.perf_counter()-started)*1000


def build_pipeline(manifest_path, gpu=False, *, evaluation=False):
    manifest = load_manifest(manifest_path,evaluation=evaluation)
    backend = manifest["ocr"].get("backend","paddleocr")
    if backend not in {"paddleocr","fast_plate_ocr"}:
        raise ValueError("Unsupported OCR backend")
    ocr = FastPlateRecognizer if backend == "fast_plate_ocr" else PaddleRecognizer
    pipeline = Pipeline(OnnxDetector(manifest["detector"],gpu),ocr(manifest["ocr"],gpu))
    pipeline.evaluation = evaluation
    return pipeline
