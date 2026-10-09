"""Evidence scores are heuristics, never calibrated accuracy percentages."""
import re
from collections import defaultdict
from app.core.models import Device

SIGNATURES = (
    ('internetgatewaydevice|router', 'Router'), ('modem', 'Modem'),
    ('wirelessaccesspoint|wireless access point|accesspoint', 'Access Point'),
    ('wifi extender|wi-fi extender|range extender', 'Wi-Fi Extender'),
    ('unmanaged switch', 'Unmanaged Switch'), ('managed switch', 'Managed Switch'),
    ('poe switch', 'PoE Switch'), ('switch', 'Switch'),
    ('firewall|fortigate|pfsense|opnsense', 'Firewall'),
    ('networkvideorecorder|nvr', 'NVR'), ('dvr', 'DVR'), ('camera', 'IP Camera'),
    ('printer|laserjet', 'Printer'), ('nas|diskstation', 'NAS'),
    ('network storage', 'Network Storage'), ('voip phone|ipphone|ip phone', 'VoIP Phone'),
    ('smart tv|smarttv|television', 'Smart TV'), ('iot device', 'IoT Device'),
    ('network server|windows server', 'Server'), ('laptop|notebook', 'Laptop'), ('computer', 'Computer'),
)

def classify(device: Device) -> None:
    evidence = defaultdict(dict)
    def add(kind, source, score, detail):
        evidence[kind][source] = (score, detail)
    types = {value.rsplit(':', 1)[-1] for value in device.onvif_types}
    if 'NetworkVideoStorage' in types:
        add('NVR', 'ONVIF', 65, 'ONVIF NetworkVideoStorage announcement')
    elif 'NetworkVideoTransmitter' in types or not types and (device.onvif_endpoint or 'ONVIF' in device.sources):
        add('IP Camera', 'ONVIF', 65, 'ONVIF discovery announcement')
    for source, description, weight in (
        ('SNMP', device.snmp_sys_descr, 65), ('UPnP', device.upnp_device_type, 60),
        ('HTTP', device.http_title, 30),
    ):
        for pattern, kind in SIGNATURES:
            if description and re.search(r'(?<![a-z0-9])(?:' + pattern + r')(?![a-z0-9])', description.lower()):
                add(kind, source, weight, f'{source} device description')
                break
    for service in device.mdns_services:
        kind = next((kind for token, kind in (
            ('_printer.', 'Printer'), ('_ipp.', 'Printer'), ('_ipps.', 'Printer'),
            ('_workstation.', 'Computer'), ('_airplay.', 'Smart TV'),
        ) if service.lower().startswith(token)), None)
        if kind:
            add(kind, 'mDNS', 30 if kind == 'Smart TV' else 60, f'mDNS {service}')
    if device.wmi_os_caption:
        add('Server' if 'server' in device.wmi_os_caption.lower() else 'Computer', 'WMI', 90, 'Local Windows WMI')
    # RTSP describes streaming capability, not a camera by itself.
    if device.rtsp_server and 'IP Camera' in evidence:
        add('IP Camera', 'RTSP', 15, 'RTSP protocol response supports video capability')
    ranked = sorted(((min(99, sum(v[0] for v in sources.values())), kind, sources)
                     for kind, sources in evidence.items()), reverse=True)
    device.device_type, device.classification_confidence = 'Unknown', 'Low'
    device.classification_evidence, device.identification_score = None, 0
    if not ranked:
        return
    score, kind, sources = ranked[0]
    if len(ranked) > 1 and ranked[1][0] >= 55 and ranked[1][0] >= score - 20:
        device.classification_evidence = 'Conflicting device identities: ' + ', '.join(entry[1] for entry in ranked)
        return
    device.identification_score = score
    device.classification_evidence = '; '.join(value[1] for value in sources.values())
    if score >= 55:
        device.device_type = kind
        device.classification_confidence = 'High' if score >= 85 else 'Medium'
    else:
        device.classification_evidence = f'Insufficient evidence for {kind}: ' + device.classification_evidence
