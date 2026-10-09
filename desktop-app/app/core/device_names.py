"""User labels are local metadata, never device configuration."""
import hashlib
import json
from PyQt6.QtCore import QSettings


def clean_name(value: str) -> str:
    value = ' '.join(value.split())
    if len(value) > 80 or any(ord(char) < 32 or ord(char) == 127 for char in value):
        raise ValueError('Use a name of at most 80 characters without control characters.')
    return value


class DeviceNames:
    def __init__(self, settings=None):
        self.settings = settings if settings is not None else QSettings('ipscans', 'DeviceNames')

    @staticmethod
    def _key(scope, identity):
        return hashlib.sha256((scope + '\0' + identity).encode('utf-8')).hexdigest()

    def get(self, scope, device):
        mac = (device.mac or '').lower()
        if mac:
            key = self._key(scope, 'mac:' + mac)
            if self.settings.contains(key):
                try:
                    return clean_name(self.settings.value(key, '', type=str))
                except (ValueError, TypeError, AttributeError):
                    return ''
        raw = self.settings.value(self._key(scope, 'ip:' + device.ip), '', type=str)
        try:
            record = json.loads(raw)
            # A name with known hardware identity must not be shown on another device.
            if record.get('mac') and record['mac'] != mac:
                return ''
            return clean_name(record['name'])
        except (ValueError, TypeError, KeyError, AttributeError):
            return ''

    def set(self, scope, device, name):
        name = clean_name(name)
        mac = (device.mac or '').lower()
        self.settings.setValue(self._key(scope, 'ip:' + device.ip), json.dumps({'name': name, 'mac': mac}))
        if mac:
            self.settings.setValue(self._key(scope, 'mac:' + mac), name)
        self.settings.sync()
        if self.settings.status() != QSettings.Status.NoError:
            raise OSError('The device name could not be saved.')
        return name
