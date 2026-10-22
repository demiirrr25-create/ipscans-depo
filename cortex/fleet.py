"""Recorder discovery and verified ONVIF clock maintenance."""
import datetime as dt
import time
import xml.etree.ElementTree as ET
from onvif import OnvifClient, DEVICE, SCHEMA, OnvifError
from devices import host_name

def settings(data):
    host=str(data.get('host','')).strip(); host_name(host)
    port=int(data.get('port',80))
    if not 1<=port<=65535: raise ValueError('Port 1–65535 olmalı.')
    username=str(data.get('username',''))
    if not username: raise ValueError('ONVIF kullanıcı adı gerekli.')
    name=str(data.get('name','')).strip()
    if not name or len(name)>100: raise ValueError('Cihaz adı 1–100 karakter olmalı.')
    interval=int(data.get('interval',60))
    if not 5<=interval<=1440: raise ValueError('Eşitleme aralığı 5–1440 dakika olmalı.')
    return dict(name=name,host=host,port=port,username=username,password=str(data.get('password','')),
                https=bool(data.get('https',False)),sync=bool(data.get('sync',False)),interval=interval)

def client(device):
    return OnvifClient(device['host'],device['port'],device['username'],device['password'],https=device['https'])

def discover(device):
    c=client(device); profiles=c.profiles(); groups={}
    for profile in profiles:
        # No source token: keep separate; never silently drop unknown channels.
        key=profile.source or profile.token
        old=groups.get(key)
        if old is None or profile.width*profile.height<old.width*old.height: groups[key]=profile
    channels=[]
    for profile in groups.values():
        try:
            channels.append(dict(token=profile.token,name=profile.name,width=profile.width,height=profile.height,
                                 encoding=profile.encoding,url=c.stream_uri(profile),error=''))
        except OnvifError:
            channels.append(dict(token=profile.token,name=profile.name,error='Bu kanalın yayın adresi alınamadı.'))
    return channels

def read_clock(c):
    root=c._request(c.endpoint,DEVICE,'GetSystemDateAndTime',ET.Element('{'+DEVICE+'}GetSystemDateAndTime'))
    value=root.find('.//{'+SCHEMA+'}SystemDateAndTime')
    # Response wrapper is DEVICE namespace, its child fields use SCHEMA.
    if value is None: value=root.find('.//{'+DEVICE+'}SystemDateAndTime')
    if value is None: raise ValueError('Cihaz saat bilgisi vermedi.')
    utc=value.find('{'+SCHEMA+'}UTCDateTime')
    if utc is None: raise ValueError('Cihaz UTC saat bilgisi vermedi.')
    def number(group,key): return int(utc.findtext('{'+SCHEMA+'}'+group+'/{'+SCHEMA+'}'+key))
    stamp=dt.datetime(number('Date','Year'),number('Date','Month'),number('Date','Day'),
                      number('Time','Hour'),number('Time','Minute'),number('Time','Second'),tzinfo=dt.timezone.utc)
    return stamp.timestamp(),value

def synchronize(device):
    c=client(device); stamp,previous=read_clock(c); drift=stamp-time.time()
    if abs(drift)<=3: return dict(phase='ok',drift=round(drift,1),checked=time.time(),message='Saat doğrulandı.')
    op=ET.Element('{'+DEVICE+'}SetSystemDateAndTime')
    ET.SubElement(op,'{'+DEVICE+'}DateTimeType').text='Manual'
    ET.SubElement(op,'{'+DEVICE+'}DaylightSavings').text=previous.findtext('{'+SCHEMA+'}DaylightSavings','false')
    zone=previous.findtext('{'+SCHEMA+'}TimeZone/{'+SCHEMA+'}TZ')
    if zone:
        ET.SubElement(ET.SubElement(op,'{'+DEVICE+'}TimeZone'),'{'+SCHEMA+'}TZ').text=zone
    now=dt.datetime.now(dt.timezone.utc); utc=ET.SubElement(op,'{'+DEVICE+'}UTCDateTime')
    for group,values in [('Time', [('Hour',now.hour),('Minute',now.minute),('Second',now.second)]),
                         ('Date',[('Year',now.year),('Month',now.month),('Day',now.day)])]:
        parent=ET.SubElement(utc,'{'+SCHEMA+'}'+group)
        for key,value in values: ET.SubElement(parent,'{'+SCHEMA+'}'+key).text=str(value)
    c._request(c.endpoint,DEVICE,'SetSystemDateAndTime',op)
    stamp,_=read_clock(c); after=stamp-time.time()
    if abs(after)>5: raise ValueError('Saat yazıldı ancak doğrulanamadı.')
    return dict(phase='ok',drift=round(after,1),checked=time.time(),message='Saat eşitlendi ve doğrulandı.')
