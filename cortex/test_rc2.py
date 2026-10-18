import io,json,time,threading,unittest
from unittest.mock import patch
from test_server import s
from test_v1 import frame,Response
from stream import Stream,JPEGParser
from models import Health,VISION_TEMPLATES
import models,local_rules

class RC2Tests(unittest.TestCase):
    def test_repair_exact_light_template_only(self):
        old={'kind':'vision','name':'Işık kapandı','prompt':'Önce aydınlık referans öğrenir; belirgin kararmayı doğrular.','duration':9}
        fixed=local_rules.repair_light_rule(old)
        self.assertEqual(fixed['kind'],'lights_off');self.assertEqual(fixed['duration'],2)
        self.assertEqual(local_rules.repair_light_rule({**old,'prompt':'Karanlıkta kedi varsa bildir'})['kind'],'vision')

    def test_light_fires_during_darkness_not_after_recovery(self):
        d=local_rules.Detector();r=local_rules.validate({'kind':'lights_off'})
        hits=[]
        for i in range(24):
            t=i/2;level=120 if t<2 or t>=7 else 10
            if d.update(r,frame(level),t):hits.append((t,level))
        self.assertEqual(hits,[(4,10)])

    def test_split_and_concatenated_jpeg_frames(self):
        p=JPEGParser();self.assertEqual(p.feed(b'junk\xff'),[])
        self.assertEqual(p.feed(b'\xd8abc\xff'),[])
        self.assertEqual(p.feed(b'\xd9\xff\xd8def\xff\xd9'),[b'\xff\xd8abc\xff\xd9',b'\xff\xd8def\xff\xd9'])

    def test_continuous_ffmpeg_light_alarm_end_to_end(self):
        r={'id':'light-e2e','camera':'synthetic','name':'Işık kapandı','prompt':'light','enabled':True,'cooldown':30,**local_rules.validate({'kind':'lights_off'})}
        previous=s.STATE['rules'];s.STATE['rules']=[r];hits=[]
        def factory(*args,**kwargs):
            return Stream(s.FFMPEG,'',source_args=['-re','-f','lavfi','-i',"color=c=white:s=320x240:r=10,drawbox=color=black:t=fill:enable='between(t,2,6)'",'-t','9'])
        started=time.monotonic()
        try:
            with patch.object(s,'Stream',side_effect=factory),patch.object(s,'enqueue_evidence',side_effect=lambda w,*_:hits.append((time.monotonic()-started,w.brightness))):
                w=s.Camera({'id':'synthetic','name':'Synthetic','url':'rtsp://192.0.2.1/test'})
                try:
                    end=time.monotonic()+8.5
                    while time.monotonic()<end:time.sleep(.1)
                finally:w.stop.set();w.thread.join(4)
            self.assertEqual(len(hits),1);self.assertLess(hits[0][1],45);self.assertLess(hits[0][0],6.5)
        finally:s.STATE['rules']=previous

    def test_model_health_connected_survives_new_monitor(self):
        for _ in range(2):
            h=Health()
            with patch.object(models,'request',side_effect=[Response({'models':[{'name':'gemma3:4b'}]}),Response({'capabilities':['vision']})]):h.probe('gemma3:4b')
            self.assertEqual(h.status('gemma3:4b')['phase'],'connected')

    def test_model_health_missing_unsupported_offline(self):
        for responses,phase in [([Response({'models':[]})],'missing'),([Response({'models':[{'name':'gemma3:4b'}]}),Response({'capabilities':['completion']})],'unsupported'),([OSError()],'offline')]:
            h=Health()
            with patch.object(models,'request',side_effect=responses):h.probe('gemma3:4b')
            self.assertEqual(h.status('gemma3:4b')['phase'],phase)

    def test_batch_checks_all_rules_in_one_model_call(self):
        rs=[{'id':str(i),'prompt':t['prompt']} for i,t in enumerate(VISION_TEMPLATES[:3])]
        data={'message':{'content':json.dumps({'results':[{'i':i,'hit':False,'score':.9} for i in range(len(rs))]})}}
        with patch.object(s.urllib.request,'urlopen',return_value=Response(data)) as call:
            result=s.analyze_batch(rs,[frame()]*3,'gemma3:4b')
            self.assertEqual(len(result),3);self.assertEqual(call.call_count,1)
            body=json.loads(call.call_args.args[0].data);self.assertEqual(body['keep_alive'],'10m')

    def test_batch_rejects_missing_duplicate_or_bad_results(self):
        for values in [[],[{'id':'a','matched':'yes','confidence':.8,'reason':'x'}],[{'id':'wrong','matched':True,'confidence':.8,'reason':'x'}]]:
            with patch.object(s.urllib.request,'urlopen',return_value=Response({'message':{'content':json.dumps({'results':values})}})):
                with self.assertRaises(ValueError):s.analyze_batch([{'id':'a','prompt':'cat'}],[frame()],'test')

    def test_stale_model_result_cannot_emit_alarm(self):
        r={'id':'r','camera':'cam','name':'test','prompt':'cat','kind':'vision','enabled':True,'cooldown':30,'threshold':.8}
        prior=s.STATE['rules'];s.STATE['rules']=[r]
        w=s.Camera.__new__(s.Camera);w.c={'id':'cam'};w.stop=threading.Event();w.last={};w.ai_cursor=0;w.frame=frame();w.frames=s.collections.deque([w.frame]*3);w.received=time.monotonic();w.observed_at=time.time()-20
        s.AI_SLOTS.acquire()
        try:
            with patch.object(s,'analyze_batch',return_value={'r':{'matched':True,'confidence':.99,'reason':'old'}}),patch.object(w,'event') as event:
                w.evaluate();event.assert_not_called();self.assertIn('eski sonuç',w.analysis)
        finally:s.STATE['rules']=prior

    def test_model_cannot_invent_motion_on_identical_frames(self):
        data={'message':{'content':json.dumps({'results':[{'i':0,'hit':True,'score':.99}]})}}
        with patch.object(s.urllib.request,'urlopen',return_value=Response(data)):
            result=s.analyze_batch([{'id':'leaf','visionTemplate':'leaves','prompt':'moving leaves'}],[frame()]*3,'test')
        self.assertFalse(result['leaf']['matched'])

if __name__=='__main__':unittest.main()
