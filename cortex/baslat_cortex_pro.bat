@echo off
chcp 65001 >nul
title IPScans Cortex 2.0 Pro — Kurumsal Kamera Zekasi ve Saha Otomasyonu
cd /d "%~dp0"
echo [IPScans Cortex 2.0 Pro] Baslatiliyor...
python server.py %*
pause
