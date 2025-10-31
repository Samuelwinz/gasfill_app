# Payout Enhancement - Custom Amount Feature

## ✅ Implementation Complete

The payout system has been enhanced to allow riders to request custom payout amounts instead of only being able to request their full available balance.

## Changes Made

### 1. Frontend Changes (RiderEarningsScreen.tsx)

#### Updated `requestPayout()` Function
- **Before**: Simple confirmation dialog requesting full available balance
- **After**: Interactive Alert.prompt with three options:
  1. **Cancel** - Dismiss the dialog
  2. **Request Full Amount** - Request entire available balance
  3. **Request Custom** - Enter a specific amount

#### Custom Amount Input Features
```typescript
Alert.prompt(
  'Request Payout',
  `Available balance: ₵${availableBalance.toFixed(2)}\n\nEnter payout amount (minimum ₵100.00):`,
  [
    { text: 'Cancel', style: 'cancel' },
    { 
      text: 'Request Full Amount', 
      onPress: () => handleRequestPayout(availableBalance) 
    },
    { 
      text: 'Request Custom', 
      onPress: (amountText) => {
        // Validate and request custom amount
      }
    }
  ],
  'plain-text',
  '',
  'numeric' // Numeric keyboard for easy input
);
```

#### Validation Rules
- ✅ Numeric input only
- ✅ Minimum: ₵100.00 (increased from ₵50.00)
- ✅ Maximum: Available balance
- ✅ Clear error messages for invalid inputs

#### Updated `handleUpdatePayoutAmount()` Function
- Minimum payout validation updated from ₵50 to ₵100
- Error message: "Minimum payout amount is ₵100.00"

### 2. Backend Changes (python_server.py)

#### POST /api/rider/payment-request (Lines 3658-3662)
```python
# Validate minimum payout amount
if payment.amount < 100:  # Changed from 50 to 100
    raise HTTPException(
        status_code=400, 
        detail="Minimum payout amount is ₵100.00"  # Updated message
    )
```

#### PUT /api/rider/payment-request/{request_id} (Lines 3553-3558)
```python
# Validate new amount
if payment_update.amount < 100:  # Changed from 50 to 100
    raise HTTPException(
        status_code=400, 
        detail="Minimum payout amount is ₵100.00"  # Updated message
    )
```

## User Flow

### Scenario 1: Full Payout Request
1. Rider taps "Request Payout" button
2. Dialog shows available balance
3. Rider taps "Request Full Amount"
4. System creates payout request for full balance
5. Success message displayed

### Scenario 2: Custom Payout Request
1. Rider taps "Request Payout" button
2. Dialog shows available balance and minimum amount
3. Rider taps "Request Custom"
4. Numeric input field appears
5. Rider enters desired amount (e.g., ₵150.00)
6. System validates:
   - Amount ≥ ₵100.00 ✓
   - Amount ≤ Available balance ✓
7. Payout request created
8. Remaining balance stays as pending earnings

### Scenario 3: Invalid Custom Amount
**Case A: Below Minimum**
- Input: ₵50.00
- Error: "Minimum payout amount is ₵100.00"

**Case B: Exceeds Available Balance**
- Available: ₵150.00
- Input: ₵200.00
- Error: "Amount exceeds available balance of ₵150.00"

**Case C: Invalid Input**
- Input: "abc" or empty
- Error: "Please enter a valid amount"

## Benefits

### For Riders
1. **Flexibility**: Request partial payouts while keeping some earnings pending
2. **Financial Control**: Better manage cash flow and earnings
3. **Convenience**: Quick access to needed funds without draining balance
4. **Clear Limits**: Transparent minimum requirements (₵100)

### For Business
1. **Reduced Processing**: Fewer small payout requests
2. **Better Cash Flow**: Higher minimum ensures viable transactions
3. **User Satisfaction**: Riders appreciate the flexibility
4. **Transaction Efficiency**: Minimum ₵100 reduces processing overhead

## Technical Details

### Files Modified
1. `gasfill-mobile/screens/RiderEarningsScreen.tsx`
   - Lines 207-244: Enhanced `requestPayout()` with Alert.prompt
   - Lines 147-159: Updated `handleUpdatePayoutAmount()` validation

