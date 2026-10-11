"""Local password verification and Windows per-user DPAPI secret storage."""
import base64
import ctypes
from ctypes import wintypes
import os


def hash_password(password):
    import bcrypt
    raw=password.encode("utf-8")
    if len(password)<12 or len(raw)>72:
        raise ValueError("Password must contain at least 12 characters and at most 72 UTF-8 bytes")
    return bcrypt.hashpw(raw,bcrypt.gensalt(rounds=12)).decode("ascii")


def verify_password(password,encoded):
    import bcrypt
    if len(password.encode("utf-8"))>72:return False
    return bcrypt.checkpw(password.encode("utf-8"),encoded.encode("ascii"))


class Blob(ctypes.Structure):
    _fields_=[("length",wintypes.DWORD),("data",ctypes.POINTER(ctypes.c_ubyte))]


def _dpapi(data,encrypt):
    if os.name!="nt":raise RuntimeError("Windows DPAPI is required for camera credentials")
    buffer=ctypes.create_string_buffer(data)
    incoming=Blob(len(data),ctypes.cast(buffer,ctypes.POINTER(ctypes.c_ubyte)))
    outgoing=Blob()
    crypt=ctypes.WinDLL("crypt32",use_last_error=True)
    kernel=ctypes.WinDLL("kernel32",use_last_error=True)
    kernel.LocalFree.argtypes=[ctypes.c_void_p];kernel.LocalFree.restype=ctypes.c_void_p
    if encrypt:
        function=crypt.CryptProtectData
        function.argtypes=[ctypes.POINTER(Blob),wintypes.LPCWSTR,ctypes.POINTER(Blob),ctypes.c_void_p,ctypes.c_void_p,wintypes.DWORD,ctypes.POINTER(Blob)]
        ok=function(ctypes.byref(incoming),"IPScans LPR camera",None,None,None,1,ctypes.byref(outgoing))
    else:
        function=crypt.CryptUnprotectData
        function.argtypes=[ctypes.POINTER(Blob),ctypes.c_void_p,ctypes.POINTER(Blob),ctypes.c_void_p,ctypes.c_void_p,wintypes.DWORD,ctypes.POINTER(Blob)]
        ok=function(ctypes.byref(incoming),None,None,None,None,1,ctypes.byref(outgoing))
    if not ok:raise OSError("Windows credential protection failed")
    try:return ctypes.string_at(outgoing.data,outgoing.length)
    finally:kernel.LocalFree(outgoing.data)


def protect_secret(value):return base64.b64encode(_dpapi(value.encode("utf-8"),True)).decode("ascii")
def unprotect_secret(value):return _dpapi(base64.b64decode(value,validate=True),False).decode("utf-8")
