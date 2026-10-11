import struct
import pytest
from lpr.devices import rtsp_url,modbus_read_request,parse_modbus_reply

def test_camera_profiles_escape_credentials():
    assert rtsp_url('hikvision','192.0.2.1',554,1,'admin','a@:?#')=='rtsp://admin:a%40%3A%3F%23@192.0.2.1:554/Streaming/Channels/101'
    assert rtsp_url('dahua','2001:db8::1',554,2,'u','p').endswith('[2001:db8::1]:554/cam/realmonitor?channel=2&subtype=0')
    with pytest.raises(ValueError):rtsp_url('hikvision','host/path',554,1,'u','p')
    with pytest.raises(ValueError):rtsp_url('dahua','192.0.2.1',554,0,'u','p')

def test_modbus_transaction_validation():
    assert modbus_read_request(42,1,0).hex()=='002a00000006010100000001'
    response=struct.pack('>HHHBBBB',42,0,4,1,1,1,1)
    assert parse_modbus_reply(response,42,1) is True
    for corrupted in (response[:-1],response+b'\x00',response[:7]+b'\x81\x02',response[:9]+b'\xff'):
        with pytest.raises(ValueError):parse_modbus_reply(corrupted,42,1)
    with pytest.raises(ValueError):parse_modbus_reply(response,41,1)
