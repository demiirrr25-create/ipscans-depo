"""Comprehensive test suite for IPScans Cortex 2.0 Pro multi-technology modules."""
import io
import json
import unittest
import zipfile
from unittest.mock import MagicMock, patch
from PIL import Image
import forensics
import intelligence
import iot_automation
import test_server as base


class IntelligenceProTests(unittest.TestCase):
    def test_privacy_masks_solid_and_blur(self):
        img = Image.new('RGB', (200, 100), (240, 240, 240))
        buf = io.BytesIO()
        img.save(buf, format='JPEG')
        raw = buf.getvalue()

        masks = intelligence.validate_privacy_masks([
            {'x': 0, 'y': 0, 'width': 50, 'height': 50, 'mode': 'solid'},
            {'x': 50, 'y': 0, 'width': 50, 'height': 50, 'mode': 'blur'},
        ])
        self.assertEqual(len(masks), 2)
        masked = intelligence.apply_privacy_masks(raw, masks)
        with Image.open(io.BytesIO(masked)) as out:
            r, g, b = out.getpixel((10, 10))
            self.assertLess(r, 30)
            self.assertLess(g, 30)
            self.assertLess(b, 30)

        with self.assertRaises(ValueError):
            intelligence.validate_privacy_masks([{'x': 90, 'y': 0, 'width': 30, 'height': 20}])

    def test_spatial_heatmap_accumulates_and_renders_png(self):
        hm = intelligence.HeatmapAccumulator()
        f1 = io.BytesIO(); Image.new('RGB', (160, 90), (20, 20, 20)).save(f1, format='JPEG')
        f2 = io.BytesIO(); Image.new('RGB', (160, 90), (220, 220, 220)).save(f2, format='JPEG')
        hm.update(f1.getvalue(), [(50, 50)])
        hm.update(f2.getvalue(), [(50, 50)])
        snap = hm.snapshot_matrix()
        self.assertEqual(snap['samples'], 2)
        self.assertGreater(snap['peak'], 0)
        png = hm.render_png(320, 180)
        self.assertTrue(png.startswith(b'\x89PNG'))

    def test_loitering_occupancy_perimeter_and_tailgating_tracker(self):
        pt = intelligence.ProTracker()
        rule_loiter = {'name': 'Loiter', 'roi': [0, 0, 100, 100], 'duration': 5, 'sensitivity': 1}
        self.assertFalse(pt.evaluate_loitering([(50, 50)], rule_loiter, 0.0)[0])
        self.assertFalse(pt.evaluate_loitering([(50, 51)], rule_loiter, 2.0)[0])
        self.assertFalse(pt.evaluate_loitering([(50, 50)], rule_loiter, 4.0)[0])
        hit, res = pt.evaluate_loitering([(50, 50)], rule_loiter, 5.5)
        self.assertTrue(hit)
        self.assertIn('bekliyor', res['reason'])
        # Same loitering track does not re-fire continuously
        self.assertFalse(pt.evaluate_loitering([(50, 50)], rule_loiter, 6.0)[0])

        # Occupancy / Crowd limit
        pt_occ = intelligence.ProTracker()
        rule_occ = {'name': 'Kapasite', 'roi': [0, 0, 100, 100], 'duration': 3, 'sensitivity': 2}
        self.assertFalse(pt_occ.evaluate_occupancy([(20, 20), (80, 80)], rule_occ, 0.0)[0])
        hit_occ, res_occ = pt_occ.evaluate_occupancy([(20, 20), (80, 80)], rule_occ, 3.5)
        self.assertTrue(hit_occ)
        self.assertIn('kapasite', res_occ['reason'])

        # Perimeter intrusion
        pt_per = intelligence.ProTracker()
        rule_per = {'name': 'Yasak Bölge', 'roi': [10, 10, 80, 80], 'duration': 2, 'sensitivity': 1}
        self.assertFalse(pt_per.evaluate_perimeter([(50, 50)], rule_per, 0.0)[0])
        self.assertFalse(pt_per.evaluate_perimeter([(50, 50)], rule_per, 1.0)[0])
        hit_per, res_per = pt_per.evaluate_perimeter([(50, 50)], rule_per, 2.5)
        self.assertTrue(hit_per)
        self.assertIn('sınır bölgesinde', res_per['reason'])

        # Tailgating
        pt_tg = intelligence.ProTracker()
        rule_tg = {'name': 'Tailgating', 'direction': 'positive', 'sensitivity': 4}
        self.assertFalse(pt_tg.evaluate_tailgating(['positive'], rule_tg, 10.0)[0])
        hit_tg, res_tg = pt_tg.evaluate_tailgating(['positive'], rule_tg, 11.5)
        self.assertTrue(hit_tg)
        self.assertIn('Tailgating', res_tg['reason'])

    def test_six_commercial_sector_packs_with_calibrated_rois(self):
        self.assertEqual(len(intelligence.SECTOR_PACKS), 6)
        pack_ids = {p['id'] for p in intelligence.SECTOR_PACKS}
        self.assertEqual(pack_ids, {'site', 'pool', 'factory', 'warehouse', 'retail', 'office'})
        for p in intelligence.SECTOR_PACKS:
            self.assertGreaterEqual(len(p['rules']), 4)
            for r in p['rules']:
                self.assertIn('roi', r)
                self.assertEqual(len(r['roi']), 4)
                self.assertNotIn(r['kind'], ('pro_lpr', 'iot_sensor'))


