@echo off
setlocal
cd /d "%~dp0"
title Brasinha Print Agent - Instalacao

echo ==========================================
echo   BRASINHA PRINT AGENT - INSTALACAO
echo ==========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Node.js nao foi encontrado neste PC.
  echo Instale Node.js 20+ e execute este arquivo novamente.
  echo.
  pause
  exit /b 1
)

if not exist "config.json" (
  echo [ERRO] O arquivo config.json ainda nao existe.
  echo Copie config.example.json para config.json e configure a impressora e os segredos.
  echo.
  pause
  exit /b 1
)

reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "BrasinhaPrintAgent" /t REG_SZ /d "wscript.exe ""%~dp0run-hidden.vbs""" /f >nul
if errorlevel 1 (
  echo [ERRO] Nao foi possivel configurar a inicializacao automatica.
  pause
  exit /b 1
)

echo [OK] Inicializacao automatica configurada para este usuario do Windows.
echo [OK] O agente vai iniciar invisivel toda vez que este usuario entrar no Windows.
echo.
echo Iniciando agora em segundo plano...
start "" /b wscript.exe "%~dp0run-hidden.vbs"

echo.
echo Instalacao concluida.
echo Para verificar: execute status.bat
echo Para parar: execute stop.bat
echo Para remover do Windows: execute uninstall-autostart.bat
echo.
pause
