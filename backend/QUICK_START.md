# 🚀 GasFill Backend - Quick Setup Guide

## ✅ PAYMENT SERVER IS READY!

Your payment server is configured and ready to use with your actual Paystack keys.

---

## 🎯 Option 1: Local Payment Server (Recommended)

**Perfect for testing the mobile app checkout flow!**

### Start the Server:

**Windows (Double-click):**
```
start-local-server.bat
```

**Or run manually:**
```bash
cd backend
node local-payment-server.js
```

### You'll see:
```
🔐 Using Paystack Secret Key: sk_test_ef024f3...
🚀 Payment server running on http://localhost:3000
🔗 Health check: http://localhost:3000/health
💳 Payment endpoint: http://localhost:3000/api/payments/initialize
🔍 Verify endpoint: http://localhost:3000/api/payments/verify/:reference
```

### Test the Server:
```bash
node test-server.js
```

---

## 📋 What You Get:

### Local Payment Server Features:
- ✅ **No database required** - Works immediately
- ✅ **Paystack integration** - Real payment processing
- ✅ **Your actual keys** - Already configured
- ✅ **Payment initialization** - POST `/api/payments/initialize`
- ✅ **Payment verification** - GET `/api/payments/verify/:reference`
- ✅ **Health check** - GET `/health`

### Your Configured Keys:
```
Public:  pk_test_8f47d72c938927ad07587345c116684e3ce8266f
Secret:  sk_test_ef024f3acd90ee6aef29ff0707f868c163dc73a3
```

---

## 🧪 Testing Workflow:

### 1. Start Payment Server
```bash
node local-payment-server.js
```

### 2. Start Mobile App
```bash
cd ../gasfill-mobile
npm start
```

### 3. Test Checkout
1. Add products to cart
2. Go to checkout
3. Fill in customer info
4. Click "Place Order & Pay"
5. Complete Paystack payment
6. ✅ Order created!

---

## 🛠️ Troubleshooting:

### Server won't start?
```bash
# Check if port 3000 is in use
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess

# Or use different port
PORT=3001 node local-payment-server.js
```

### Can't connect from mobile app?
```typescript
// Check config: gasfill-mobile/src/config/payment.config.ts
backendUrl: 'http://localhost:3000'  // ← Must match server port
isDemoMode: false,  // ← Must be false to use real backend
```

### Payment fails?
```bash
# Test Paystack connection
node test-server.js
```

---

## 📁 Files:

- `local-payment-server.js` - Payment server (✅ Ready)
- `test-server.js` - Test script (✅ Ready)
- `start-local-server.bat` - Windows launcher (✅ Ready)
- `.env` - Config with your keys (✅ Ready)

---

## 🎯 Quick Commands:

```bash
# Start payment server
node local-payment-server.js

# Test payment server
node test-server.js

# Check health
Invoke-WebRequest http://localhost:3000/health
```

---

## 🔥 Ready to Go!

Your backend is **FULLY CONFIGURED** and ready to process real payments!

Just run:
```bash
node local-payment-server.js
```

Then test the checkout flow in your mobile app! 🚀
