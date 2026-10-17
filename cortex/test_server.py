import importlib.util, os, pathlib, tempfile, threading, unittest, urllib.request, urllib.error, json
from unittest.mock import patch
import sys
sys.path.insert(0,str(pathlib.Path(__file__).parent))
TMP=tempfile.TemporaryDirectory(dir=pathlib.Path.cwd()/'work'); os.environ['CORTEX_DATA']=TMP.name; os.environ['CORTEX_PORT']='18765'
spec=importlib.util.spec_from_file_location('cortex',pathlib.Path(__file__).with_name('server.py')); s=importlib.util.module_from_spec(spec);spec.loader.exec_module(s)
class Tests(unittest.TestCase):
 def setUp(self):
  s.STATE['cameras']=[];s.STATE['rules']=[];s.STATE['events']=[];s.STATE['webhook']=''
 @classmethod
 def setUpClass(cls):
  cls.http=s.http.server.ThreadingHTTPServer(('127.0.0.1',18765),s.Handler); threading.Thread(target=cls.http.serve_forever,daemon=True).start()
 @classmethod
 def tearDownClass(cls): cls.http.shutdown();cls.http.server_close()
 def request(self,path,data=None,auth=True,origin=True):
  headers={'Cookie':'cortex='+s.TOKEN} if auth else {}
  if origin: headers['Origin']='http://127.0.0.1:18765'
  req=urllib.request.Request('http://127.0.0.1:18765'+path,None if data is None else json.dumps(data).encode(),headers)
  with urllib.request.urlopen(req) as r:return r.status,r.read()
 def test_no_auth(self):
  with self.assertRaises(urllib.error.HTTPError) as e:self.request('/api/state',auth=False)
  self.assertEqual(e.exception.code,401)
 def test_csrf(self):
  with self.assertRaises(urllib.error.HTTPError) as e:self.request('/api/cameras',{},origin=False)
  self.assertEqual(e.exception.code,403)
 def test_camera_and_rule_persistence(self):
  self.request('/api/cameras',{'name':'Asansör','url':'rtsp://192.0.2.2/stream','username':'test','password':'PRIVATE_TEST'})
  state=json.loads(self.request('/api/state')[1]); c=state['cameras'][0]
  self.assertNotIn('password',c);self.assertNotIn('url',c)
  self.assertNotIn(b'PRIVATE_TEST',(s.DATA/'config.enc').read_bytes())
  self.request('/api/rules',{'camera':c['id'],'name':'Çöp','prompt':'Nesne bırakıldı','threshold':.8,'cooldown':120})
  state=json.loads(self.request('/api/state')[1]);self.assertEqual(len(state['rules']),1)
  self.request('/api/rule-toggle',{'id':state['rules'][0]['id']})
  self.assertFalse(s.STATE['rules'][0]['enabled'])
 def test_accept_embedded_credentials(self):
  self.assertEqual(s.rtsp({'url':'rtsp://user:password@host/test'}),'rtsp://user:password@host/test')
 def test_inline_credentials_saved_privately(self):
  result=json.loads(self.request('/api/cameras',{'name':'Inline','url':'  rtsp://testuser:p%40ss%23word@192.0.2.8:554/stream1  '})[1])
  self.assertEqual(result['id'],s.STATE['cameras'][0]['id'])
  self.assertEqual(s.STATE['cameras'][0]['password'],'p@ss#word')
  self.assertEqual(s.STATE['cameras'][0]['url'],'rtsp://192.0.2.8:554/stream1')
  public=self.request('/api/state')[1]
  self.assertNotIn(b'testuser',public);self.assertNotIn(b'p%40ss',public)
  self.assertNotIn(b'p@ss#word',(s.DATA/'config.enc').read_bytes())
 def test_separate_credentials_override_embedded(self):
  self.assertEqual(s.rtsp({'url':'rtsp://old:old@host/test','username':'new','password':'a@b#c'}),'rtsp://new:a%40b%23c@host/test')
 def test_ipv6_and_query(self):
  c=s.normalize_camera({'name':'IPv6','url':'rtsp://user:pw@[::1]:554/cam?channel=1&subtype=0'})
  self.assertEqual(c['url'],'rtsp://[::1]:554/cam?channel=1&subtype=0')
 def test_errors_do_not_echo_credentials(self):
  secret=b'rtsp://test:SECRET@host/stream1'
  self.assertNotIn('SECRET',s.connection_error(b'Error opening '+secret+b': 401 Unauthorized'))
  self.assertIn('Kimlik',s.connection_error(b'401 Unauthorized'))
  self.assertNotIn('yayın yolu',s.connection_error(b'Option rw_timeout not found'))
 def test_lights_off_requires_bright_baseline(self):
  detector=s.LightTransition()
  self.assertFalse(any(detector.update(10) for _ in range(10)))
  self.assertFalse(detector.update(120))
  self.assertFalse(detector.update(20));self.assertFalse(detector.update(20))
  self.assertTrue(detector.update(20))
  self.assertFalse(any(detector.update(20) for _ in range(10)))
  for _ in range(3):self.assertFalse(detector.update(120))
  self.assertFalse(detector.update(20));self.assertFalse(detector.update(20))
  self.assertTrue(detector.update(20))
 def test_transient_shadow_does_not_trigger(self):
  detector=s.LightTransition();detector.update(120)
  self.assertFalse(detector.update(10));self.assertFalse(detector.update(10))
  self.assertFalse(detector.update(120));self.assertFalse(detector.update(10))
 def test_light_rule_validation_and_persistence(self):
  self.request('/api/cameras',{'name':'Light','url':'rtsp://192.0.2.1/stream1'})
  data={'camera':s.STATE['cameras'][0]['id'],'name':'Light off','prompt':'Dark transition','kind':'lights_off','threshold':.8,'cooldown':120,'dark':45,'drop':.45,'hold':3}
  self.request('/api/rules',data)
  self.assertEqual(s.STATE['rules'][0]['kind'],'lights_off')
  with self.assertRaises(urllib.error.HTTPError):self.request('/api/rules',{**data,'hold':0})
 def test_image_brightness_measurement(self):
  buf=s.io.BytesIO();s.Image.new('RGB',(80,60),(120,120,120)).save(buf,format='JPEG')
  self.assertAlmostEqual(s.brightness(buf.getvalue()),120,delta=2)
 def test_lights_detection_does_not_require_ollama(self):
  worker=s.Camera.__new__(s.Camera);worker.c={'id':'cam'};worker.stop=threading.Event();worker.frames=s.collections.deque(maxlen=6);worker.light_detectors={};worker.last={}
  s.STATE['rules']=[{'id':'light','camera':'cam','kind':'lights_off','enabled':True,'dark':45,'drop':.45,'hold':3,'cooldown':120}]
  with patch.object(s,'enqueue_evidence') as submit,patch.object(s,'analyze') as model:
   for level in [120,20,20,20,20,20]:
    buf=s.io.BytesIO();s.Image.new('RGB',(80,60),(level,level,level)).save(buf,format='JPEG');worker.frame=buf.getvalue();worker.frames.append(worker.frame);worker.check_lights()
   self.assertEqual(submit.call_count,1);model.assert_not_called()
 def test_real_rtsp_demuxer_authentication_error(self):
  import socketserver
  class RTSP(socketserver.BaseRequestHandler):
   def handle(self):
    self.request.settimeout(3)
    try:
     data=self.request.recv(4096)
     seq=next((line.split(b':',1)[1].strip() for line in data.split(b'\r\n') if line.lower().startswith(b'cseq:')),b'1')
     self.request.sendall(b'RTSP/1.0 401 Unauthorized\r\nCSeq: '+seq+b'\r\nContent-Length: 0\r\n\r\n')
    except OSError:pass
  server=socketserver.ThreadingTCPServer(('127.0.0.1',0),RTSP)
  threading.Thread(target=server.serve_forever,daemon=True).start()
  try:
   with self.assertRaises(s.InputError) as err:s.snapshot({'name':'test','url':f'rtsp://127.0.0.1:{server.server_address[1]}/stream1'})
   self.assertIn('Kimlik',str(err.exception))
  finally:server.shutdown();server.server_close()
 def test_invalid_protocol(self):
  with self.assertRaises(urllib.error.HTTPError):self.request('/api/cameras',{'name':'x','url':'file:///private'})
 def test_v1_rule_crud_and_camera_delete_keeps_history(self):
  self.request('/api/cameras',{'name':'Test','url':'rtsp://192.0.2.1/stream'})
  cid=s.STATE['cameras'][0]['id']
  data={'camera':cid,'name':'Motion','prompt':'Local movement','kind':'motion','threshold':.8,'cooldown':120,'x':20,'width':50,'start':'22:00','end':'06:00','days':[0,1,2,3,4]}
  self.request('/api/rules',data);rid=s.STATE['rules'][0]['id']
  self.request('/api/rules',{**data,'id':rid,'name':'Updated','sensitivity':20})
  self.assertEqual(len(s.STATE['rules']),1);self.assertEqual(s.STATE['rules'][0]['sensitivity'],20)
  self.assertEqual(s.STATE['rules'][0]['roi'],[20,0,50,100])
  self.request('/api/rule-delete',{'id':rid});self.assertEqual(s.STATE['rules'],[])
  self.request('/api/rules',data);s.STATE['events']=[{'id':'history'}]
  self.request('/api/camera-delete',{'id':cid})
  self.assertEqual(s.STATE['cameras'],[]);self.assertEqual(s.STATE['rules'],[]);self.assertEqual(s.STATE['events'],[{'id':'history'}])
 def test_v1_install_endpoints_and_public_progress(self):
  with patch.object(s.INSTALLER,'start',return_value=True) as start:
   code,body=self.request('/api/model-install',{});self.assertEqual(code,202);start.assert_called_once()
  with patch.object(s.INSTALLER,'cancel') as cancel:
   self.request('/api/model-cancel',{});cancel.assert_called_once()
  state=json.loads(self.request('/api/state')[1]);self.assertEqual(len(state['templates']),12);self.assertIn('phase',state['installer'])
 def test_invalid_rule(self):
  with self.assertRaises(urllib.error.HTTPError):self.request('/api/rules',{'camera':'missing','name':'x','prompt':'x','threshold':.8,'cooldown':120})
 def test_invalid_webhook(self):
  with self.assertRaises(urllib.error.HTTPError):self.request('/api/settings',{'model':'gemma3:4b','retention':7,'webhook':'http://host','replaceWebhook':True})
 def test_ffmpeg_real_clip(self):
  file=s.DATA/'synthetic.mp4'; result=s.run(['-f','lavfi','-i','testsrc=size=320x240:rate=5','-t','1','-pix_fmt','yuv420p',str(file)])
  self.assertEqual(result.returncode,0);self.assertGreater(file.stat().st_size,500)
 def test_model_response(self):
  class Response:
   def __enter__(self):return self
   def __exit__(self,*a):pass
   def read(self):return json.dumps({'message':{'content':json.dumps({'matched':True,'confidence':.9,'reason':'Test'})}}).encode()
  from unittest.mock import patch
  with patch('urllib.request.urlopen',return_value=Response()) as p:
   self.assertTrue(s.analyze({'prompt':'test'},[b'jpeg']*4,'test')['matched']);body=json.loads(p.call_args.args[0].data);self.assertEqual(len(body['messages'][0]['images']),4)
if __name__=='__main__':unittest.main()
