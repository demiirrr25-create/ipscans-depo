@echo off
chcp 65001 >nul
title IPScans Cortex 2.0 Pro — Gelistirici ve Lisans Yonetim Merkezi (Port 8766)
cd /d "%~dp0cortex"
echo [IPScans Cortex Yonetim Merkezi - Port 8766] Baslatiliyor...
python admin_server.py %*
pause
