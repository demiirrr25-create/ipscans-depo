"""Comprehensive test suite for IPScans Cortex 2.0 Pro multi-technology modules, 3-tier licensing (PRO/PLUS/ULTRA), Admin Panel & 2-way Telegram Bot."""
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

    def test_loitering_occupancy_perimeter_fall_abandon_and_tailgating_tracker(self):
        pt = intelligence.ProTracker()
        rule_loiter = {'name': 'Loiter', 'roi': [0, 0, 100, 100], 'duration': 5, 'sensitivity': 1}
        self.assertFalse(pt.evaluate_loitering([(50, 50)], rule_loiter, 0.0)[0])
        self.assertFalse(pt.evaluate_loitering([(50, 51)], rule_loiter, 2.0)[0])
        self.assertFalse(pt.evaluate_loitering([(50, 50)], rule_loiter, 4.0)[0])
        hit, res = pt.evaluate_loitering([(50, 50)], rule_loiter, 5.5)
        self.assertTrue(hit)
        self.assertIn('bekliyor', res['reason'])
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

        # Fall / Motionless detection
        pt_fall = intelligence.ProTracker()
        rule_fall = {'name': 'Düşme Takibi', 'roi': [0, 0, 100, 100], 'duration': 4, 'sensitivity': 3}
        self.assertFalse(pt_fall.evaluate_fall([(50, 60)], rule_fall, 0.0)[0])
        self.assertFalse(pt_fall.evaluate_fall([(50, 60)], rule_fall, 2.0)[0])
        hit_fall, res_fall = pt_fall.evaluate_fall([(50, 60)], rule_fall, 4.5)
        self.assertTrue(hit_fall)
        self.assertIn('düşme', res_fall['reason'])

        # Abandon / Quick-exit detection
        pt_ab = intelligence.ProTracker()
        rule_ab = {'name': 'Eşya Bırakma', 'roi': [0, 0, 100, 100], 'duration': 2, 'sensitivity': 2}
        self.assertFalse(pt_ab.evaluate_abandon([(40, 40)], rule_ab, 0.0)[0])
        self.assertFalse(pt_ab.evaluate_abandon([(40, 41)], rule_ab, 2.5)[0])
        hit_ab, res_ab = pt_ab.evaluate_abandon([], rule_ab, 3.0)
        self.assertTrue(hit_ab)
        self.assertIn('ayrıldı', res_ab['reason'])

        # Tailgating
        pt_tg = intelligence.ProTracker()
        rule_tg = {'name': 'Tailgating', 'direction': 'positive', 'sensitivity': 4}
        self.assertFalse(pt_tg.evaluate_tailgating(['positive'], rule_tg, 10.0)[0])
        hit_tg, res_tg = pt_tg.evaluate_tailgating(['positive'], rule_tg, 11.5)
        self.assertTrue(hit_tg)
        self.assertIn('Tailgating', res_tg['reason'])

    def test_eight_commercial_sector_packs_with_calibrated_rois(self):
        self.assertEqual(len(intelligence.SECTOR_PACKS), 8)
        pack_ids = {p['id'] for p in intelligence.SECTOR_PACKS}
        self.assertEqual(pack_ids, {'site', 'pool', 'factory', 'warehouse', 'retail', 'office', 'campus', 'clinic'})
        for p in intelligence.SECTOR_PACKS:
            self.assertGreaterEqual(len(p['rules']), 4)
            for r in p['rules']:
                self.assertIn('roi', r)
                self.assertEqual(len(r['roi']), 4)
                self.assertNotIn(r['kind'], ('pro_lpr', 'iot_sensor'))


class AlertsAndTwoWayTelegramBotTests(unittest.TestCase):
    def test_hmac_webhook_signature_and_slack_discord_format(self):
        body = iot_automation.format_webhook_body(
            'https://hooks.slack.com/services/T00/B00/X00',
            {'id': '1', 'camera': 'Giriş', 'rule': 'Tailgating', 'reason': 'Kaçak geçiş'},
        )
        self.assertIn('text', json.loads(body))
        sig, ts = iot_automation.sign_webhook_payload(body, 'top-secret', timestamp=1700000000)
        self.assertTrue(sig.startswith('sha256='))
        self.assertEqual(ts, '1700000000')

    def test_telegram_multipart_photo_alert_and_two_way_commands(self):
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

        # Test interactive 2-way bot commands (/start, /durum, /kameralar, /olaylar, /koru, /sustur)
        snap = {'cameras': [{'id': 'c1', 'name': 'Nizamiye', 'status': 'Bağlı', 'analysis': 'Hazır'}], 'rules': [{'enabled': True}], 'events': [], 'license': {'name': 'Cortex ULTRA', 'plan': 'ULTRA', 'maxCameras': 32, 'maxRules': 128}}
        for cmd, expected_word in [('/start', 'Komuta Botu Aktif'), ('/durum', 'Sistem Durumu'), ('/kameralar', 'Nizamiye'), ('/koru', 'TAM KORUMA'), ('/sustur', 'Güvenli Mod')]:
            out = iot_automation.process_bot_command(cmd, snap, chat_id='777888')
            self.assertIn(expected_word, out['reply'])


