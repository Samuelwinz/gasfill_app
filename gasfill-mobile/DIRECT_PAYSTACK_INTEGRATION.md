# Direct Paystack Integration

## Overview

The GasFill mobile app now uses **Paystack's API directly** without requiring a backend server. This simplifies deployment and reduces infrastructure costs.

## Architecture

### Before (Backend-Mediated)
```
Mobile App → Backend Server → Paystack API → Paystack Checkout
```

### After (Direct Integration)
```
Mobile App → Paystack API → Paystack Checkout
```

## How It Works

### 1. Payment Initialization
```typescript
// PaystackService.initializePayment()
POST https://api.paystack.co/transaction/initialize
Headers: 
  Authorization: Bearer pk_test_...
Body:
  - email: customer@example.com
  - amount: 10000 (in kobo/pesewas)
  - currency: GHS
  - reference: gasfill_123456789
  - channels: ['card', 'mobile_money', 'bank_transfer']
```

**Response:**
```json
{
  "status": true,
  "data": {
    "authorization_url": "https://checkout.paystack.com/xyz123",
    "access_code": "xyz123",
    "reference": "gasfill_123456789"
  }
}
```

### 2. Payment Page Display
```typescript
// Opens authorization_url in Expo WebBrowser
WebBrowser.openBrowserAsync(authorizationUrl, {
  presentationStyle: 'PAGE_SHEET',
  toolbarColor: '#10b981'
})
```

### 3. Payment Verification
```typescript
// PaystackService.verifyPayment()
GET https://api.paystack.co/transaction/verify/{reference}
Headers:
  Authorization: Bearer pk_test_...
```

**Response:**
```json
{
  "status": true,
  "data": {
    "reference": "gasfill_123456789",
    "amount": 10000,
    "status": "success",
    "paid_at": "2024-01-15T10:30:00Z",
    "customer": {...},
    "channel": "mobile_money"
  }
}
```

## Configuration

### payment.config.ts
```typescript
paystackPublicKey: 'pk_test_8f47d72c938927ad07587345c116684e3ce8266f'
backendUrl: 'https://api.paystack.co' // Direct Paystack API
isDemoMode: false // Using real Paystack integration
```

## Security

### ✅ Safe to Use in Frontend
- **Public Key (pk_test_...)**: Safe to expose in mobile app
- Payment initialization API is designed for frontend use
- No sensitive operations possible with public key

### 🔒 Backend Still Needed For
- **Payment verification** (optional): For critical business logic
- **Webhooks**: Paystack sends notifications to your server
- **Refunds**: Requires secret key
- **Transfer/Payouts**: Requires secret key

## Payment Flow

### Customer Checkout Process

1. **Add to Cart**
   - User adds gas cylinders to cart
   - Cart calculates total

2. **Enter Details**
   - Customer info (name, email, phone)
   - Delivery address
   - Payment method selection

3. **Initialize Payment**
   ```typescript
   const result = await PaystackService.processPayment({
     email: 'customer@example.com',
     amount: 120.50,
     currency: 'GHS',
     reference: 'order_12345',
     metadata: {
       customer_name: 'John Doe',
       order_items: [...],
       delivery_address: '...'
     }
   });
   ```

4. **Paystack Checkout Opens**
   - WebBrowser shows Paystack hosted page
   - Customer enters card or mobile money details
   - Paystack handles PCI compliance

5. **Payment Processing**
   - Paystack processes payment
   - Redirects back to app

6. **Verification**
   - App verifies payment status
   - Creates order in database
   - Shows success/failure screen

## Code Examples

### Basic Payment
```typescript
import PaystackService from './services/paystack';

const handlePayment = async () => {
  try {
    const result = await PaystackService.processPayment({
      email: 'customer@example.com',
      amount: 100.00,
      currency: 'GHS',
      channels: ['card', 'mobile_money'],
      metadata: {
        order_id: '12345',
        customer_name: 'John Doe'
      }
    });

    if (result.success) {
      console.log('Payment successful:', result.reference);
      // Create order, send confirmation, etc.
    } else {
      console.log('Payment failed');
    }
  } catch (error) {
    console.error('Payment error:', error);
  }
};
```

