# Payment Server Debugging Guide

## Current Status
✅ **Payment server is configured and ready to use**

## Server Details
- **Port**: 3001
- **Local URL**: http://localhost:3001
- **Network URL**: http://192.168.8.100:3001
- **Paystack Mode**: Test (using test keys)

## Quick Start

### 1. Start the Payment Server
```bash
cd d:\E\code\gasfil\gasfill_app\backend
node local-payment-server.js
```

Or use the batch file:
```bash
cd d:\E\code\gasfil\gasfill_app\backend
start-payment-server.bat
```

### 2. Verify Server is Running
Open browser to: http://localhost:3001/health

Expected response:
```json
{
  "status": "OK",
  "message": "Payment server is running"
}
```

### 3. Test Payment Flow
```bash
node test-payment-server.js
```

## Mobile App Configuration

The payment config has been updated to:
- **Backend URL**: `http://192.168.8.100:3001`
- **Demo Mode**: Enabled
- **Auto Fallback**: Enabled

File: `gasfill-mobile/src/config/payment.config.ts`

## Common Issues & Solutions

### Issue 1: Port Already in Use
**Error**: `EADDRINUSE: address already in use :::3001`

**Solution**:
```bash
# Find process using port 3001
netstat -ano | findstr :3001

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F

# Or use a different port
PORT=3002 node local-payment-server.js
```

### Issue 2: Cannot Connect from Mobile App
**Error**: Network request failed

**Solutions**:
1. **Check server is running**:
   - Look for "✅ Ready to accept payment requests!" message
   
2. **Verify network IP**:
   ```bash
   ipconfig
   ```
   - Update payment.config.ts if IP changed
   
3. **Check firewall**:
   - Allow Node.js through Windows Firewall
   - Allow port 3001

4. **Test from mobile device**:
   - Open browser on phone
   - Visit: http://192.168.8.100:3001/health
   - Should see: `{"status":"OK",...}`

### Issue 3: Paystack API Errors
**Error**: 401 Unauthorized or API errors

**Solutions**:
1. **Verify Paystack keys**:
   - Check `local-payment-server.js` line 12
   - Current key: `sk_test_ef024f3acd90ee6aef29ff0707f868c163dc73a3`
   
2. **Test keys are valid**:
   - Login to Paystack Dashboard
   - Settings → API Keys & Webhooks
   - Verify test secret key

3. **Check Paystack API status**:
   - Visit: https://status.paystack.com

### Issue 4: CORS Errors
**Error**: CORS policy blocked

**Solution**:
- Server already has CORS enabled
- If still seeing errors, check browser console
- Verify mobile app is using correct URL

## Testing Checklist

- [ ] Server starts without errors
- [ ] Health check returns OK
- [ ] Can initialize payment (test script passes)
- [ ] Can access from mobile device browser
- [ ] Mobile app can connect to server
- [ ] Payment flow works in mobile app

## API Endpoints

### 1. Health Check
```
GET http://localhost:3001/health
```

### 2. Initialize Payment
```
POST http://localhost:3001/api/payments/initialize
Content-Type: application/json

{
  "email": "customer@example.com",
  "amount": 10000,
  "currency": "GHS",
  "reference": "unique_ref_123",
  "channels": ["card", "mobile_money"],
  "metadata": {
    "customer_name": "John Doe"
  }
}
```

### 3. Verify Payment
```
GET http://localhost:3001/api/payments/verify/{reference}
```

## Debugging Steps

1. **Check server logs**:
   - Watch terminal for incoming requests
   - Look for 💳, 🔍, ✅, or ❌ symbols

2. **Test with curl/Postman**:
   ```bash
   curl http://localhost:3001/health
   ```

3. **Run test script**:
   ```bash
   node test-payment-server.js
   ```

4. **Check mobile app logs**:
   - Look for payment-related console.log messages
   - Check network requests in browser dev tools (if using Expo web)

## Production Deployment

When deploying to production:

1. Update `payment.config.ts`:
   - Set `isDemoMode: false`
   - Update `backendUrl` to production URL
   - Use live Paystack keys

2. Secure the server:
   - Add authentication middleware
   - Use HTTPS
   - Rate limiting
   - Input validation

3. Environment variables:
   - Store Paystack secret in .env
   - Don't commit secrets to git

## Support

If issues persist:
1. Check this guide first
2. Review server terminal output
3. Check mobile app console logs
4. Test with curl/Postman
5. Verify Paystack dashboard for test transactions
