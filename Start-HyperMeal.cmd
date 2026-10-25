@echo off
cd /d "%~dp0"
echo HyperMeal dashboard: http://127.0.0.1:4180
echo Keep this window open. Press Ctrl+C to stop.
where py >nul 2>nul
if %errorlevel%==0 (py -3 run_local.py) else (python run_local.py)
pause
