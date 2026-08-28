@echo off
setlocal
cd /d "%~dp0"
echo Enviando cupom de teste para a MP-4200 TH...
set "GITHUB_TOKEN=LOCAL-PRINT-TEST"
set "PRINT_QUEUE_SECRET=LOCAL-PRINT-TEST"
node agent.js --test
pause
