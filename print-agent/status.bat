@echo off
setlocal
cd /d "%~dp0"
title Brasinha Print Agent - Status

echo ==========================================
echo   BRASINHA PRINT AGENT - STATUS
echo ==========================================

reg query "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "BrasinhaPrintAgent" >nul 2>nul
if errorlevel 1 (
  echo Inicializacao automatica: NAO INSTALADA
) else (
  echo Inicializacao automatica: ATIVA
)

if not exist "agent.pid" (
  echo Processo em segundo plano: PARADO
  echo.
  if exist "logs\agent.log" echo Ultimo log: %~dp0logs\agent.log
  pause
  exit /b 0
)

set /p PID=<agent.pid
tasklist /FI "PID eq %PID%" 2>nul | findstr /R /C:"[ ]%PID%[ ]" >nul
if errorlevel 1 (
  echo Processo em segundo plano: PARADO ^(PID antigo %PID%^)
  del /q agent.pid >nul 2>nul
) else (
  echo Processo em segundo plano: RODANDO ^(PID %PID%^)
)

echo.
if exist "logs\agent.log" (
  echo Ultimas linhas do log:
  echo ------------------------------------------
  powershell -NoProfile -Command "Get-Content -Path '%~dp0logs\agent.log' -Tail 12" 2>nul
)
echo.
pause
