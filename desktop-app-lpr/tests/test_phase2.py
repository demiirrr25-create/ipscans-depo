import contextlib
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock,patch
import numpy as np
from lpr.video import analyze_video
from lpr.vision import Pipeline, FastPlateRecognizer
from lpr.vision import canonical_path
from lpr.cli import main


class Phase2Tests(unittest.TestCase):
    def test_dot_segments_resolve_without_duplicating_windows_paths(self):
        root=Path.cwd()
        self.assertEqual(canonical_path(root/"tests/../lpr/../pyproject.toml"),root/"pyproject.toml")

    def test_image_limits_and_format(self):
        pipe=Pipeline(Mock(),Mock())
        for frame in (np.zeros((2,2),np.uint8),np.zeros((2,2,3),float),np.zeros((0,2,3),np.uint8)):
            with self.assertRaises(ValueError): pipe.analyze(frame)

    def test_ocr_rgb_conversion_and_weakest_nonpad_character(self):
        recognizer=FastPlateRecognizer.__new__(FastPlateRecognizer)
        recognizer.model=Mock()
        recognizer.model.config.image_color_mode="rgb"
        recognizer.model.run.return_value=[Mock(plate="34ABC123",char_probs=np.array([.99]*7+[.6,.2,.1]))]
        text,score=recognizer.recognize(np.array([[[1,2,3]]],dtype=np.uint8))
        self.assertEqual(text,"34ABC123")
        self.assertEqual(score,.6)
        np.testing.assert_array_equal(recognizer.model.run.call_args.args[0],[[[3,2,1]]])

    def test_recorded_video_eof_no_replay_and_media_consensus(self):
        with tempfile.TemporaryDirectory() as root:
            path=Path(root)/"fixture.avi"
            path.touch()
            cap=Mock()
            cap.get.return_value=10
            cap.isOpened.return_value=True
            cap.read.side_effect=[(True,np.zeros((10,10,3),np.uint8))]*4+[(False,None)]
            pipe=Mock()
            pipe.analyze.return_value=([{"text":"34ABC123","confidence":.99}],2.0)
            events=[]
            result=analyze_video(pipe,path,on_result=events.append,capture_factory=lambda _:cap)
            self.assertEqual(result["frames_read"],4)
            self.assertEqual([e["decision"]["status"] for e in events],["pending","pending","recognized","suppressed"])
            self.assertEqual(result["barrier_commands"],0)
            cap.release.assert_called_once()

    def test_unknown_fps_never_produces_consensus(self):
        with tempfile.TemporaryDirectory() as root:
            path=Path(root)/"fixture.avi"
            path.touch()
            cap=Mock()
            cap.get.return_value=float("nan")
            cap.isOpened.return_value=True
            cap.read.side_effect=[(True,np.zeros((10,10,3),np.uint8)),(False,None)]
            pipe=Mock()
            pipe.analyze.return_value=([{"text":"34ABC123","confidence":.99}],2.)
            events=[]
            analyze_video(pipe,path,on_result=events.append,capture_factory=lambda _:cap)
            self.assertIsNone(events[0]["decision"])
            self.assertEqual(events[0]["status"],"unknown_fps")

    def test_live_cannot_accept_evaluation_switch(self):
        with contextlib.redirect_stderr(io.StringIO()),self.assertRaises(SystemExit) as raised:
            main(["live","--models","x","--evaluation"])
        self.assertEqual(raised.exception.code,2)

    def test_error_output_does_not_leak_credentials(self):
        stream=io.StringIO()
        with patch("lpr.vision.build_pipeline",side_effect=RuntimeError("rtsp://user:SECRET@host")),contextlib.redirect_stdout(stream):
            result=main(["image","--models","x","photo.jpg"])
        self.assertEqual(result,2)
        self.assertNotIn("SECRET",stream.getvalue())
        self.assertIn("error",json.loads(stream.getvalue()))
