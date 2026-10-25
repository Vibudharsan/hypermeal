@echo off
powershell -NoProfile -File "%~dp0Start-Android-Preview.ps1"
if errorlevel 1 pause
