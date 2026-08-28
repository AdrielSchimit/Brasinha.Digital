@echo off
setlocal
cd /d "%~dp0"
title Brasinha Print Agent - Remover inicializacao

call stop.bat
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "BrasinhaPrintAgent" /f >nul 2>nul

echo.
echo Inicializacao automatica removida deste usuario do Windows.
echo Os arquivos e configuracoes do Brasinha continuam nesta pasta.
echo.
pause
