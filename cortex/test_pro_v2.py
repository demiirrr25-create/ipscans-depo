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
import admin_server


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
        self.assertEqual(len(intelligence.SECTOR_PACKS), 10)
        pack_ids = {p['id'] for p in intelligence.SECTOR_PACKS}
        self.assertEqual(pack_ids, {'site', 'pool', 'factory', 'warehouse', 'retail', 'office', 'campus', 'clinic', 'hotel', 'home'})
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
        for cmd, expected_word in [('/start', 'Kontrol merkezi'), ('/durum', 'Sistem durumu'), ('/kameralar', 'Nizamiye'), ('/koru', 'TAM KORUMA'), ('/sustur', 'Güvenli Mod')]:
            out = iot_automation.process_bot_command(cmd, snap, chat_id='777888')
            self.assertIn(expected_word, out['reply'])

        # Test phone number normalization and @intelligentcortexbot phone binding
        self.assertEqual(iot_automation.normalize_phone('0532 123 45 67'), '905321234567')
        self.assertEqual(iot_automation.normalize_phone('541 513 05 25'), '905415130525')
        self.assertEqual(iot_automation.format_phone_display('05321234567'), '+90 (532) 123 45 67')
        with patch.object(iot_automation, '_tg_api', return_value=[]):
            bound = iot_automation.bind_telegram_phone('0532 123 45 67', send_welcome=False)
            self.assertTrue(bound['ok'])
            self.assertTrue(bound['connected'])
            self.assertTrue(bound['verified'])
            self.assertEqual(bound['phone'], '905321234567')
            self.assertEqual(bound['phoneDisplay'], '+90 (532) 123 45 67')
            self.assertEqual(bound['botUsername'], 'intelligentcortexbot')
            self.assertIn('start=phone_905321234567', bound['deepLink'])
            self.assertIn('tg://resolve?domain=intelligentcortexbot&start=phone_905321234567', bound['tgProtocol'])

        # Test 2-way phone pairing via poll_telegram_updates (/start phone_<digits> and contact share)
        paired_actions = []
        fake_updates = [
            {
                'update_id': 101,
                'message': {
                    'chat': {'id': 555666, 'first_name': 'Saha', 'last_name': 'Operatör'},
                    'text': '/start phone_05321234567',
                },
            }
        ]
        with patch.object(iot_automation, '_tg_api', return_value=fake_updates), patch.object(iot_automation, 'send_telegram_alert', return_value=True):
            new_off = iot_automation.poll_telegram_updates(
                iot_automation.OFFICIAL_BOT_TOKEN,
                '8972256505',
                100,
                dict(snap),
                action_callback=lambda act, arg: paired_actions.append((act, arg)),
            )
            self.assertEqual(new_off, 101)
            self.assertTrue(any(act == 'register_chat' and arg['chatId'] == '555666' for act, arg in paired_actions))
            self.assertTrue(any(act == 'bind_phone' and arg['phone'] == '905321234567' and arg['chatId'] == '555666' for act, arg in paired_actions))

        # Verify public_state()['telegram'] fields
        pub_tg = base.s.public_state()['telegram']
        self.assertTrue(pub_tg['connected'])
        self.assertTrue(pub_tg['embeddedBotActive'])
        self.assertEqual(pub_tg['botEngineStatus'], 'Gömülü Bot Motoru Aktif · Otomatik Başlatma Devrede')
        self.assertIn('lastPollAt', pub_tg)
        self.assertIn('phoneDisplay', pub_tg)
        self.assertIn('deepLink', pub_tg)
        self.assertIn('tgProtocol', pub_tg)


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
        base.s.ACTIVE_TENANT_ID = 'node-local-primary'
        base.s.ACTIVE_USER.update({'authenticated': False, 'user': None})
        for cid, w in list(base.s.WORKERS.items()):
            base.s._stop_worker(w)
        base.s.WORKERS.clear()
        base.s.LOGIN_ATTEMPTS.clear()
        base.s.STATE.update(
            activeTenantId='node-local-primary',
            tenantWorkspaces={},
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
        base.s.save()

    def test_sector_pack_deployment_with_calibrated_roi_and_all_cameras(self):
        c1 = json.loads(self.request('/api/cameras', {'name': 'Havuz Kamerası', 'url': 'rtsp://192.0.2.10/live'})[1])['id']
        c2 = json.loads(self.request('/api/cameras', {'name': 'Teras Kamerası', 'url': 'rtsp://192.0.2.11/live'})[1])['id']
        res = json.loads(self.request('/api/sector-apply', {'camera': c1, 'pack': 'pool'})[1])
        self.assertTrue(res['ok'])
        self.assertEqual(res['added'], 11)
        self.assertEqual(len(base.s.STATE['rules']), 11)
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

    def test_telegram_one_click_bind_phone_endpoint(self):
        tg_calls = []

        def _fake_tg_api(token, method, payload=None, timeout=8):
            tg_calls.append((method, payload))
            if method == 'getUpdates':
                return []
            return {'ok': True}

        with patch.object(iot_automation, '_tg_api', side_effect=_fake_tg_api):
            res = json.loads(self.request('/api/telegram-bind-phone', {'phone': '0541 513 05 25', 'sendWelcome': True})[1])
            self.assertTrue(res['ok'])
            self.assertTrue(res['connected'])
            self.assertTrue(res['embeddedBotActive'])
            self.assertTrue(res['autoStarted'])
            self.assertTrue(res['notified'])
            self.assertEqual(res['phone'], '905415130525')
            self.assertEqual(res['phoneDisplay'], '+90 (541) 513 05 25')
            self.assertEqual(res['botUsername'], 'intelligentcortexbot')
            self.assertIn('start=phone_905415130525', res['deepLink'])
            self.assertIn('tg://resolve?domain=intelligentcortexbot&start=phone_905415130525', res['tgProtocol'])
            send_calls = [p for m, p in tg_calls if m == 'sendMessage']
            self.assertEqual(len(send_calls), 1)
            self.assertIn('Cortex · Bağlantınız hazır', send_calls[0]['text'])
            self.assertIn('+90 (541) 513 05 25', send_calls[0]['text'])
            bot_log = base.s.STATE.get('telegramBotLog', [])
            self.assertTrue(any(entry.get('action') == '/start (Otomatik)' for entry in bot_log))

    def test_customer_login_multi_phone_quotas_and_video_alert(self):
        # 1. Login as PRO customer ('kuzey' / 'Kuzey2026*') -> maxTelegramPhones = 2
        login_res = json.loads(self.request('/api/auth/login', {'username': 'kuzey', 'password': 'Kuzey2026*'})[1])
        self.assertTrue(login_res['ok'])
        self.assertEqual(login_res['user']['plan'], 'PRO')
        self.assertEqual(login_res['user']['maxTelegramPhones'], 2)

        with patch.object(iot_automation, '_tg_api', return_value=[]):
            # Clear existing phones first
            for p in list(base.s.STATE['telegram'].get('phones', [])):
                self.request('/api/telegram-remove-phone', {'phone': p['phone']})

            # Add 1st and 2nd phone on PRO tier -> succeeds
            r1 = json.loads(self.request('/api/telegram-bind-phone', {'phone': '0541 513 05 25', 'sendWelcome': False})[1])
            self.assertEqual(len(r1['phones']), 1)
            r2 = json.loads(self.request('/api/telegram-bind-phone', {'phone': '0532 111 22 33', 'sendWelcome': False})[1])
            self.assertEqual(len(r2['phones']), 2)

            # Adding 3rd phone on PRO tier (limit 2) must raise HTTP 400
            with self.assertRaises(base.urllib.error.HTTPError) as err_quota:
                self.request('/api/telegram-bind-phone', {'phone': '0555 444 55 66', 'sendWelcome': False})
            self.assertEqual(err_quota.exception.code, 400)

            # Remove 2nd phone -> back to 1
            rem = json.loads(self.request('/api/telegram-remove-phone', {'phone': '0532 111 22 33'})[1])
            self.assertEqual(len(rem['phones']), 1)

        # 2. Verify send_telegram_alert dispatches BOTH /sendPhoto (pre-event frame) and /sendVideo (event video)
        called_urls = []
        class _DummyResp:
            def __enter__(self): return self
            def __exit__(self, *a): pass
            def read(self, *_): return b'{"ok": true, "result": {}}'

        def _fake_urlopen(req, timeout=8):
            called_urls.append(req.full_url)
            return _DummyResp()

        with patch.object(iot_automation.urllib.request, 'urlopen', side_effect=_fake_urlopen):
            iot_automation.send_telegram_alert(
                '123456:ABCDEF',
                '8972256505',
                {'camera': 'Nizamiye', 'rule': 'İhlal', 'reason': 'Test'},
                frame_bytes=b'\xff\xd8\xff\xe0' + b'\x00' * 120 + b'\xff\xd9',
                video_bytes=b'\x00\x00\x00\x18ftypmp42' + b'\x00' * 256,
                phone_number='905415130525',
            )
        self.assertTrue(any('/sendPhoto' in u for u in called_urls))
        self.assertTrue(any('/sendVideo' in u for u in called_urls))

        # Restore ULTRA login for subsequent state
        self.request('/api/auth/login', {'username': 'cortex', 'password': 'Cortex2026*'})

    def test_multilayer_encryption_cxv2_pbkdf2_and_tenant_secrets(self):
        # 1. Layer 1: PBKDF2-HMAC-SHA256 (600,000 iterations) salted password hashing
        pw_hash = forensics.hash_user_password('SuperSecret2026*')
        self.assertTrue(pw_hash.startswith('pbkdf2_sha256$600000$'))
        self.assertTrue(forensics.verify_user_password('SuperSecret2026*', pw_hash))
        self.assertFalse(forensics.verify_user_password('WrongPassword', pw_hash))

        # 2. Layer 2: CXV2 Dual-Layer Envelope Encryption (HKDF-SHA256 + Fernet + AES-256-GCM AEAD)
        master_key = base.s.KEY.read_bytes()
        vault = forensics.MultiLayerVault(master_key)
        sample_payload = json.dumps({'secret': 'camera_rtsp_credential', 'count': 42}).encode('utf-8')
        encrypted_blob = vault.encrypt(sample_payload)
        self.assertTrue(encrypted_blob.startswith(b'CXV2'))
        self.assertNotIn(b'camera_rtsp_credential', encrypted_blob)
        self.assertEqual(vault.decrypt(encrypted_blob), sample_payload)

        # Verify disk config.enc is written with CXV2 envelope header
        base.s.save()
        raw_disk_enc = (base.s.DATA / 'config.enc').read_bytes()
        self.assertTrue(raw_disk_enc.startswith(b'CXV2'))

        # 3. Layer 3: Per-Tenant Secret Encryption (HKDF-SHA256 + AES-256-GCM with tenant AAD)
        enc_secret = forensics.encrypt_tenant_secret('rtsp_pass_99', 'cust-marmara-site', master_key)
        self.assertTrue(enc_secret.startswith('ENC2:'))
        self.assertEqual(forensics.decrypt_tenant_secret(enc_secret, 'cust-marmara-site', master_key), 'rtsp_pass_99')
        with self.assertRaises(Exception):
            forensics.decrypt_tenant_secret(enc_secret, 'cust-kuzey-depo', master_key)

    def test_strict_multi_tenant_camera_and_session_isolation(self):
        # 1. User A ('marmara') logs in and adds 2 cameras + 1 rule + active stream worker
        login_a = json.loads(self.request('/api/auth/login', {'username': 'marmara', 'password': 'Marmara2026*'})[1])
        self.assertTrue(login_a['ok'])
        self.assertEqual(login_a['user']['id'], 'cust-marmara-site')

        cam_a1 = json.loads(self.request('/api/cameras', {'name': 'Marmara Havuz', 'url': 'rtsp://192.0.2.101/live'})[1])['id']
        cam_a2 = json.loads(self.request('/api/cameras', {'name': 'Marmara Otopark', 'url': 'rtsp://192.0.2.102/live'})[1])['id']
        self.request('/api/rules', {'camera': cam_a1, 'name': 'Havuz İhlali', 'prompt': 'Gece havuz girişi', 'threshold': 0.8, 'cooldown': 60})

        # Simulate active camera worker streaming frames for User A
        dummy_worker = MagicMock()
        dummy_worker.frame = b'\xff\xd8\xff\xe0MARMARA_FRAME\xff\xd9'
        dummy_worker.status = 'Bağlı'
        dummy_worker.analysis = 'Hazır'
        dummy_worker.brightness = 120.0
        dummy_worker.inference_ms = 50
        dummy_worker.received = base.s.time.monotonic()
        dummy_worker.active_points = []
        base.s.WORKERS[cam_a1] = dummy_worker

        state_a = json.loads(self.request('/api/state')[1])
        self.assertEqual(len(state_a['cameras']), 2)
        self.assertEqual(len(state_a['rules']), 1)
        self.assertNotIn('passwordHash', state_a['license'])
        self.assertNotIn('passwordHint', state_a['license'])
        self.assertEqual(self.request(f'/api/frame/{cam_a1}')[0], 200)

        # 2. User B ('kuzey') logs in on the same Cortex station
        login_b = json.loads(self.request('/api/auth/login', {'username': 'kuzey', 'password': 'Kuzey2026*'})[1])
        self.assertTrue(login_b['ok'])
        self.assertEqual(login_b['user']['id'], 'cust-kuzey-depo')

        # User A's live camera worker MUST be stopped and removed immediately
        self.assertNotIn(cam_a1, base.s.WORKERS)
        self.assertTrue(dummy_worker.stop.set.called)

        # User B MUST see 0 of User A's cameras, rules, and events
        state_b = json.loads(self.request('/api/state')[1])
        self.assertEqual(len(state_b['cameras']), 0)
        self.assertEqual(len(state_b['rules']), 0)
        self.assertEqual(len(state_b['events']), 0)

        # User B requesting User A's camera frame or heatmap MUST be blocked with HTTP 404
        with self.assertRaises(base.urllib.error.HTTPError) as frame_err:
            self.request(f'/api/frame/{cam_a1}')
        self.assertEqual(frame_err.exception.code, 404)

        with self.assertRaises(base.urllib.error.HTTPError) as hm_err:
            self.request(f'/api/heatmap/{cam_a1}')
        self.assertEqual(hm_err.exception.code, 404)

        # User B adds their own camera
        cam_b1 = json.loads(self.request('/api/cameras', {'name': 'Kuzey Depo Giriş', 'url': 'rtsp://192.0.2.201/live'})[1])['id']
        state_b_after = json.loads(self.request('/api/state')[1])
        self.assertEqual(len(state_b_after['cameras']), 1)
        self.assertEqual(state_b_after['cameras'][0]['id'], cam_b1)

        # 3. User A ('marmara') logs back in -> User A's 2 cameras and 1 rule are restored, User B's camera is hidden
        self.request('/api/auth/login', {'username': 'marmara', 'password': 'Marmara2026*'})
        state_a_restored = json.loads(self.request('/api/state')[1])
        self.assertEqual({c['id'] for c in state_a_restored['cameras']}, {cam_a1, cam_a2})
        self.assertEqual(len(state_a_restored['rules']), 1)

    def test_new_customer_never_clones_or_inherits_admin_telegram(self):
        # Seed local station (node-local-primary) with admin camera + admin Telegram info first
        self.request('/api/cameras', {'name': 'Merkez Admin Kamerası', 'url': 'rtsp://192.0.2.50/live'})
        base.s.STATE['telegram'] = {
            'botToken': iot_automation.OFFICIAL_BOT_TOKEN,
            'chatId': iot_automation.DEFAULT_ADMIN_CHAT_ID,
            'phone': iot_automation.DEFAULT_ADMIN_PHONE,
            'phoneDisplay': iot_automation.DEFAULT_ADMIN_PHONE_DISPLAY,
            'phones': [
                {
                    'phone': iot_automation.DEFAULT_ADMIN_PHONE,
                    'phoneDisplay': iot_automation.DEFAULT_ADMIN_PHONE_DISPLAY,
                    'chatId': iot_automation.DEFAULT_ADMIN_CHAT_ID,
                    'title': 'Varsayılan Yönetici Hattı',
                    'enabled': True,
                    'verified': True,
                    'autoStarted': True,
                    'autoStartPending': False,
                    'addedAt': base.s.time.time(),
                }
            ],
            'phoneDirectory': {iot_automation.DEFAULT_ADMIN_PHONE: iot_automation.DEFAULT_ADMIN_CHAT_ID},
            'knownChats': {},
            'enabled': True,
            'embeddedBotActive': True,
            'lastPollAt': base.s.time.time(),
            'botUsername': iot_automation.OFFICIAL_BOT_USERNAME,
            'lastUpdateId': 0,
        }
        base.s.save()

        admin_server.PORT = 18766
        adm_http = admin_server.http.server.ThreadingHTTPServer(('127.0.0.1', 18766), admin_server.AdminHandler)
        base.threading.Thread(target=adm_http.serve_forever, daemon=True).start()
        try:
            def adm_post(path, payload):
                req = base.urllib.request.Request(
                    f'http://127.0.0.1:18766{path}',
                    json.dumps(payload).encode('utf-8'),
                    {'Content-Type': 'application/json', 'Origin': 'http://127.0.0.1:18766'},
                )
                with base.urllib.request.urlopen(req) as r:
                    return r.status, json.loads(r.read().decode('utf-8'))

            _, adm_login = adm_post('/api/admin/login', {'username': 'admin', 'password': 'Kingofthegame0714*'})
            self.assertTrue(adm_login['ok'])
            adm_token = adm_login['adminToken']

            # 1. Create a brand-new customer via admin_server (POST /api/admin/customer-save)
            _, save_res = adm_post(
                '/api/admin/customer-save',
                {
                    'adminToken': adm_token,
                    'organization': 'Yeni Musteri A.S.',
                    'username': 'yenimusteri',
                    'password': 'YeniPassword2026*',
                    'plan': 'PLUS',
                    'assignToLocal': True,
                },
            )
            self.assertTrue(save_res['ok'])

            # 2. Verify customers list has ONLY 1 entry with username == 'yenimusteri' (zero self-cloning into node-local-primary!)
            matching_users = [c for c in save_res['customers'] if c.get('username', '').lower() == 'yenimusteri']
            self.assertEqual(len(matching_users), 1)
            local_primary = next((c for c in save_res['customers'] if c.get('id') == 'node-local-primary'), None)
            self.assertIsNotNone(local_primary)
            self.assertEqual(local_primary['username'], 'cortex')
            self.assertNotEqual(local_primary['organization'], 'Yeni Musteri A.S.')

            # 3. Verify new customer has 0 cameras, 0 rules, 0 telegramPhonesUsed, and 0 leaked admin Telegram data
            new_cust = matching_users[0]
            self.assertEqual(new_cust['camerasUsed'], 0)
            self.assertEqual(new_cust['rulesUsed'], 0)
            self.assertEqual(new_cust['telegramPhonesUsed'], 0)
            self.assertEqual(save_res['telegram']['boundPhonesCount'], 0)
            self.assertEqual(save_res['telegram']['phone'], '')

            # Log in as 'yenimusteri' on server.py and verify completely clean state
            login_res = json.loads(
                self.request('/api/auth/login', {'username': 'yenimusteri', 'password': 'YeniPassword2026*'})[1]
            )
            self.assertTrue(login_res['ok'])
            self.assertEqual(login_res['state']['telegram']['phone'], '')
            self.assertEqual(login_res['state']['telegram']['phones'], [])
            self.assertEqual(login_res['state']['telegram']['chatId'], '')
            self.assertEqual(login_res['state']['cameras'], [])

            state_after = json.loads(self.request('/api/state')[1])
            self.assertEqual(state_after['telegram']['phone'], '')
            self.assertEqual(state_after['telegram']['phones'], [])
            self.assertEqual(state_after['telegram']['chatId'], '')
            self.assertEqual(state_after['cameras'], [])

            # Also verify server.py sync_local_customer_node() never clones 'yenimusteri' into 'node-local-primary'
            base.s.sync_local_customer_node()
            base.s.save()
            _, state_adm_after = adm_post('/api/admin/state', {'adminToken': adm_token})
            self.assertEqual(
                len([c for c in state_adm_after['customers'] if c.get('username', '').lower() == 'yenimusteri']),
                1,
            )
        finally:
            adm_http.shutdown()
            adm_http.server_close()

    def test_new_customer_deneme_never_inherits_telegram_phone(self):
        # 1. Log in as primary/admin tenant ('cortex') and bind phones +905321112233 and +905415130525
        self.request('/api/auth/login', {'username': 'cortex', 'password': 'Cortex2026*'})
        with patch.object(iot_automation, '_tg_api', return_value=[]):
            self.request('/api/telegram-bind-phone', {'phone': '+905321112233', 'sendWelcome': False})
            self.request('/api/telegram-bind-phone', {'phone': '+905415130525', 'sendWelcome': False})
        primary_state = json.loads(self.request('/api/state')[1])
        self.assertGreaterEqual(len(primary_state['telegram']['phones']), 2)
        self.assertTrue(all(p.get('ownerId') == 'node-local-primary' for p in primary_state['telegram']['phones']))

        # 2. Create a new customer 'deneme' (PRO plan) via admin_server and log in as 'deneme'
        admin_server.PORT = 18767
        adm_http = admin_server.http.server.ThreadingHTTPServer(('127.0.0.1', 18767), admin_server.AdminHandler)
        base.threading.Thread(target=adm_http.serve_forever, daemon=True).start()
        try:
            def adm_post(path, payload):
                req = base.urllib.request.Request(
                    f'http://127.0.0.1:18767{path}',
                    json.dumps(payload).encode('utf-8'),
                    {'Content-Type': 'application/json', 'Origin': 'http://127.0.0.1:18767'},
                )
                with base.urllib.request.urlopen(req) as r:
                    return r.status, json.loads(r.read().decode('utf-8'))

            _, adm_login = adm_post('/api/admin/login', {'username': 'admin', 'password': 'Kingofthegame0714*'})
            adm_token = adm_login['adminToken']
            _, save_res = adm_post(
                '/api/admin/customer-save',
                {
                    'adminToken': adm_token,
                    'organization': 'Deneme',
                    'username': 'deneme',
                    'password': 'Deneme2026*',
                    'plan': 'PRO',
                    'assignToLocal': True,
                },
            )
            self.assertTrue(save_res['ok'])
        finally:
            adm_http.shutdown()
            adm_http.server_close()

        login_deneme = json.loads(
            self.request('/api/auth/login', {'username': 'deneme', 'password': 'Deneme2026*'})[1]
        )
        self.assertTrue(login_deneme['ok'])
        deneme_tid = login_deneme['user']['id']

        # 3. Verify public_state() and /api/state have zero leaked phones, phoneDisplay, or chatId
        for st in (base.s.public_state(), json.loads(self.request('/api/state')[1]), login_deneme['state']):
            self.assertEqual(st['telegram']['phones'], [])
            self.assertEqual(st['telegram']['phone'], '')
            self.assertEqual(st['telegram']['phoneDisplay'], '')
            self.assertEqual(st['telegram']['chatId'], '')
            self.assertEqual(st['telegram']['phonesCount'], 0)
            self.assertFalse(st['telegram']['connected'])
            self.assertEqual(st['telegram']['ownerId'], deneme_tid)


if __name__ == '__main__':
    unittest.main()
