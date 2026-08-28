@echo off
powershell.exe -NoProfile -Command "Get-Printer | Select-Object -ExpandProperty Name"
pause
