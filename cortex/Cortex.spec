from PyInstaller.utils.hooks import collect_all
ffmpeg_data, ffmpeg_binaries, ffmpeg_hidden = collect_all('imageio_ffmpeg')
cv_data, cv_binaries, cv_hidden = collect_all('cv2')
# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['launcher.py'],
    pathex=[],
    binaries=ffmpeg_binaries + cv_binaries,
    datas=[('ui', 'ui'), ('third-party-notices', 'third-party-notices')] + ffmpeg_data + cv_data,
    hiddenimports=ffmpeg_hidden + cv_hidden,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['PySide6'],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='Cortex',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    version='version_info.txt',
    icon=['ui\\cortex.ico'],
)