### Mobile Money Payment
```typescript
const result = await PaystackService.processMobileMoneyPayment(
  100.00,           // amount
  '0244123456',     // phone
  'MTN',            // network
  'customer@example.com',
  'order_12345'     // reference
);
```

### Pickup Payment
```typescript
const result = await PaystackService.processPickupPayment(
  150.00,                  // amount
  'customer@example.com',
  'John Doe',
  'pickup_789',            // pickup ID
  '0244123456'             // phone
);
```

## Supported Features

### Payment Channels
- ✅ **Card Payments**: Visa, Mastercard, Verve
- ✅ **Mobile Money**: MTN, Vodafone, AirtelTigo
- ✅ **Bank Transfer**: Ghana banks
- ✅ **USSD**: Bank codes

### Currencies
- ✅ **GHS** (Ghana Cedis) - Default
- ✅ **NGN** (Nigerian Naira)
- ✅ **USD** (US Dollars)

### Countries
- 🇬🇭 **Ghana** (Primary)
- 🇳🇬 **Nigeria**
- 🇿🇦 **South Africa**
- 🇰🇪 **Kenya**

## Testing

### Test Cards
```
Card Number: 4084 0840 8408 4081
CVV: 408
Expiry: Any future date
PIN: 0000
OTP: 123456
```

### Test Mobile Money
```
Network: MTN
Phone: 0551234987
```

### Test Mode
- Use `pk_test_...` keys
- No real money transferred
- Simulate all payment scenarios

## Error Handling

### Common Errors

1. **Invalid Email**
   ```
   Error: Please provide a valid email address
   ```

2. **Invalid Amount**
   ```
   Error: Amount must be between ₵1.00 and ₵1,000,000.00
   ```

3. **Network Error**
   ```
   Error: Network error. Please check your connection
   ```

4. **Payment Failed**
   ```
   Error: Payment was not successful
   ```

### Error Response
```typescript
{
  success: false,
  reference: 'order_12345',
  message: 'Payment declined by issuer'
}
```

## Benefits of Direct Integration

### ✅ Advantages
1. **No Backend Required**: Simpler architecture
2. **Lower Costs**: No server hosting needed
3. **Faster Setup**: No backend deployment
4. **PCI Compliant**: Paystack handles card data
5. **Real-time**: Direct API calls
6. **Mobile Optimized**: Paystack checkout is mobile-friendly

### ⚠️ Considerations
1. **Limited Server Control**: Can't modify payment flow
2. **Webhook Setup**: Need backend for production webhooks
3. **Public Key Exposure**: Acceptable but limits some features
4. **No Custom UI**: Uses Paystack's hosted checkout

## Production Checklist

- [ ] Replace test key with live key: `pk_live_...`
- [ ] Set up webhook endpoint for payment notifications
- [ ] Test all payment channels (card, mobile money, bank)
- [ ] Configure callback URLs correctly
- [ ] Test payment verification flow
- [ ] Set up refund policy
- [ ] Configure supported currencies
- [ ] Test error handling
- [ ] Monitor payment success rates
- [ ] Set up customer support for payment issues

## Webhook Setup (Optional)

For production, set up webhooks to receive payment notifications:

```javascript
// Example webhook endpoint (Node.js/Express)
app.post('/webhook/paystack', (req, res) => {
  const hash = crypto
    .createHmac('sha512', SECRET_KEY)
    .update(JSON.stringify(req.body))
    .digest('hex');
  
  if (hash === req.headers['x-paystack-signature']) {
    const event = req.body;
    
    if (event.event === 'charge.success') {
      // Update order status in database
      const { reference, amount, customer } = event.data;
      updateOrder(reference, 'paid');
    }
  }
  
  res.sendStatus(200);
});
```

## Support

### Paystack Documentation
- API Docs: https://paystack.com/docs/api/
- Integration Guide: https://paystack.com/docs/payments/
- Test Cards: https://paystack.com/docs/payments/test-payments/

### GasFill Implementation
- See: `src/services/paystack.ts`
- Config: `src/config/payment.config.ts`
- Checkout: `src/screens/CheckoutScreen.tsx`

## Next Steps

1. **Test thoroughly** with all payment methods
2. **Monitor payments** in Paystack Dashboard
3. **Set up webhooks** for production
4. **Switch to live keys** when ready
5. **Configure refund policy**
6. **Add customer support** contact info