class ForensicsAdminAndCommercialApiTests(unittest.TestCase):
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
            safeMode=False,
            license=forensics.default_license(),
            customers=forensics.default_customer_registry(),
        )

    def test_sector_pack_deployment_with_calibrated_roi_and_all_cameras(self):
        c1 = json.loads(self.request('/api/cameras', {'name': 'Havuz Kamerası', 'url': 'rtsp://192.0.2.10/live'})[1])['id']
        c2 = json.loads(self.request('/api/cameras', {'name': 'Teras Kamerası', 'url': 'rtsp://192.0.2.11/live'})[1])['id']
        res = json.loads(self.request('/api/sector-apply', {'camera': c1, 'pack': 'pool'})[1])
        self.assertTrue(res['ok'])
        self.assertEqual(res['added'], 5)
        self.assertEqual(len(base.s.STATE['rules']), 5)
        first_rule = base.s.STATE['rules'][0]
        self.assertEqual(first_rule['roi'], [10, 15, 80, 80])

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

    def test_admin_panel_login_and_three_tier_license_enforcement(self):
        # 1. Unauthenticated license generation must be rejected with HTTP 403
        with self.assertRaises(base.urllib.error.HTTPError) as err_unauth:
            self.request('/api/license-generate', {'plan': 'PRO', 'organization': 'Yetkisiz Deneme'})
        self.assertEqual(err_unauth.exception.code, 403)

        # 2. Wrong admin password must be rejected with HTTP 403
        with self.assertRaises(base.urllib.error.HTTPError) as err_bad_pw:
            self.request('/api/admin/login', {'username': 'admin', 'password': 'WrongPassword'})
        self.assertEqual(err_bad_pw.exception.code, 403)

        # 3. Valid admin login (admin / Kingofthegame0714*) returns adminToken and customer list
        login_res = json.loads(self.request('/api/admin/login', {'username': 'admin', 'password': 'Kingofthegame0714*'})[1])
        self.assertTrue(login_res['ok'])
        adm_token = login_res['adminToken']
        self.assertGreaterEqual(len(login_res['customers']), 3)

        # 4. Generate PRO, PLUS, and ULTRA keys via Admin Panel
        for tier, max_cams in [('PRO', 4), ('PLUS', 12), ('ULTRA', 32)]:
            gen = json.loads(self.request('/api/admin/license-generate', {'adminToken': adm_token, 'plan': tier, 'organization': f'Müşteri {tier}'})[1])
            self.assertTrue(gen['key'].startswith(f'IPS-{tier}-'))
            act = json.loads(self.request('/api/license-activate', {'key': gen['key'], 'organization': f'Müşteri {tier}'})[1])
            self.assertTrue(act['ok'])
            self.assertEqual(act['license']['plan'], tier)
            self.assertEqual(act['license']['maxCameras'], max_cams)

        # 5. Enforce PRO tier camera cap (4 cameras max)
        pro_key = json.loads(self.request('/api/admin/license-generate', {'adminToken': adm_token, 'plan': 'PRO', 'organization': 'Kobi Market'})[1])['key']
        self.request('/api/license-activate', {'key': pro_key, 'organization': 'Kobi Market'})
        for i in range(4):
            self.request('/api/cameras', {'name': f'Kamera {i+1}', 'url': f'rtsp://192.0.2.{20+i}/live'})
        with self.assertRaises(base.urllib.error.HTTPError) as cap_err:
            self.request('/api/cameras', {'name': 'Kamera 5 (Limit Aşımı)', 'url': 'rtsp://192.0.2.30/live'})
        self.assertEqual(cap_err.exception.code, 400)

        # 6. Admin remote remediation actions (run_diagnostics, toggle_safe_mode, upgrade_plan)
        diag = json.loads(self.request('/api/admin/action', {'adminToken': adm_token, 'action': 'run_diagnostics', 'customerId': 'node-local-primary'})[1])
        self.assertTrue(diag['ok'])
        self.assertIn('OK', diag['diagnostics']['ffmpegBinary'])

        upg = json.loads(self.request('/api/admin/action', {'adminToken': adm_token, 'action': 'upgrade_plan', 'customerId': 'node-local-primary', 'plan': 'ULTRA'})[1])
        self.assertTrue(upg['ok'])
        self.assertEqual(base.s.STATE['license']['plan'], 'ULTRA')


if __name__ == '__main__':
    unittest.main()
