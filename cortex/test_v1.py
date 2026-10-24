import datetime as dt
import io
import json
import threading
import unittest
from unittest.mock import patch
import local_rules as rules
import models
from PIL import Image, ImageDraw
from test_server import s

def frame(level=120, box=None):
    img=Image.new('RGB',(96,72),(level,level,level))
    if box: ImageDraw.Draw(img).rectangle(box,fill='white')
    out=io.BytesIO();img.save(out,format='PNG');return out.getvalue()

def rule(kind, **kw):
    return rules.validate({'kind':kind,**kw})

class DetectorTests(unittest.TestCase):
    def test_all_templates_validate(self):
        self.assertEqual(len(rules.TEMPLATES),22)
        for t in rules.TEMPLATES: self.assertEqual(rule(t['kind'])['kind'],t['kind'])

    def test_invalid_regions_times_and_nan(self):
        for args in [{'x':90,'width':20},{'width':0},{'duration':'nan'},{'sensitivity':'inf'},{'days':''},{'days':[7]},{'start':'25:00'}]:
            with self.assertRaises(ValueError):rule('motion',**args)

    def test_overnight_and_day_boundaries(self):
        r=rule('motion',start='22:00',end='06:00',days='0')
        self.assertTrue(rules.scheduled(r,dt.datetime(2026,10,19,23)))
        self.assertTrue(rules.scheduled(r,dt.datetime(2026,10,20,5)))
        self.assertFalse(rules.scheduled(r,dt.datetime(2026,10,20,6)))
        self.assertFalse(rules.scheduled(r,dt.datetime(2026,10,20,23)))

    def test_light_transition_and_rearm(self):
        d=rules.Detector();r=rule('lights_off',duration=6)
        self.assertFalse(d.update(r,frame(20),0))
        self.assertFalse(d.update(r,frame(20),10))
        d.update(r,frame(120),12)
        self.assertFalse(d.update(r,frame(20),15))
        self.assertTrue(d.update(r,frame(20),21))
        self.assertFalse(d.update(r,frame(20),24))
        d.update(r,frame(120),27);d.update(r,frame(120),33)
        d.update(r,frame(20),36);self.assertTrue(d.update(r,frame(20),42))

    def test_lights_on_requires_dark_reference(self):
        r=rule('lights_on',duration=3);d=rules.Detector()
        d.update(r,frame(140),0);self.assertFalse(d.update(r,frame(140),3))
        d.update(r,frame(20),6);d.update(r,frame(140),9)
        self.assertTrue(d.update(r,frame(140),12))

    def test_absolute_darkness_and_overexposure(self):
        for kind,level in [('darkness',10),('overexposure',250)]:
            d=rules.Detector();r=rule(kind,duration=6)
            d.update(r,frame(level),0);self.assertFalse(d.update(r,frame(level),3));self.assertTrue(d.update(r,frame(level),6))

    def test_transient_change_and_missing_frame_reset_duration(self):
        d=rules.Detector();r=rule('darkness',duration=6)
        d.update(r,frame(10),0);d.update(r,frame(120),3);self.assertFalse(d.update(r,frame(10),6))
        d.update(r,None,9);self.assertFalse(d.update(r,frame(10),12));self.assertFalse(d.update(r,frame(10),15))

    def test_sampling_gap_not_counted(self):
        d=rules.Detector();r=rule('darkness',duration=60)
        d.update(r,frame(10),0);self.assertFalse(d.update(r,frame(10),90))

    def test_motion_and_roi_exclusion(self):
        r=rule('motion',duration=3,sensitivity=5);d=rules.Detector()
        d.update(r,frame(10),0);d.update(r,frame(10,(0,0,40,70)),3)
        self.assertTrue(d.update(r,frame(10),6))
        r=rule('motion',duration=3,sensitivity=5,x=60,width=40);d=rules.Detector()
        for t in range(0,15,3):self.assertFalse(d.update(r,frame(10,(0,0,40,70)) if t%2 else frame(10),t))

    def test_inactivity_sustained_motion_and_freeze(self):
        for kind in ['inactivity','frozen']:
            r=rule(kind,duration=6);d=rules.Detector();d.update(r,frame(),0);d.update(r,frame(),3)
            self.assertFalse(d.update(r,frame(),6));self.assertTrue(d.update(r,frame(),9))
        r=rule('sustained_motion',duration=6);d=rules.Detector();d.update(r,frame(0),0)
        d.update(r,frame(255),3);d.update(r,frame(0),6);self.assertTrue(d.update(r,frame(255),9))

    def test_scene_change_persists_against_reference(self):
        r=rule('scene_change',duration=6);d=rules.Detector();d.update(r,frame(30),0)
        d.update(r,frame(150),3);d.update(r,frame(150),6);self.assertTrue(d.update(r,frame(150),9))

    def test_low_detail_loss(self):
        img=Image.new('RGB',(96,72),'black');draw=ImageDraw.Draw(img)
        for x in range(0,96,4): draw.line((x,0,x,71),fill='white')
        out=io.BytesIO();img.save(out,format='PNG')
        r=rule('low_detail',duration=3);d=rules.Detector();d.update(r,out.getvalue(),0)
        d.update(r,frame(),3);self.assertTrue(d.update(r,frame(),6))

    def test_offline_once_and_online_after_confirmed_outage(self):
        for kind in ('offline','online'):
            r=rule(kind,duration=6 if kind=='online' else 30);d=rules.Detector()
            self.assertFalse(d.update(r,frame(),0));self.assertFalse(d.update(r,None,3))
            self.assertFalse(d.update(r,None,18))
            self.assertEqual(d.update(r,None,33),kind=='offline')
            self.assertFalse(d.update(r,None,36));self.assertFalse(d.update(r,frame(),39))
            self.assertEqual(d.update(r,frame(),45),kind=='online')
            self.assertFalse(d.update(r,frame(),48))

