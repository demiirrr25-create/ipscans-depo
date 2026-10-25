import io
import time
import unittest
from unittest.mock import patch
from PIL import Image
import imageio_ffmpeg
import models
import intelligence
import iot_automation
from stream import Stream
import test_server as base


class PremiumTests(unittest.TestCase):
    def test_boot_does_not_authenticate_browser_or_cross_tenants(self):
        s=base.s
        tenant=s.get_active_tenant_id()
        with patch.dict(s.STATE,{'license':{'valid':True,'status':'active','customerId':tenant},'customers':[{'id':tenant,'status':'active'}]}), patch.dict(s.ACTIVE_USER,{'authenticated':False,'user':None}):
            self.assertTrue(s.background_workspace_authorized())
            self.assertFalse(s.ACTIVE_USER['authenticated'])
            s.STATE['customers'][0]['status']='suspended'
            self.assertFalse(s.background_workspace_authorized())
            s.STATE['customers'][0]['status']='active'
            s.STATE['license']['customerId']='another-tenant'
            self.assertFalse(s.background_workspace_authorized())

    def test_sector_catalog_unique_and_usable(self):
        self.assertEqual(len(models.VISION_TEMPLATES),66)
        self.assertEqual(len({t['id'] for t in models.VISION_TEMPLATES}),66)
        for category in ('Fabrika','Otel','Sosyal tesis','Müstakil ev'):
            self.assertEqual(sum(t['category']==category for t in models.VISION_TEMPLATES),6)
        for p in intelligence.SECTOR_PACKS:
            for r in p['rules']:
                x,y,w,h=r['roi']
                self.assertTrue(0<=x<x+w<=100 and 0<=y<y+h<=100)

    def test_telegram_menu_labels_preserve_command_behavior(self):
        snapshot={'cameras':[],'rules':[],'events':[]}
        for label,command in iot_automation.COMMAND_LABELS.items():
            self.assertEqual(iot_automation.process_bot_command(label,snapshot)['command'],command)

    def test_live_decoder_keeps_latest_frames_without_consumer(self):
        stream=Stream(imageio_ffmpeg.get_ffmpeg_exe(),'synthetic',source_args=[
            '-re','-f','lavfi','-i','testsrc2=size=320x180:rate=15'])
        try:
            deadline=time.monotonic()+6
            while stream.get()[1]<2 and time.monotonic()<deadline:time.sleep(.05)
            first=stream.get()[1]
            time.sleep(1.2)
            data,sequence,received=stream.get()
            self.assertGreaterEqual(sequence-first,6)
            self.assertLess(time.monotonic()-received,.5)
            self.assertEqual(Image.open(io.BytesIO(data)).width,960)
        finally:stream.close()
        self.assertFalse(stream.thread.is_alive())

    def test_slow_analysis_does_not_stall_capture(self):
        s=base.s
        data=io.BytesIO();Image.new('RGB',(100,100),'blue').save(data,'JPEG')
        class FakeStream:
            def __init__(self,*a,**k):self.process=self;self.started=time.monotonic()
            def get(self):return data.getvalue(),int((time.monotonic()-self.started)*8)+1,time.monotonic()
            def poll(self):return None
            def close(self):pass
        with patch.object(s,'Stream',FakeStream),patch.object(s.Camera,'check_lights',lambda _:time.sleep(1.5)),patch.object(s.Camera,'check_pro'),patch.object(s.Camera,'check_access'),patch.object(s.Camera,'check_local'):
            camera=s.Camera({'id':'test','url':'rtsp://example.test/live'})
            try:
                time.sleep(.7);sequence=camera.sequence
                time.sleep(.7)
                self.assertGreaterEqual(camera.sequence-sequence,4)
                self.assertLessEqual(len(camera.frames),4)
                self.assertEqual(camera.status,'Bağlı')
            finally:
                camera.stop.set();camera.thread.join(3);camera.analysis_thread.join(3)


class PremiumApiTests(base.Tests):
    def test_premium_assets_are_served(self):
        self.assertEqual(self.request('/premium.css')[0],200)
        html=self.request('/')[1].decode()
        self.assertNotIn('id="cortexStartupStage"',html)
        self.assertNotIn('id="cortex3DExplorerSection"',html)
        self.assertIn('ipscans.com projesi',html)

    def test_hotel_and_home_templates_can_be_deployed(self):
        import json
        cid=json.loads(self.request('/api/cameras',{'name':'Test','url':'rtsp://192.0.2.9/live'})[1])['id']
        for pack in ('hotel','home'):
            response=json.loads(self.request('/api/sector-apply',{'camera':cid,'pack':pack})[1])
            self.assertEqual(response['added'],6)
