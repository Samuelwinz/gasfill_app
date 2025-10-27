@echo off
echo Starting GasFill Payment Server...
echo.
cd /d "%~dp0"
node local-payment-server.js
pause