class AlertsAndWebhookTests(unittest.TestCase):
    def test_hmac_webhook_signature_and_slack_discord_format(self):
        body = iot_automation.format_webhook_body(
            'https://hooks.slack.com/services/T00/B00/X00',
            {'id': '1', 'camera': 'Giriş', 'rule': 'Tailgating', 'reason': 'Kaçak geçiş'},
        )
        self.assertIn('text', json.loads(body))
        sig, ts = iot_automation.sign_webhook_payload(body, 'top-secret', timestamp=1700000000)
        self.assertTrue(sig.startswith('sha256='))
        self.assertEqual(ts, '1700000000')

    def test_telegram_multipart_photo_alert(self):
        img = io.BytesIO(); Image.new('RGB', (32, 32), 'red').save(img, format='JPEG')
        resp = MagicMock()
        resp.read.return_value = b'{"ok":true}'
        resp.__enter__.return_value = resp
        with patch.object(iot_automation.urllib.request, 'urlopen', return_value=resp) as call:
            ok = iot_automation.send_telegram_alert(
                '123456:ABCDEF',
                '987654',
                {'camera': 'Havuz', 'rule': 'Gece Giriş', 'reason': 'İnsan tespit edildi'},
                img.getvalue(),
            )
            self.assertTrue(ok)
            req = call.call_args.args[0]
            self.assertIn('/sendPhoto', req.full_url)
            self.assertIn(b'Havuz', req.data)


