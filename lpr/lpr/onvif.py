"""Read-only ONVIF Media1 profile discovery for an explicitly selected camera.

No camera settings are changed. Endpoints cannot redirect credentials to a
different host. This is not WS-Discovery multicast or ONVIF certification.
"""
import base64
from dataclasses import dataclass,field
from datetime import datetime,timezone
import hashlib
import secrets
import xml.etree.ElementTree as ET
from urllib.error import HTTPError,URLError
from urllib.parse import urlsplit,urlunsplit,quote
from urllib.request import Request,build_opener,ProxyHandler,HTTPPasswordMgrWithDefaultRealm,HTTPDigestAuthHandler
from .devices import host_name,NoRedirect

SOAP='http://www.w3.org/2003/05/soap-envelope'
DEVICE='http://www.onvif.org/ver10/device/wsdl'
MEDIA='http://www.onvif.org/ver10/media/wsdl'
SCHEMA='http://www.onvif.org/ver10/schema'
WSSE='http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd'
WSU='http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd'
TOKEN='http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0'
ENCODING='http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary'


class OnvifError(ValueError):pass


def parse_response(data):
    try:text=data.decode('utf-8-sig')
    except UnicodeDecodeError:raise OnvifError('Unsupported ONVIF XML encoding') from None
    if len(data)>1024*1024 or '<!DOCTYPE' in text.upper() or '<!ENTITY' in text.upper():
        raise OnvifError('Unsafe or oversized ONVIF response')
    try:root=ET.fromstring(text)
    except ET.ParseError:raise OnvifError('Invalid ONVIF XML') from None
    if root.find('.//{'+SOAP+'}Fault') is not None:
        raise OnvifError('ONVIF request rejected; check camera account, clock and service support')
    return root


def envelope(operation,username,password):
    root=ET.Element('{'+SOAP+'}Envelope')
    header=ET.SubElement(root,'{'+SOAP+'}Header')
    security=ET.SubElement(header,'{'+WSSE+'}Security',{'{'+SOAP+'}mustUnderstand':'true'})
    token=ET.SubElement(security,'{'+WSSE+'}UsernameToken')
    ET.SubElement(token,'{'+WSSE+'}Username').text=username
    nonce=secrets.token_bytes(20)
    created=datetime.now(timezone.utc).isoformat(timespec='seconds').replace('+00:00','Z')
    digest=base64.b64encode(hashlib.sha1(nonce+created.encode()+password.encode()).digest()).decode()
    ET.SubElement(token,'{'+WSSE+'}Password',{'Type':TOKEN+'#PasswordDigest'}).text=digest
    ET.SubElement(token,'{'+WSSE+'}Nonce',{'EncodingType':ENCODING}).text=base64.b64encode(nonce).decode()
    ET.SubElement(token,'{'+WSU+'}Created').text=created
    ET.SubElement(root,'{'+SOAP+'}Body').append(operation)
    return ET.tostring(root,encoding='utf-8',xml_declaration=True)


@dataclass(frozen=True)
class MediaProfile:
    token:str=field(repr=False)
    name:str
    encoding:str
    width:int
    height:int


