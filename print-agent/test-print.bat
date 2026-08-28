@echo off
cd /d "%~dp0"
echo Enviando cupom de teste...
node agent.js --test
pause