2. `gasfill_app/python_server.py`
   - Lines 3658-3662: Updated minimum validation in create endpoint
   - Lines 3553-3558: Updated minimum validation in update endpoint

### API Endpoints
- **POST /api/rider/payment-request**: Create new payout request
- **PUT /api/rider/payment-request/{id}**: Update pending request amount
- **GET /api/rider/payment-requests**: List all payout requests

### Database Schema
No schema changes required - uses existing `pending_payments_db` structure:
```python
{
    "id": int,
    "rider_id": int,
    "amount": float,  # Now can be partial amount
    "payment_method": str,
    "status": str,  # pending, approved, rejected
    "created_at": str,
    "processed_at": str
}
```

## Testing Recommendations

### Test Cases
1. ✅ Request with balance < ₵100 (should block payout)
2. ✅ Request full amount when balance ≥ ₵100
3. ✅ Request custom amount = ₵100 (minimum edge case)
4. ✅ Request custom amount between ₵100 and available
5. ✅ Request custom amount > available (should error)
6. ✅ Request custom amount < ₵100 (should error)
7. ✅ Invalid input (non-numeric, empty)
8. ✅ Multiple partial payouts (cumulative < total earnings)
9. ✅ Update existing pending request amount
10. ✅ Cancel payout dialog

### Manual Testing Steps
```bash
# 1. Login as rider
# 2. Complete deliveries to earn ₵250
# 3. Tap "Request Payout"
# 4. Try "Request Custom" with ₵150
# 5. Verify ₵150 payout request created
# 6. Check pending earnings shows ₵100 remaining
# 7. Request another payout for ₵50 (should fail - minimum ₵100)
# 8. Request ₵100 more (should succeed)
```

## Example Use Cases

### Use Case 1: Emergency Cash
- Total Earnings: ₵500
- Immediate Need: ₵200
- **Action**: Request ₵200 custom payout
- **Result**: Get ₵200, keep ₵300 pending for later

### Use Case 2: Regular Withdrawals
- Total Earnings: ₵1000
- **Week 1**: Request ₵300
- **Week 2**: Request ₵400
- **Week 3**: Request ₵300 (full remaining)
- **Benefit**: Spread out withdrawals as needed

### Use Case 3: Minimum Not Met
- Total Earnings: ₵80
- **Action**: Tap "Request Payout"
- **Result**: Cannot proceed, need ₵20 more to reach minimum

## Future Enhancements

### Suggested Features
1. **Quick Amount Buttons**: Add 25%, 50%, 75%, 100% buttons
2. **Payout History**: Show recent payout requests in earnings screen
3. **Remaining Balance Preview**: Show "After payout: ₵X.XX" before confirmation
4. **Notification**: Email/SMS when payout is processed
5. **Recurring Payouts**: Schedule automatic payouts (e.g., weekly ₵200)
6. **Payout Analytics**: Track payout patterns and frequency

### Potential UI Improvements
```typescript
// Quick amount selection
const quickAmounts = [
  { label: '25%', value: availableBalance * 0.25 },
  { label: '50%', value: availableBalance * 0.50 },
  { label: '75%', value: availableBalance * 0.75 },
  { label: '100%', value: availableBalance }
];
```

## Configuration

### Current Settings
```typescript
const MINIMUM_PAYOUT = 100;  // ₵100.00
const CURRENCY_SYMBOL = '₵';
const PAYMENT_METHODS = ['bank_transfer', 'mobile_money'];
```

### Adjusting Minimum
To change the minimum payout amount:

**Frontend** (`RiderEarningsScreen.tsx`):
```typescript
// Line ~148 and ~223
if (customAmount < 100) {  // Change this value
```

**Backend** (`python_server.py`):
```python
# Lines 3658 and 3553
if payment.amount < 100:  # Change this value
```

## Status

- ✅ Frontend implementation complete
- ✅ Backend validation updated
- ✅ Server restarted with changes
- ✅ Ready for testing
- ⏳ Awaiting production deployment

## Version
- **Feature**: Custom Payout Amount
- **Minimum**: ₵100.00
- **Implemented**: January 2025
- **Status**: Complete

---

**Note**: This enhancement maintains backward compatibility. Riders can still request their full balance with one tap, while now having the flexibility to request custom amounts when needed.
