"""PyInstaller GUI and isolated worker entry point."""
import os
import sys

def worker_stream(name,handle_id,mode):
    if getattr(sys,name) is not None:return
    if os.name=='nt':
        import ctypes,msvcrt
        kernel=ctypes.WinDLL('kernel32',use_last_error=True)
        kernel.GetStdHandle.argtypes=[ctypes.c_ulong]
        kernel.GetStdHandle.restype=ctypes.c_void_p
        handle=kernel.GetStdHandle(handle_id & 0xffffffff)
        if handle and handle!=ctypes.c_void_p(-1).value:
            try:
                fd=msvcrt.open_osfhandle(handle,os.O_WRONLY|os.O_BINARY)
                setattr(sys,name,os.fdopen(fd,mode,encoding='utf-8',buffering=1))
                return
            except OSError:pass
    setattr(sys,name,open(os.devnull,mode,encoding='utf-8'))

if __name__=='__main__':
    if len(sys.argv)>1 and sys.argv[1]=='--worker':
        worker_stream('stdout',-11,'w');worker_stream('stderr',-12,'w')
        from lpr.cli import main
        raise SystemExit(main(sys.argv[2:]))
    from lpr.application import main
    raise SystemExit(main())
