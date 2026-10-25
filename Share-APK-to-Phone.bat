@echo off
title HyperMeal APK download
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (py -3 tools\share_apk.py) else (python tools\share_apk.py)
pause