class Response(io.BytesIO):
    def __init__(self,data):super().__init__(json.dumps(data).encode())

class ModelTests(unittest.TestCase):
    def execute(self,responses):
        ready=[];installer=models.Installer(ready.append)
        with patch.object(models,'request',side_effect=responses): installer.run()
        return installer,ready

    def test_installed_model_requires_real_vision_response(self):
        installer,ready=self.execute([Response({'models':[{'name':models.MODEL}]}),Response({'capabilities':['vision']}),Response({'done':True,'message':{'content':'white image'}})])
        self.assertEqual(installer.status()['phase'],'ready');self.assertEqual(ready,[models.MODEL])

    def test_stream_pull_then_verify(self):
        stream=io.BytesIO(b'{"status":"pulling","total":100,"completed":50}\n{"status":"success"}\n')
        installer,ready=self.execute([Response({'models':[]}),stream,Response({'capabilities':['vision']}),Response({'done':True,'message':{'content':'image'}})])
        self.assertEqual(installer.status()['phase'],'ready');self.assertEqual(ready,[models.MODEL])

    def test_unavailable_incomplete_stream_and_missing_vision(self):
        cases=[[OSError('private error')],[Response({'models':[]}),io.BytesIO(b'{"status":"pulling"}\n')],[Response({'models':[{'name':models.MODEL}]}),Response({'capabilities':['completion']})]]
        for responses in cases:
            installer,ready=self.execute(responses)
            self.assertEqual(installer.status()['phase'],'error');self.assertEqual(ready,[])
            self.assertNotIn('private error',installer.status()['message'])

    def test_cancel_never_activates_model(self):
        installer=models.Installer(lambda _:self.fail('Cancelled model activated'))
        installer.cancelled.set()
        with patch.object(models,'request',return_value=Response({'models':[]})):installer.run()
        self.assertEqual(installer.status()['phase'],'cancelled')

    def test_only_one_install_thread(self):
        gate=threading.Event();installer=models.Installer(lambda _:None)
        with patch.object(installer,'run',side_effect=lambda:gate.wait(2)):
            self.assertTrue(installer.start());self.assertFalse(installer.start());gate.set();installer.thread.join(2)

class EventTests(unittest.TestCase):
    def setUp(self):
        s.STATE['events']=[];s.STATE['webhook']='';s.STATE['rules']=[]

    def worker(self):
        w=s.Camera.__new__(s.Camera);w.stop=threading.Event();w.c={'id':'test','name':'Synthetic camera'};w.frame=None
        return w

    def test_record_failure_preserves_event_and_notification(self):
        w=self.worker();r={'id':'r','name':'Dark','kind':'darkness','enabled':True};s.STATE['rules']=[r]
        with patch.object(s.EVIDENCE_POOL,'submit') as submit:
            w.event(r,{'reason':'synthetic','confidence':1},[frame()])
            self.assertEqual(len(s.STATE['events']),1);self.assertEqual(s.STATE['events'][0]['recording'],'pending')
            with patch.object(s,'run',side_effect=TimeoutError()): submit.call_args.args[0](*submit.call_args.args[1:])
        self.assertTrue(s.STATE['events'][0]['snapshot']);self.assertFalse(s.STATE['events'][0]['clip'])

    def test_paused_rule_cannot_emit_stale_ai_result(self):
        w=self.worker();r={'id':'r','name':'AI','enabled':False};s.STATE['rules']=[r]
        w.event(r,{'reason':'test','confidence':1},[]);self.assertEqual(s.STATE['events'],[])

    def test_persisted_webhook_retries_and_idempotency(self):
        previous_telegram = s.STATE.get('telegram', {})
        s.STATE['telegram'] = {'enabled': False}
        self.addCleanup(lambda: s.STATE.update(telegram=previous_telegram))
        s.STATE['webhook']='https://example.invalid/hook'
        e={'id':'event-test','camera':'test','rule':'test','time':0,'reason':'test','confidence':1,'kind':'offline','attempts':0,'retryAt':0,'notification':'Panel'}
        s.STATE['events']=[e]
        with patch.object(s.urllib.request,'urlopen',side_effect=OSError()) as send:
            for _ in range(3):e['retryAt']=0;s.deliver_notifications()
            e['retryAt']=0;s.deliver_notifications()
            self.assertEqual(send.call_count,3);self.assertEqual(e['attempts'],3)
            self.assertEqual(send.call_args.args[0].get_header('Idempotency-key'),'event-test')
        s.STATE['webhook']=''

if __name__=='__main__':unittest.main()
