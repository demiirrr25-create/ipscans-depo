import socket
from threading import Event
from unittest.mock import patch
import xml.etree.ElementTree as ET
import pytest
from lpr.discovery import probe_message,parse_matches,discover_cameras,DISCOVERY,ADDRESSING,SOAP
from lpr.onvif import OnvifError,OnvifClient


def response(identity='urn:uuid:test',endpoint='http://192.0.2.1:2020/onvif/device_service'):
    return f'''<s:Envelope xmlns:s="{SOAP}" xmlns:a="{ADDRESSING}" xmlns:d="{DISCOVERY}">
    <s:Header><a:RelatesTo>{identity}</a:RelatesTo></s:Header><s:Body><d:ProbeMatches><d:ProbeMatch>
    <a:EndpointReference><a:Address>urn:uuid:camera</a:Address></a:EndpointReference>
    <d:Scopes>onvif://www.onvif.org/name/Test%20camera</d:Scopes><d:XAddrs>{endpoint}</d:XAddrs>
    </d:ProbeMatch></d:ProbeMatches></s:Body></s:Envelope>'''.encode()


def test_correlated_discovery_response_and_endpoint():
    devices=parse_matches(response(),'192.0.2.1','urn:uuid:test')
    assert len(devices)==1 and devices[0].name=='Test camera'
    assert devices[0].endpoint=='http://192.0.2.1:2020/onvif/device_service'
    assert parse_matches(response(),'192.0.2.1','urn:uuid:other')==[]
    assert parse_matches(response(),'192.0.2.2','urn:uuid:test')==[]


@pytest.mark.parametrize('endpoint',['http://192.0.2.2/device','http://user:password@192.0.2.1/device','file:///device','http://192.0.2.1:99999/device'])
def test_discovery_rejects_unexpected_destinations(endpoint):
    assert parse_matches(response(endpoint=endpoint),'192.0.2.1','urn:uuid:test')==[]


def test_probe_has_unique_message_id_and_no_security_header():
    root=ET.fromstring(probe_message('urn:uuid:test'))
    assert root.findtext('./{'+SOAP+'}Header/{'+ADDRESSING+'}MessageID')=='urn:uuid:test'
    assert root.findtext('.//{'+DISCOVERY+'}Types')=='dn:NetworkVideoTransmitter'
    assert b'Password' not in ET.tostring(root)


def test_network_search_deduplicates_and_finishes_at_deadline():
    clock=[0.];sent=[]
    class Socket:
        def __enter__(self):return self
        def __exit__(self,*args):pass
        def setsockopt(self,*args):pass
        def bind(self,*args):pass
        def settimeout(self,*args):pass
        def sendto(self,data,address):sent.append(data)
        def recvfrom(self,size):
            clock[0]+=.1
            identity=ET.fromstring(sent[-1]).findtext('./{'+SOAP+'}Header/{'+ADDRESSING+'}MessageID')
            return response(identity),('192.0.2.1',3702)
    with patch('lpr.discovery.socket.socket',return_value=Socket()),patch('lpr.discovery.time.monotonic',side_effect=lambda:clock[0]):
        found=discover_cameras(1)
    assert len(found)==1 and len(sent)==2 and clock[0]<1.2


def test_discovery_can_be_cancelled_before_sending():
    cancel=Event();cancel.set()
    with patch('lpr.discovery.socket.socket') as factory:
        assert discover_cameras(cancel=cancel)==[]
        factory.return_value.__enter__.return_value.sendto.assert_not_called()


def test_advertised_custom_device_path_is_preserved():
    client=OnvifClient('192.0.2.1',2020,'user','pass',device_path='/custom/device?service=onvif')
    assert client.endpoint=='http://192.0.2.1:2020/custom/device?service=onvif'
    for path in ('//evil/device','/path\nHost:evil','/path#fragment'):
        with pytest.raises(OnvifError):OnvifClient('192.0.2.1',80,'u','p',device_path=path)
