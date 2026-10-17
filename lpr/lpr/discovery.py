"""Bounded IPv4 WS-Discovery probe; discovery never sends camera credentials."""
from dataclasses import dataclass
import ipaddress
import socket
import time
import uuid
from urllib.parse import urlsplit,unquote
import xml.etree.ElementTree as ET
from .onvif import SOAP,parse_response,OnvifError

DISCOVERY='http://schemas.xmlsoap.org/ws/2005/04/discovery'
ADDRESSING='http://schemas.xmlsoap.org/ws/2004/08/addressing'


@dataclass(frozen=True)
class DiscoveredCamera:
    identity:str
    name:str
    endpoint:str


def probe_message(identity):
    root=ET.Element('{'+SOAP+'}Envelope',{'xmlns:dn':'http://www.onvif.org/ver10/network/wsdl'})
    header=ET.SubElement(root,'{'+SOAP+'}Header')
    for name,value in [('MessageID',identity),('To','urn:schemas-xmlsoap-org:ws:2005:04:discovery'),('Action',DISCOVERY+'/Probe')]:
        ET.SubElement(header,'{'+ADDRESSING+'}'+name).text=value
    reply=ET.SubElement(header,'{'+ADDRESSING+'}ReplyTo')
    ET.SubElement(reply,'{'+ADDRESSING+'}Address').text=ADDRESSING+'/role/anonymous'
    body=ET.SubElement(root,'{'+SOAP+'}Body');probe=ET.SubElement(body,'{'+DISCOVERY+'}Probe')
    ET.SubElement(probe,'{'+DISCOVERY+'}Types').text='dn:NetworkVideoTransmitter'
    return ET.tostring(root,encoding='utf-8',xml_declaration=True)


def parse_matches(data,sender,identity):
    if len(data)>65507:return []
    root=parse_response(data)
    if root.findtext('./{'+SOAP+'}Header/{'+ADDRESSING+'}RelatesTo')!=identity:return []
    results=[]
    for match in root.findall('./{'+SOAP+'}Body/{'+DISCOVERY+'}ProbeMatches/{'+DISCOVERY+'}ProbeMatch')[:64]:
        reference=match.findtext('./{'+ADDRESSING+'}EndpointReference/{'+ADDRESSING+'}Address','')
        if not reference or len(reference)>256:continue
        name=sender
        for scope in match.findtext('{'+DISCOVERY+'}Scopes','').split()[:64]:
            prefix='onvif://www.onvif.org/name/'
            if scope.startswith(prefix):name=unquote(scope[len(prefix):])[:120]
        for address in match.findtext('{'+DISCOVERY+'}XAddrs','').split()[:8]:
            try:
                parts=urlsplit(address)
                if len(address)>2048 or parts.scheme not in ('http','https') or parts.username or parts.password or parts.fragment:continue
                # Discovery is unauthenticated: don't follow an advertised host
                # that differs from the responder, even after user selection.
                if ipaddress.ip_address(parts.hostname)!=ipaddress.ip_address(sender):continue
                if parts.port is not None and not 1<=parts.port<=65535:continue
                results.append(DiscoveredCamera(reference,name,address))
            except ValueError:continue
    return results


def discover_cameras(seconds=3,*,interface='0.0.0.0',cancel=None):
    if not 0<seconds<=10:raise ValueError('Invalid discovery duration')
    ipaddress.IPv4Address(interface)
    identity='urn:uuid:'+str(uuid.uuid4());payload=probe_message(identity)
    found={};packets=0;started=time.monotonic();sent=0
    with socket.socket(socket.AF_INET,socket.SOCK_DGRAM,socket.IPPROTO_UDP) as connection:
        connection.setsockopt(socket.IPPROTO_IP,socket.IP_MULTICAST_TTL,1)
        if interface!='0.0.0.0':connection.setsockopt(socket.IPPROTO_IP,socket.IP_MULTICAST_IF,socket.inet_aton(interface))
        connection.bind((interface,0))
        while time.monotonic()-started<seconds and packets<512 and len(found)<64:
            if cancel is not None and cancel.is_set():break
            elapsed=time.monotonic()-started
            if sent<3 and elapsed>=(0,.5,1.5)[sent]:
                connection.sendto(payload,('239.255.255.250',3702));sent+=1
            connection.settimeout(min(.2,max(.001,seconds-elapsed)))
            try:data,sender=connection.recvfrom(65508)
            except socket.timeout:continue
            packets+=1
            try:matches=parse_matches(data,sender[0],identity)
            except OnvifError:continue
            for device in matches:
                found[device.identity,device.endpoint]=device
                if len(found)>=64:break
    return sorted(found.values(),key=lambda device:(device.name,device.endpoint))
