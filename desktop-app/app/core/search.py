"""Shared, bounded search grammar for table and topology."""
import ipaddress
import shlex
from functools import lru_cache


@lru_cache(maxsize=128)
def _tokens(query):
    try:
        return tuple(shlex.split(query.lower()[:2048]))
    except ValueError:
        return (query.lower()[:2048],)


def matches_device(device, query: str) -> bool:
    fields = {'ip': device.ip, 'mac': device.mac or '', 'vendor': device.vendor or '',
        'name': device.hostname or device.upnp_friendly_name or '', 'type': device.device_type,
        'source': ' '.join(device.sources), 'confidence': device.classification_confidence,
        'status': device.reachability}
    haystack = ' '.join((*fields.values(), device.onvif_model or '', device.model or '', device.http_title or '', device.http_server or '',
        device.onvif_manufacturer or '', ' '.join(map(str, device.open_ports)))).lower()
    def match(token):
        key, sep, value = token.partition(':')
        if sep and key == 'port':
            return value.isdigit() and int(value) in device.open_ports
        if sep and key == 'ip' and '/' in value:
            try:
                return ipaddress.ip_address(device.ip) in ipaddress.ip_network(value, strict=False)
            except ValueError:
                return False
        if sep and key == 'ip':
            try:
                return ipaddress.ip_address(device.ip) == ipaddress.ip_address(value)
            except ValueError:
                return bool(value) and value in device.ip
        if sep and key in fields:
            return bool(value) and value in fields[key].lower()
        return token in haystack
    return all(not match(token[1:]) if token.startswith('-') else match(token)
               for token in _tokens(query))
