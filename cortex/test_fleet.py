import datetime as dt
import json
import unittest
from unittest.mock import patch,MagicMock
import xml.etree.ElementTree as ET
import access
import fleet
from onvif import MediaProfile, DEVICE, SCHEMA, OnvifError
import test_server as base

class FleetTests(unittest.TestCase):
    def test_invalid_settings(self):
        for data in ({},{'host':'127.0.0.1','name':'a','username':'a','interval':0},
                     {'host':'http://evil','name':'a','username':'a'}):
            with self.assertRaises(ValueError):fleet.settings(data)

    def test_profiles_grouped_by_source_small_stream_preferred(self):
        c=MagicMock();c.profiles.return_value=[MediaProfile('a','main','H264',1920,1080,'1'),MediaProfile('b','sub','H264',640,360,'1'),MediaProfile('c','other','H264',640,360,'2')]
        c.stream_uri.side_effect=lambda p:'rtsp://host/'+p.token
        with patch.object(fleet,'client',return_value=c):result=fleet.discover({})
        self.assertEqual([r['token'] for r in result],['b','c'])

    def test_failed_channel_does_not_remove_other_channels(self):
        c=MagicMock();c.profiles.return_value=[MediaProfile('a','A','H264',640,360,'1'),MediaProfile('b','B','H264',640,360,'2')]
        c.stream_uri.side_effect=[OnvifError('fail'),'rtsp://host/b']
        with patch.object(fleet,'client',return_value=c):result=fleet.discover({})
        self.assertTrue(result[0]['error']);self.assertFalse(result[1]['error'])

    def test_clock_readback_and_timezone_preserved(self):
        previous=ET.Element('value')
        ET.SubElement(previous,'{'+SCHEMA+'}DaylightSavings').text='false'
        ET.SubElement(ET.SubElement(previous,'{'+SCHEMA+'}TimeZone'),'{'+SCHEMA+'}TZ').text='TRT-3'
        c=MagicMock()
        with patch.object(fleet,'client',return_value=c),patch.object(fleet.time,'time',return_value=1000),patch.object(fleet,'read_clock',side_effect=[(900,previous),(1000,previous)]):
            result=fleet.synchronize({})
        op=c._request.call_args.args[-1]
        self.assertEqual(op.findtext('{'+DEVICE+'}TimeZone/{'+SCHEMA+'}TZ'),'TRT-3')
        self.assertEqual(result['phase'],'ok')

    def test_clock_failed_verification_is_not_success(self):
        with patch.object(fleet,'client',return_value=MagicMock()),patch.object(fleet.time,'time',return_value=1000),patch.object(fleet,'read_clock',return_value=(900,ET.Element('value'))):
            with self.assertRaises(ValueError):fleet.synchronize({})

class CrossingTests(unittest.TestCase):
    def test_entry_and_reverse_crossings(self):
        t=access.Tracker();r={'axis':'y','line':50,'margin':5}
        outputs=[t.update([(50,y)],r,i*.2) for i,y in enumerate([30,40,50,60,65,55,45,35])]
        self.assertEqual([v for batch in outputs for v in batch],['positive','negative'])

    def test_disappearance_never_bridges_crossing(self):
        t=access.Tracker();r={}
        t.update([(50,30)],r,0);t.update([(50,40)],r,.2)
        self.assertEqual(t.update([(50,60)],r,3),[])

    def test_roi_and_jitter(self):
        t=access.Tracker();r={'roi':[20,20,60,60]}
        self.assertEqual(t.update([(0,0)],r,0),[]);self.assertFalse(t.tracks)
        for i,y in enumerate([49,51,48,52]*3):self.assertEqual(t.update([(50,y)],r,i*.1),[])

    def test_one_permission_cannot_allow_two_people(self):
        p=access.Permits()
        with patch.object(access.time,'monotonic',return_value=10):p.grant('camera')
        self.assertFalse(p.consume('another',11));self.assertTrue(p.consume('camera',11));self.assertFalse(p.consume('camera',11))

    def test_permission_expires(self):
        p=access.Permits()
        with patch.object(access.time,'monotonic',return_value=10):p.grant('camera')
        self.assertFalse(p.consume('camera',26))

class FleetApiTests(unittest.TestCase):
    request=base.Tests.request
    @classmethod
    def setUpClass(cls):
        cls.http=base.s.http.server.ThreadingHTTPServer(('127.0.0.1',18765),base.s.Handler)
        base.threading.Thread(target=cls.http.serve_forever,daemon=True).start()
    @classmethod
    def tearDownClass(cls):cls.http.shutdown();cls.http.server_close()
    def setUp(self):
        base.s.STATE.update(cameras=[],rules=[],devices=[],events=[],webhook='');base.s.DISCOVERIES.clear()
    def test_recorder_import_redacts_credentials_and_deduplicates(self):
        config={'host':'192.0.2.1','name':'NVR','username':'admin','password':'SECRET','sync':True}
        channels=[{'token':'1','name':'Channel 1','url':'rtsp://admin:SECRET@192.0.2.1/channel1','error':''}]
        with patch.object(fleet,'discover',return_value=channels):
            result=json.loads(self.request('/api/recorder-discover',config)[1])
            self.assertNotIn('SECRET',json.dumps(result))
            result=json.loads(self.request('/api/recorder-import',{'token':result['token'],'channels':['1']})[1])
            self.assertEqual(result['added'],1)
            found=json.loads(self.request('/api/recorder-discover',config)[1])
            result=json.loads(self.request('/api/recorder-import',{'token':found['token'],'channels':['1']})[1])
            self.assertEqual(result['duplicates'],1)
        self.assertNotIn(b'SECRET',self.request('/api/state')[1])
        self.assertEqual(len(base.s.STATE['devices']),1)
    def test_new_rule_fields_persist(self):
        cid=json.loads(self.request('/api/cameras',{'name':'Gate','url':'rtsp://host/live'})[1])['id']
        self.request('/api/rules',dict(camera=cid,name='Gate',prompt='Gate',kind='access_unpermitted',threshold=.8,cooldown=30,axis='x',direction='negative',line=45,margin=10))
        rule=base.s.STATE['rules'][0]
        self.assertEqual((rule['kind'],rule['axis'],rule['line']),('access_unpermitted','x',45))
        self.request('/api/access-permit',{'id':cid})
        self.assertTrue(access.PERMITS.consume(cid,access.time.monotonic()))

if __name__=='__main__':unittest.main()
