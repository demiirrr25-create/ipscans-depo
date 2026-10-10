import hashlib
import json
from pathlib import Path
import tempfile
import time
import unittest
from unittest.mock import Mock

from lpr.camera import CameraConfig, CameraWorker
from lpr.vision import Box, Pipeline, decode_boxes, load_manifest


class VisionCameraTests(unittest.TestCase):
    def test_letterbox_coordinates_nms_and_nan(self):
        boxes = decode_boxes([[100,170,300,230,.9,0],[102,170,300,230,.8,0],
                              [0,0,4,4,float("nan"),0],[1,1,100,100,.99,1]],
                             1280,640,640,.5,0,160)
        self.assertEqual(boxes,[Box(200,20,600,140,.9)])
        with self.assertRaises(ValueError):
            decode_boxes([[1,2,3]],100,100,640,1,0,0)

    def test_real_array_crop_with_fake_inference(self):
        import numpy as np
        detector,ocr = Mock(),Mock()
        detector.detect.return_value = [Box(10,20,110,50,.99)]
        ocr.recognize.return_value = ("34ABC123",.95)
        result,ms = Pipeline(detector,ocr).analyze(np.zeros((100,200,3),dtype=np.uint8))
        self.assertEqual(ocr.recognize.call_args.args[0].shape,(30,100,3))
        self.assertEqual(result[0]["text"],"34ABC123")
        self.assertGreaterEqual(ms,0)

    def test_provenance_hash_and_traversal(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root/"d.onnx").write_bytes(b"fixture")
            (root/"ocr").mkdir()
            (root/"ocr"/"model").write_bytes(b"fixture")
            sha = hashlib.sha256(b"fixture").hexdigest()
            value = {"license":"fixture-only","source":"internal:test","reviewed_by":"test",
                     "reviewed_at":"2026-10-10","commercial_use_approved":True,
                     "detector":{"path":"d.onnx","sha256":sha},
                     "ocr":{"path":"ocr","files":{"model":sha}}}
            path = root/"models.json"
            path.write_text(json.dumps(value))
            self.assertEqual(load_manifest(path)["license"],"fixture-only")
            (root/"d.onnx").write_bytes(b"tampered")
            with self.assertRaises(ValueError): load_manifest(path)
            value["detector"]["path"] = "../outside.onnx"
            path.write_text(json.dumps(value))
            with self.assertRaises(ValueError): load_manifest(path)
            value["commercial_use_approved"] = False
            path.write_text(json.dumps(value))
            with self.assertRaises(ValueError): load_manifest(path)

    def test_evaluation_is_explicit_and_cannot_bypass_checksums(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);(root/"detector").write_bytes(b"test")
            (root/"ocr").mkdir();(root/"ocr/model").write_bytes(b"test")
            sha=hashlib.sha256(b"test").hexdigest()
            value={"license":"evaluation fixture","source":"internal:test","reviewed_by":"test",
                "reviewed_at":"2026-10-10","commercial_use_approved":False,"evaluation_permitted":True,
                "detector":{"path":"detector","sha256":sha},"ocr":{"path":"ocr","files":{"model":sha}}}
            path=root/"models.json";path.write_text(json.dumps(value))
            with self.assertRaises(ValueError):load_manifest(path)
            self.assertFalse(load_manifest(path,evaluation=True)["commercial_use_approved"])
            (root/"ocr/model").write_bytes(b"changed")
            with self.assertRaises(ValueError):load_manifest(path,evaluation=True)

    def test_reconnect_bounded_queue_and_shutdown(self):
        import numpy as np
        frame = np.zeros((16,32,3),dtype=np.uint8)
        bad,good = Mock(),Mock()
        bad.isOpened.return_value = False
        good.isOpened.return_value = True
        good.read.side_effect = lambda:(True,frame)
        factory = Mock(side_effect=[bad,good])
        worker = CameraWorker(CameraConfig("rtsp://secret:password@example.invalid/live",
                              reconnect_seconds=.01),factory)
        worker.start()
        deadline = time.monotonic()+2
        while worker.dropped < 5 and time.monotonic() < deadline:
            time.sleep(.005)
        worker.stop()
        worker.join(timeout=2)
        self.assertFalse(worker.is_alive())
        self.assertGreater(worker.dropped,0)
        self.assertLessEqual(worker.frames.qsize(),1)
        self.assertGreaterEqual(worker.reconnects,1)
        bad.release.assert_called_once()
        good.release.assert_called_once()
        self.assertNotIn("password",repr(worker.config))

    def test_backend_exception_does_not_escape(self):
        worker = CameraWorker(CameraConfig("private",reconnect_seconds=.01),
                              Mock(side_effect=RuntimeError("secret")))
        worker.start()
        time.sleep(.03)
        worker.stop()
        worker.join(timeout=1)
        self.assertFalse(worker.is_alive())
        self.assertEqual(worker.status,"stopped")


if __name__ == "__main__":
    unittest.main()
