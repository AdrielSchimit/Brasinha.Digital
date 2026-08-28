@echo off
setlocal
cd /d "%~dp0"

if not exist "agent.pid" (
  echo Brasinha Print Agent nao parece estar em execucao.
  exit /b 0
)

set /p PID=<agent.pid
if "%PID%"=="" (
  del /q agent.pid >nul 2>nul
  echo PID invalido removido.
  exit /b 0
)

taskkill /PID %PID% /T /F >nul 2>nul
if errorlevel 1 (
  echo O processo %PID% ja estava encerrado.
) else (
  echo Brasinha Print Agent encerrado.
)

del /q agent.pid >nul 2>nul
