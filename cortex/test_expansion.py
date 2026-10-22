"""Regression coverage for spatial cache and reference-dependent rule transitions."""
import io
import unittest
from unittest.mock import patch
from PIL import Image
import local_rules as r

def frame(value):
    buffer=io.BytesIO();Image.new('RGB',(320,240),(value,value,value)).save(buffer,format='JPEG')
    return buffer.getvalue()

class ExpansionTests(unittest.TestCase):
    def test_cache_decodes_once_and_preserves_rule_results(self):
        rules=[{**t,'roi':[0,0,100,100],'duration':1} for t in r.TEMPLATES]
        cached=[r.Detector() for _ in rules]; plain=[r.Detector() for _ in rules]
        for now,value in enumerate([120,120,0,0,0,255,255,120,120,120]):
            data=frame(value)
            with patch.object(r.Image,'open',wraps=Image.open) as opened:
                prepared=r.FrameSamples(data)
                answers=[d.update(rule,data,now,prepared) for d,rule in zip(cached,rules)]
                self.assertEqual(opened.call_count,1)
            self.assertEqual(answers,[d.update(rule,data,now) for d,rule in zip(plain,rules)])
            self.assertEqual([d.metrics for d in cached],[d.metrics for d in plain])

    def test_restoration_requires_prior_departure(self):
        d=r.Detector();rule={'kind':'scene_restored','duration':1,'sensitivity':10}
        self.assertEqual([d.update(rule,frame(120),t) for t in range(5)],[False]*5)
        self.assertFalse(d.update(rule,frame(0),5))
        self.assertFalse(d.update(rule,frame(120),6))
        self.assertTrue(d.update(rule,frame(120),7))
        self.assertFalse(d.update(rule,frame(120),8))

    def test_stopped_motion_requires_observation(self):
        d=r.Detector();rule={'kind':'motion_stopped','duration':1,'sensitivity':3}
        self.assertFalse(d.update(rule,frame(120),0))
        self.assertFalse(d.update(rule,frame(120),1))
        self.assertFalse(d.update(rule,frame(220),2))
        self.assertFalse(d.update(rule,frame(220),3))
        self.assertTrue(d.update(rule,frame(220),4))
        # Missing frames must erase the temporal evidence.
        self.assertFalse(d.update(rule,None,5))
        self.assertFalse(d.update(rule,frame(220),6))
        self.assertFalse(d.update(rule,frame(220),8))

    def test_pixel_coverage_and_contrast(self):
        for kind,color in [('black_pixels',0),('white_pixels',255),('low_contrast',120)]:
            d=r.Detector();rule={'kind':kind,'duration':1,'sensitivity':10 if kind=='low_contrast' else 85}
            self.assertFalse(d.update(rule,frame(color),0))
            self.assertFalse(d.update(rule,frame(color),1))
            self.assertTrue(d.update(rule,frame(color),2))

    def test_cache_isolated_by_region_and_frame(self):
        a=r.FrameSamples(frame(10));b=r.FrameSamples(frame(220))
        left=a.get([0,0,50,100]);right=a.get([50,0,50,100])
        self.assertIs(a.get([0,0,50,100]),left)
        self.assertIsNot(left,right)
        self.assertNotEqual(left[1],b.get([0,0,50,100])[1])

if __name__=='__main__':unittest.main()
