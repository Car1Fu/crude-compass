@echo off
setlocal
cd /d "%~dp0"

echo Importing market data into SQLite...
python import_market_data.py
if errorlevel 1 (
  echo Market data import failed.
  pause
  exit /b 1
)

echo Checking hedge chat proxy on port 8008...
netstat -ano | findstr ":8008" | findstr "LISTENING" >nul
if errorlevel 1 (
  echo Starting hedge chat proxy...
  start "Hedge Chat Proxy" powershell -NoExit -Command "Set-Location -LiteralPath '%~dp0'; python hedge_chat_proxy.py"
  timeout /t 2 /nobreak >nul
) else (
  echo Hedge chat proxy is already running.
)

start "" "http://127.0.0.1:8008/"
endlocal
