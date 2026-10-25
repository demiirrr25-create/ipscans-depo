@echo off
chcp 65001 >nul
title IPScans Cortex 2.4.0 — Native Qt Quick 3D Komuta Merkezi
cd /d "%~dp0"
echo [IPScans Cortex 2.4.0] Native PySide6 + Qt Quick 3D Arayuzu Baslatiliyor...
python cortex_desktop.py %*
pause
