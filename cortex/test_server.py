import importlib.util, os, pathlib, tempfile, threading, unittest, urllib.request, urllib.error, json
TMP=tempfile.TemporaryDirectory(dir=pathlib.Path.cwd()/'work'); os.environ['CORTEX_DATA']=TMP.name; os.environ['CORTEX_PORT']='18765'
spec=importlib.util.spec_from_file_location('cortex',pathlib.Path(__file__).with_name('server.py')); s=importlib.util.module_from_spec(spec);spec.loader.exec_module(s)
class Tests(unittest.TestCase):
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
 def test_reject_embedded_credentials(self):
  with self.assertRaises(ValueError):s.rtsp({'url':'rtsp://user:password@host/test'})
 def test_invalid_protocol(self):
  with self.assertRaises(urllib.error.HTTPError):self.request('/api/cameras',{'name':'x','url':'file:///private'})
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