class OnvifClient:
    def __init__(self,host,port,username,password,*,https=False,timeout=3,device_path='/onvif/device_service'):
        host=host_name(host)
        if type(port)!=int or not 1<=port<=65535 or not username or not 0<timeout<=10:
            raise OnvifError('Invalid ONVIF connection settings')
        if not device_path.startswith('/') or device_path.startswith('//') or len(device_path)>1024 or any(ord(c)<33 for c in device_path) or '#' in device_path:
            raise OnvifError('Invalid ONVIF service path')
        self.endpoint=f'{"https" if https else "http"}://{host}:{port}{device_path}'
        self.host=urlsplit(self.endpoint).hostname
        self.username,self.password,self.timeout=username,password,timeout
        self.media_endpoint=None

    def _endpoint(self,address):
        parts=urlsplit(address)
        if parts.scheme not in ('http','https') or parts.hostname!=self.host or parts.username or parts.password or parts.fragment:
            raise OnvifError('Camera returned an unexpected service endpoint')
        if urlsplit(self.endpoint).scheme=='https' and parts.scheme!='https':
            raise OnvifError('Camera service attempted an HTTPS downgrade')
        return address

    def _request(self,address,namespace,method,operation):
        address=self._endpoint(address)
        passwords=HTTPPasswordMgrWithDefaultRealm();passwords.add_password(None,address,self.username,self.password)
        opener=build_opener(ProxyHandler({}),NoRedirect(),HTTPDigestAuthHandler(passwords))
        action=namespace+'/'+method
        request=Request(address,envelope(operation,self.username,self.password),
                        headers={'Content-Type':'application/soap+xml; charset=utf-8; action="'+action+'"','SOAPAction':'"'+action+'"'})
        try:
            with opener.open(request,timeout=self.timeout) as response:data=response.read(1024*1024+1)
        except HTTPError as error:
            error.close()
            if error.code in (401,403):raise OnvifError('ONVIF authentication failed') from None
            raise OnvifError('ONVIF HTTP request failed') from None
        except (URLError,OSError,ValueError):raise OnvifError('ONVIF service unreachable or response refused') from None
        return parse_response(data)

    def profiles(self):
        request=ET.Element('{'+DEVICE+'}GetCapabilities')
        ET.SubElement(request,'{'+DEVICE+'}Category').text='Media'
        root=self._request(self.endpoint,DEVICE,'GetCapabilities',request)
        address=root.findtext('.//{'+SCHEMA+'}Media/{'+SCHEMA+'}XAddr')
        if not address:raise OnvifError('Camera did not advertise a Media1 service')
        self.media_endpoint=self._endpoint(address)
        root=self._request(self.media_endpoint,MEDIA,'GetProfiles',ET.Element('{'+MEDIA+'}GetProfiles'))
        profiles=[]
        for item in root.findall('.//{'+MEDIA+'}Profiles'):
            token=item.get('token','')
            if not token or len(token)>256 or any(p.token==token for p in profiles):raise OnvifError('Invalid profile token')
            encoder=item.find('{'+SCHEMA+'}VideoEncoderConfiguration')
            if encoder is None:continue
            try:
                width=int(encoder.findtext('./{'+SCHEMA+'}Resolution/{'+SCHEMA+'}Width','0'))
                height=int(encoder.findtext('./{'+SCHEMA+'}Resolution/{'+SCHEMA+'}Height','0'))
            except ValueError:raise OnvifError('Invalid profile resolution') from None
            if not 1<=width<=16384 or not 1<=height<=16384:raise OnvifError('Invalid profile resolution')
            profiles.append(MediaProfile(token,item.findtext('{'+SCHEMA+'}Name','Profile')[:120],
                                         encoder.findtext('{'+SCHEMA+'}Encoding','Unknown')[:32],width,height))
            if len(profiles)>64:raise OnvifError('Too many camera profiles')
        if not profiles:raise OnvifError('No usable video profiles')
        return profiles

    def stream_uri(self,profile):
        if self.media_endpoint is None:raise OnvifError('Discover profiles first')
        request=ET.Element('{'+MEDIA+'}GetStreamUri')
        setup=ET.SubElement(request,'{'+MEDIA+'}StreamSetup')
        ET.SubElement(setup,'{'+SCHEMA+'}Stream').text='RTP-Unicast'
        transport=ET.SubElement(setup,'{'+SCHEMA+'}Transport')
        ET.SubElement(transport,'{'+SCHEMA+'}Protocol').text='RTSP'
        ET.SubElement(request,'{'+MEDIA+'}ProfileToken').text=profile.token
        root=self._request(self.media_endpoint,MEDIA,'GetStreamUri',request)
        uri=root.findtext('.//{'+SCHEMA+'}Uri','')
        parts=urlsplit(uri)
        if parts.scheme not in ('rtsp','rtsps') or parts.hostname!=self.host or parts.fragment:
            raise OnvifError('Camera returned an unexpected stream address')
        authority=host_name(parts.hostname)+((':'+str(parts.port)) if parts.port else '')
        auth=quote(self.username,safe='')+':'+quote(self.password,safe='')+'@'
        return urlunsplit((parts.scheme,auth+authority,parts.path,parts.query,''))
