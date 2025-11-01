@echo off
echo 🚀 Starting GasFill Payment Server...
echo.
echo 🔑 Using your Paystack test keys:
echo Public: pk_test_8f47d72c938927ad07587345c116684e3ce8266f
echo Secret: sk_test_ef024f3acd90ee6aef29ff0707f868c163dc73a3
echo.
echo 📍 Server will run on: http://localhost:3001
echo 📍 Network access: http://192.168.8.100:3001
echo.
echo 🔄 To test with real Paystack API:
echo 1. Keep this server running
echo 2. In payment.config.ts, update PAYMENT_API_URL to: http://192.168.8.100:3001
echo 3. Set isDemoMode: false
echo 4. Test payments in your app
echo.
echo Press Ctrl+C to stop the server
echo.
cd /d "%~dp0"
node local-payment-server.js
pause