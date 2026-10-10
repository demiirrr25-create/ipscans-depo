"""Explicit protocol profiles; no camera-native ANPR or physical relay actuation."""
import ipaddress
import json
import re
import socket
import struct
from urllib.parse import quote,urlsplit
from urllib.request import Request,urlopen,HTTPRedirectHandler,build_opener

def host_name(value):
    if not isinstance(value,str) or not value or value!=value.strip():raise ValueError('Invalid host')
    try:
        ip=ipaddress.ip_address(value)
        return f'[{ip}]' if ip.version==6 else str(ip)
    except ValueError:
        if not re.fullmatch(r'(?=.{1,253}$)[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?',value):raise ValueError('Invalid host')
        return value

def rtsp_url(vendor,host,port,channel,username,password):
    host=host_name(host)
    if type(port)!=int or not 1<=port<=65535 or type(channel)!=int or not 1<=channel<=256:raise ValueError('Invalid channel or port')
    if not username:raise ValueError('Camera user required')
    auth=quote(username,safe='')+':'+quote(password,safe='')
    if vendor=='hikvision':path=f'/Streaming/Channels/{channel}01'
    elif vendor=='dahua':path=f'/cam/realmonitor?channel={channel}&subtype=0'
    else:raise ValueError('Unsupported profile')
    return f'rtsp://{auth}@{host}:{port}{path}'

def modbus_read_request(transaction,unit,coil):
    if not 0<=transaction<=65535 or not 0<=unit<=247 or not 0<=coil<=65535:raise ValueError('Invalid Modbus address')
    return struct.pack('>HHHBBHH',transaction,0,6,unit,1,coil,1)

def parse_modbus_reply(data,transaction,unit):
    if len(data)<8:raise ValueError('Truncated Modbus response')
    tx,protocol,length,uid=struct.unpack('>HHHB',data[:7])
    if tx!=transaction or protocol!=0 or uid!=unit or length!=len(data)-6:raise ValueError('Mismatched Modbus response')
    if len(data)!=10 or data[7:9]!=b'\x01\x01' or data[9] not in (0,1):raise ValueError('Modbus exception or invalid coil value')
    return bool(data[9])

def read_modbus_coil(host,port,unit,coil):
    host_name(host)
    if not 1<=port<=65535:raise ValueError('Invalid port')
    import secrets
    tx=secrets.randbelow(65536);request=modbus_read_request(tx,unit,coil)
    def receive(connection,n):
        result=b''
        while len(result)<n:
            part=connection.recv(n-len(result))
            if not part:raise ValueError('Disconnected Modbus device')
            result+=part
        return result
    with socket.create_connection((host,port),timeout=3) as connection:
        connection.sendall(request)
        header=receive(connection,7);size=struct.unpack('>H',header[4:6])[0]
        if not 2<=size<=254:raise ValueError('Invalid MBAP size')
        return parse_modbus_reply(header+receive(connection,size-1),tx,unit)

class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs):raise ValueError('Device redirect refused')

def read_shelly_switch(host,port,channel):
    host=host_name(host)
    if not 1<=port<=65535 or not 0<=channel<=63:raise ValueError('Invalid Shelly address')
    request=Request(f'http://{host}:{port}/rpc/Switch.GetStatus?id={channel}',headers={'Accept':'application/json'})
    with build_opener(NoRedirect).open(request,timeout=3) as response:
        body=response.read(65537)
    if len(body)>65536:raise ValueError('Oversized device response')
    data=json.loads(body)
    if data.get('id')!=channel or type(data.get('output'))!=bool:raise ValueError('Invalid Shelly status')
    return data['output']
