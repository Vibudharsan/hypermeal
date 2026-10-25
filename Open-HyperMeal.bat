@echo off
title HyperMeal
cd /d "%~dp0"

rem If HyperMeal is already running, just open it in the browser.
powershell -NoProfile -Command "try { Invoke-WebRequest http://127.0.0.1:4180/api/health -UseBasicParsing -TimeoutSec 2 | Out-Null; exit 0 } catch { exit 1 }"
if %errorlevel%==0 (
    start "" http://127.0.0.1:4180
    exit /b
)

rem Open the browser a few seconds after the server starts.
start "" /b powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep 3; Start-Process http://127.0.0.1:4180"

echo HyperMeal dashboard: http://127.0.0.1:4180
echo Keep this window open. Close it or press Ctrl+C to stop.
where py >nul 2>nul
if %errorlevel%==0 (py -3 run_local.py) else (python run_local.py)
pause
