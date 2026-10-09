"""Windows IPv4 ICMP without launching a subprocess for each host.

Only a successful echo from the requested address proves reachability.
The fixed reply prefix avoids pointer-layout differences between Win32/Win64.
Every call owns and closes its own native handle; no shared reply buffers.
"""
import ctypes
from functools import lru_cache
import ipaddress
import socket
import struct


@lru_cache(maxsize=1)
def _api():
    api = ctypes.WinDLL('iphlpapi.dll', use_last_error=True)
    api.IcmpCreateFile.argtypes = []
    api.IcmpCreateFile.restype = ctypes.c_void_p
    api.IcmpCloseHandle.argtypes = [ctypes.c_void_p]
    api.IcmpCloseHandle.restype = ctypes.c_int
    api.IcmpSendEcho.argtypes = [ctypes.c_void_p, ctypes.c_uint32, ctypes.c_void_p,
        ctypes.c_uint16, ctypes.c_void_p, ctypes.c_void_p, ctypes.c_uint32, ctypes.c_uint32]
    api.IcmpSendEcho.restype = ctypes.c_uint32
    return api


def ping_ipv4(ip: str, timeout_ms: int = 500) -> bool:
    ip = str(ipaddress.IPv4Address(ip))
    if not 1 <= timeout_ms <= 5000:
        raise ValueError('ICMP timeout must be between 1 and 5000 ms')
    api = _api()
    handle = api.IcmpCreateFile()
    if handle in (None, 0, ctypes.c_void_p(-1).value):
        raise OSError('Windows ICMP handle unavailable')
    try:
        payload = ctypes.create_string_buffer(b'IPscans4')
        reply = ctypes.create_string_buffer(256)
        destination = struct.unpack('<I', socket.inet_aton(ip))[0]
        count = api.IcmpSendEcho(handle, destination, payload, 8, None, reply,
                                 len(reply), timeout_ms)
        if not count:
            return False
        address, status = struct.unpack_from('<II', reply.raw)
        return status == 0 and address == destination
    finally:
        api.IcmpCloseHandle(handle)
