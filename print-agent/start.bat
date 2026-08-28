@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Node.js nao encontrado.
  pause
  exit /b 1
)

if not exist "config.json" (
  echo [ERRO] Configure primeiro o arquivo config.json.
  pause
  exit /b 1
)

start "" /b wscript.exe "%~dp0run-hidden.vbs"
echo Brasinha Print Agent iniciado em segundo plano.
echo Use status.bat para verificar.
timeout /t 2 /nobreak >nul
