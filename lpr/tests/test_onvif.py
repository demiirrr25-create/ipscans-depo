import base64,hashlib
import xml.etree.ElementTree as ET
from unittest.mock import patch
import pytest
from lpr.onvif import OnvifClient,OnvifError,parse_response,envelope,MediaProfile,WSSE,WSU,SCHEMA,MEDIA


def xml(body):return ET.fromstring(body)


def test_wsse_digest_escapes_username_and_does_not_send_plaintext_password():
    data=envelope(ET.Element('operation'),'user<&','private-password')
    assert b'private-password' not in data
    root=ET.fromstring(data)
    assert root.findtext('.//{'+WSSE+'}Username')=='user<&'
    nonce=base64.b64decode(root.findtext('.//{'+WSSE+'}Nonce'))
    created=root.findtext('.//{'+WSU+'}Created')
    expected=base64.b64encode(hashlib.sha1(nonce+created.encode()+b'private-password').digest()).decode()
    assert root.findtext('.//{'+WSSE+'}Password')==expected


@pytest.mark.parametrize('body',[b'<!DOCTYPE a><a/>',b'<!ENTITY a "x"><a/>',b'x'*1048577,b'<broken>', '<a/>'.encode('utf-16')],ids=['doctype','entity','oversized','malformed','utf16'])
def test_invalid_xml_is_refused(body):
    with pytest.raises(OnvifError):parse_response(body)


def test_profiles_and_uri_use_advertised_endpoint_and_escape_credentials():
    client=OnvifClient('192.0.2.1',2020,'u@','p:#')
    caps=xml(f'<r xmlns:t="{SCHEMA}"><t:Media><t:XAddr>http://192.0.2.1:2020/media</t:XAddr></t:Media></r>')
    profiles=xml(f'<r xmlns:m="{MEDIA}" xmlns:t="{SCHEMA}"><m:Profiles token="main"><t:Name>Main</t:Name><t:VideoEncoderConfiguration><t:Encoding>H264</t:Encoding><t:Resolution><t:Width>1920</t:Width><t:Height>1080</t:Height></t:Resolution></t:VideoEncoderConfiguration></m:Profiles></r>')
    uri=xml(f'<r xmlns:t="{SCHEMA}"><t:Uri>rtsp://192.0.2.1:554/stream1</t:Uri></r>')
    with patch.object(client,'_request',side_effect=[caps,profiles,uri]) as call:
        found=client.profiles();assert (found[0].width,found[0].height)==(1920,1080)
        assert client.stream_uri(found[0])=='rtsp://u%40:p%3A%23@192.0.2.1:554/stream1'
        assert call.call_args.args[0]=='http://192.0.2.1:2020/media'
        assert call.call_args.args[3].findtext('{'+MEDIA+'}ProfileToken')=='main'


def test_camera_cannot_redirect_credentials_to_another_host():
    client=OnvifClient('192.0.2.1',80,'user','secret')
    for endpoint in ('http://192.0.2.2/media','http://attacker@192.0.2.1/media','file:///media'):
        with pytest.raises(OnvifError):client._endpoint(endpoint)
    client.media_endpoint='http://192.0.2.1/media'
    uri=xml(f'<r xmlns:t="{SCHEMA}"><t:Uri>rtsp://192.0.2.2/live</t:Uri></r>')
    with patch.object(client,'_request',return_value=uri):
        with pytest.raises(OnvifError):client.stream_uri(MediaProfile('main','Main','H264',1920,1080))