class ForensicsAndCommercialApiTests(unittest.TestCase):
    request = base.Tests.request

    @classmethod
    def setUpClass(cls):
        cls.http = base.s.http.server.ThreadingHTTPServer(('127.0.0.1', 18765), base.s.Handler)
        base.threading.Thread(target=cls.http.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.http.shutdown()
        cls.http.server_close()

    def setUp(self):
        base.s.STATE.update(
            cameras=[],
            rules=[],
            devices=[],
            events=[],
            webhook='',
            audit=[],
        )

    def test_sector_pack_deployment_with_calibrated_roi_and_all_cameras(self):
        c1 = json.loads(self.request('/api/cameras', {'name': 'Havuz Kamerası', 'url': 'rtsp://192.0.2.10/live'})[1])['id']
        c2 = json.loads(self.request('/api/cameras', {'name': 'Teras Kamerası', 'url': 'rtsp://192.0.2.11/live'})[1])['id']
        res = json.loads(self.request('/api/sector-apply', {'camera': c1, 'pack': 'pool'})[1])
        self.assertTrue(res['ok'])
        self.assertEqual(res['added'], 4)
        self.assertEqual(len(base.s.STATE['rules']), 4)
        # Verify pre-calibrated ROI was applied from the sector pack
        first_rule = base.s.STATE['rules'][0]
        self.assertEqual(first_rule['roi'], [10, 15, 80, 80])
        self.assertTrue(len(base.s.STATE['audit']) >= 2)

        # Deploy selective rules to ALL cameras
        res_all = json.loads(self.request('/api/sector-apply', {'camera': 'ALL', 'pack': 'retail', 'rules': [0, 1]})[1])
        self.assertTrue(res_all['ok'])
        self.assertEqual(res_all['cameras'], 2)
        self.assertEqual(res_all['added'], 4)

    def test_copilot_natural_language_search_and_csv_export(self):
        now = base.s.time.time()
        base.s.STATE['events'] = [
            {'id': 'e1', 'camera': 'Havuz', 'rule': 'Tailgating', 'kind': 'pro_tailgating', 'reason': 'Peş peşe geçiş', 'confidence': 1.0, 'reviewed': False, 'time': now - 60, 'observedAt': now - 60},
            {'id': 'e2', 'camera': 'Depo', 'rule': 'Loitering', 'kind': 'pro_loitering', 'reason': 'Stok koridorunda bekleme', 'confidence': 1.0, 'reviewed': True, 'time': now - 120, 'observedAt': now - 120},
        ]
        found = json.loads(self.request('/api/events-search', {'query': 'bugün incelenmemiş tailgating'})[1])
        self.assertEqual(found['count'], 1)
        self.assertEqual(found['events'][0]['id'], 'e1')

        status, csv_data = self.request('/api/events-export?q=bekleme')
        self.assertEqual(status, 200)
        self.assertIn('bekleme', csv_data.decode('utf-8-sig'))

    def test_forensic_zip_bundle_contains_sha256_manifest(self):
        eid = 'forensic123456'
        folder = base.s.DATA / 'events' / eid
        folder.mkdir(parents=True, exist_ok=True)
        (folder / '00.jpg').write_bytes(b'\xff\xd8\xff\xd9')
        base.s.STATE['events'] = [
            {'id': eid, 'camera': 'Nizamiye', 'rule': 'Giriş', 'time': 1700000000, 'reason': 'Test kanıtı', 'confidence': 1.0}
        ]
        status, zip_bytes = self.request(f'/api/evidence-bundle/{eid}.zip')
        self.assertEqual(status, 200)
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
            names = set(zf.namelist())
            self.assertIn('event_metadata.json', names)
            self.assertIn('00.jpg', names)
            self.assertIn('CHAIN_OF_CUSTODY.sha256', names)
            manifest = zf.read('CHAIN_OF_CUSTODY.sha256').decode('utf-8')
            self.assertIn('00.jpg', manifest)

    def test_commercial_license_generator_and_activator(self):
        gen = json.loads(self.request('/api/license-generate', {'plan': 'ENTERPRISE', 'organization': 'Marmara Site'})[1])
        self.assertTrue(gen['key'].startswith('IPS-ENTERPRISE-'))
        act = json.loads(self.request('/api/license-activate', {'key': gen['key'], 'organization': 'Marmara Site'})[1])
        self.assertTrue(act['ok'])
        self.assertEqual(act['license']['plan'], 'ENTERPRISE')

        with self.assertRaises(base.urllib.error.HTTPError):
            self.request('/api/license-activate', {'key': 'IPS-ENTERPRISE-000000-BADBAD00', 'organization': 'X'})


if __name__ == '__main__':
    unittest.main()
