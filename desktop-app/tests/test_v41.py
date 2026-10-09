import os
os.environ.setdefault('QT_QPA_PLATFORM', 'offscreen')
import unittest
from unittest.mock import patch
from threading import Event
from app.core.adaptive import Budget, sweep
from app.core.intelligence import classify
from app.core.models import Device
from app.core.topology import build_topology

class V41Tests(unittest.TestCase):
    def test_cdp_requires_matching_ipv4_address_type(self):
        from app.core.protocols.snmp_probe import verified_cdp_ips
        raw = bytes([10,0,0,2])
        self.assertEqual(verified_cdp_ips({'1':'1','2':'2'}, {'1':raw,'2':raw,'3':raw}), ('10.0.0.2',))
        self.assertEqual(verified_cdp_ips({'1':'1'}, {'1':b'bad'}), ())

    def test_adaptive_budget_stays_bounded_and_backs_off_on_rising_responses(self):
        for ceiling in (1, 8, 32):
            budget = Budget(ceiling=ceiling, concurrency=min(8,ceiling))
            for values in ([10]*16,[500]*16,[],[1]*16)*10:
                budget.observe(values)
                self.assertTrue(1 <= budget.concurrency <= ceiling)
                self.assertTrue(400 <= budget.timeout_ms <= 1200)
        budget=Budget(concurrency=16)
        budget.observe([10]*16)
        budget.observe([500]*16)
        self.assertLess(budget.concurrency,16)

    def test_adaptive_retry_recovers_missed_echo_without_duplicates(self):
        attempts={}
        def ping(ip, timeout):
            attempts[ip]=attempts.get(ip,0)+1
            return attempts[ip]==2
        found, progress=[],[]
        targets=[f'127.0.0.{i}' for i in range(1,33)]
        result=sweep(targets,8,None,lambda done,total:progress.append(done),lambda ip,source:found.append((ip,source)),ping,lambda *args:False)
        self.assertEqual(set(result),set(targets))
        self.assertEqual(len(found),32)
        self.assertTrue(all(source=='ICMP retry' for _,source in found))
        self.assertEqual(progress[-1],32)

    def test_adaptive_cancellation_does_not_schedule_the_entire_range(self):
        stop=Event(); attempts=[]
        def ping(ip, timeout):
            attempts.append(ip); return True
        sweep([str(i) for i in range(10000)],8,stop.is_set,lambda *args:stop.set(),None,ping,lambda *args:False)
        self.assertLessEqual(len(attempts),8)

    def test_multiple_independent_sources_raise_evidence_score(self):
        d=Device('127.0.0.1',onvif_types=['NetworkVideoTransmitter'])
        classify(d); first=d.identification_score
        d.http_title='IP Camera'; d.rtsp_server='RTSP/1.0 response'
        classify(d)
        self.assertEqual(d.device_type,'IP Camera')
        self.assertGreater(d.identification_score,first)
        self.assertEqual(d.classification_confidence,'High')

    def test_ports_vendor_rtsp_and_airplay_do_not_invent_identity(self):
        for d in (Device('127.0.0.1',vendor='CameraVendor',open_ports=[80,554]),
                  Device('127.0.0.1',rtsp_server='Generic streaming server'),
                  Device('127.0.0.1',mdns_services=['_airplay._tcp.local.']),
                  Device('127.0.0.1',http_title='Camera')):
            classify(d); self.assertEqual(d.device_type,'Unknown')
            self.assertIsNone(d.serial_number); self.assertIsNone(d.model)

    def test_conflicting_protocol_identity_is_unknown(self):
        d=Device('127.0.0.1',onvif_types=['NetworkVideoTransmitter'],snmp_sys_descr='network printer')
        classify(d)
        self.assertEqual(d.device_type,'Unknown')
        self.assertIn('Conflicting',d.classification_evidence)

    def test_new_device_categories_require_self_advertisement(self):
        for phrase, expected in [('modem','Modem'),('managed switch','Managed Switch'),('unmanaged switch','Unmanaged Switch'),
            ('firewall','Firewall'),('notebook','Laptop'),('smart tv','Smart TV'),('network storage','Network Storage'),
            ('voip phone','VoIP Phone'),('wifi extender','Wi-Fi Extender'),('iot device','IoT Device')]:
            with self.subTest(phrase=phrase):
                d=Device('127.0.0.1',snmp_sys_descr=phrase); classify(d)
                self.assertEqual(d.device_type,expected)

    def test_bridge_forwarding_is_inferred_and_ambiguous_paths_not_chosen(self):
        device=Device('10.0.0.3',mac='02:00:00:00:00:03')
        switch=Device('10.0.0.1',bridge_fdb=[device.mac+'@4'])
        links=build_topology([switch,device],None)
        self.assertEqual(len(links),1); self.assertFalse(links[0].confirmed)
        other=Device('10.0.0.2',bridge_fdb=[device.mac+'@2'])
        self.assertEqual(build_topology([switch,other,device],None),[])

    def test_cdp_adjacency_is_confirmed_only_for_discovered_peer(self):
        router=Device('10.0.0.1',cdp_neighbor_ips=['10.0.0.2','10.0.0.99'])
        links=build_topology([router,Device('10.0.0.2')],router.ip)
        self.assertEqual(len(links),1); self.assertTrue(links[0].confirmed)

    def test_vertical_map_handles_deep_trees_and_search_ancestors(self):
        from PyQt6.QtWidgets import QApplication
        from app.ui.network_map import NetworkMap
        app=QApplication.instance() or QApplication([])
        devices=[Device(f'10.0.{i//250}.{i%250+1}') for i in range(1100)]
        for a,b in zip(devices,devices[1:]): a.cdp_neighbor_ips=[b.ip]
        graph=NetworkMap(); graph.refresh(devices,devices[0].ip)
        self.assertEqual(len(graph.nodes),1100)
        self.assertGreater(graph.nodes[devices[-1].ip].y(),graph.nodes[devices[0].ip].y())
        graph.set_filter_text('ip:'+devices[2].ip)
        self.assertEqual(set(graph.nodes),{d.ip for d in devices[:3]})
        graph.close()

    def test_readonly_http_probe_never_follows_redirects_or_uses_proxy(self):
        from app.core.protocols.service_probe import http_identity
        with patch('app.core.protocols.service_probe.requests.Session') as session:
            connection=session.return_value.__enter__.return_value
            response=connection.get.return_value.__enter__.return_value
            response.status_code=302
            self.assertEqual(http_identity('127.0.0.1',[80],lambda:False),(None,None))
            self.assertFalse(connection.trust_env)
            self.assertFalse(connection.get.call_args.kwargs['allow_redirects'])

if __name__=='__main__': unittest.main()
