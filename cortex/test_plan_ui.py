import json
import unittest
import urllib.error
import test_server as base


class PlanTests(unittest.TestCase):
    setUp = base.Tests.setUp
    setUpClass = classmethod(base.Tests.setUpClass.__func__)
    tearDownClass = classmethod(base.Tests.tearDownClass.__func__)
    request = base.Tests.request
    def test_retention_respects_each_plan(self):
        for tier, days in [('PRO',7),('PLUS',15),('ULTRA',30)]:
            base.s.STATE['license']={'plan':tier,'valid':True,'status':'active'}
            self.request('/api/settings',{'retention':days,'model':'gemma3:4b'})
            self.assertEqual(base.s.STATE['retention'],days)
            if days < 30:
                with self.assertRaises(urllib.error.HTTPError) as error:
                    self.request('/api/settings',{'retention':days+1,'model':'gemma3:4b'})
                self.assertEqual(error.exception.code,400)
                self.assertEqual(base.s.STATE['retention'],days)

    def test_public_plan_uses_catalog_and_hides_full_key(self):
        base.s.STATE['license']={'plan':'PRO','maxCameras':999,'maxRules':999,'fullKey':'DO_NOT_EXPOSE'}
        result=json.loads(self.request('/api/state')[1])
        self.assertEqual(result['license']['maxCameras'],4)
        self.assertEqual(result['license']['maxRules'],8)
        self.assertNotIn('fullKey',result['license'])

    def test_new_assets_require_session(self):
        for path in ['/plans.js','/refinements.css']:
            self.assertEqual(self.request(path)[0],200)
            with self.assertRaises(urllib.error.HTTPError) as error:
                self.request(path,auth=False)
            self.assertEqual(error.exception.code,401)
