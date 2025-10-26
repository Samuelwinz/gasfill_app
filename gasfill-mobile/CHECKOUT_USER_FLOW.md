# Checkout Screen User Flow

## Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        PRODUCTS SCREEN                           │
│  User adds items to cart using "Add to Cart" buttons            │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                         CART SCREEN                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Cart (3 items)                                   Clear   │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ 🔷 Gas Cylinder 12kg              [-] 2 [+]  ₵ 240.00   │  │
│  │ 🔷 Gas Cylinder 6kg               [-] 1 [+]  ₵ 100.00   │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ Total:                                        ₵ 340.00   │  │
│  │                                                           │  │
│  │         [Proceed to Checkout]                            │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      CHECKOUT SCREEN                             │
│ ◄ Back    Checkout                                              │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ 🟢 Backend Available ✓                                     │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ 🛒 Order Summary                                           │ │
│ │ ──────────────────────────────────────────────────────────│ │
│ │ Gas Cylinder 12kg                              ₵ 240.00   │ │
│ │ ₵120 × 2                                                   │ │
│ │                                                             │ │
│ │ Gas Cylinder 6kg                               ₵ 100.00   │ │
│ │ ₵100 × 1                                                   │ │
│ │ ─────────────────────────────────────────────────────────│ │
│ │ Subtotal                                       ₵ 340.00   │ │
│ │ Delivery Fee                                   ₵  10.00   │ │
│ │ ══════════════════════════════════════════════════════════│ │
│ │ Total                                          ₵ 350.00   │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ 🚲 Delivery Type                                           │ │
│ │ ──────────────────────────────────────────────────────────│ │
│ │ ◉ Standard Delivery          2-3 business days  ₵10      │ │
│ │ ○ Express Delivery           Same day delivery  ₵25      │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ 👤 Customer Information                                    │ │
│ │ ──────────────────────────────────────────────────────────│ │
│ │ Full Name *                                                │ │
│ │ [John Doe                           ]                      │ │
│ │                                                             │ │
│ │ Email *                                                    │ │
│ │ [john@example.com                  ]                      │ │
│ │                                                             │ │
│ │ Phone Number *                                             │ │
│ │ [+233 XX XXX XXXX                  ]                      │ │
│ │                                                             │ │
│ │ Delivery Address *                                         │ │
│ │ [123 Main Street                   ]                      │ │
│ │ [Accra, Ghana                      ]                      │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ 💳 Payment Method                                          │ │
│ │ ──────────────────────────────────────────────────────────│ │
│ │ ◉ 💳 Card Payment                                          │ │
│ │ ○ 📱 Mobile Money                                          │ │
│ │                                                             │ │
│ │ 🛡️ Secure payment powered by Paystack                     │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ Total Amount                               ₵ 350.00        │ │
│ │                                                             │ │
│ │         [✓ Place Order & Pay]                              │ │
│ └────────────────────────────────────────────────────────────┘ │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PAYSTACK PAYMENT UI                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Paystack Checkout                      │  │
│  │                                                            │  │
│  │  Amount: GHS 350.00                                       │  │
│  │  Email: john@example.com                                  │  │
│  │                                                            │  │
│  │  [Card Payment]  [Mobile Money]                           │  │
│  │                                                            │  │
│  │  Card Number: [________________]                          │  │
│  │  Expiry: [___] CVV: [___]                                │  │
│  │                                                            │  │
│  │  or                                                        │  │
│  │                                                            │  │
│  │  Mobile Money Network: [MTN ▼]                            │  │
│  │  Phone: [________________]                                │  │
│  │                                                            │  │
│  │              [Pay GHS 350.00]                             │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SUCCESS ALERT                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Order Placed Successfully! 🎉                            │  │
│  │                                                            │  │
│  │  Your order #order_1234567890 has been placed and         │  │
│  │  payment confirmed.                                        │  │
│  │                                                            │  │
│  │  Total: ₵350.00                                           │  │
│  │                                                            │  │
│  │  You'll receive updates via email and SMS.                │  │
│  │                                                            │  │
│  │        [View Orders]    [Continue Shopping]               │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                ┌─────────┴─────────┐
                │                   │
                ▼                   ▼
    ┌─────────────────┐   ┌─────────────────┐
    │  ORDERS SCREEN  │   │ PRODUCTS SCREEN │
    │                 │   │                 │
    │  View order     │   │  Continue       │
    │  history and    │   │  shopping       │
    │  track delivery │   │                 │
    └─────────────────┘   └─────────────────┘
```

## Screen Sections Breakdown

### 1. Header
- **Back Button**: Navigate to cart
- **Title**: "Checkout"
- **Clean Design**: Minimal, focused header

### 2. Payment Status Banner
- **Backend Availability**: Green/yellow/red indicator
- **Auto-refresh**: Check backend health
- **User Transparency**: Shows demo/production mode

### 3. Order Summary Card
- **Item List**: All cart products with quantities
- **Price Breakdown**: Subtotal, delivery, total
- **Visual Hierarchy**: Clear pricing display
- **Blue Accent**: Order totals in #1e40af

### 4. Delivery Type Card
- **Radio Selection**: Standard vs Express
- **Cost Display**: Fees shown prominently
- **Time Estimates**: Delivery timeframes
- **Interactive**: Updates total on change

### 5. Customer Information Card
- **Form Fields**: Name, email, phone, address
- **Auto-fill**: Loads saved user data
- **Validation**: Real-time field validation
- **Required Indicators**: Asterisks on labels

### 6. Payment Method Card
- **Payment Options**: Card or Mobile Money
- **Visual Icons**: Clear payment type indicators
- **Security Badge**: Paystack trust indicator
- **Radio Selection**: Choose payment channel

### 7. Fixed Footer
- **Total Display**: Large, prominent amount
- **CTA Button**: Blue "Place Order & Pay"
- **Loading State**: Spinner during processing
- **Disabled State**: Prevents double-submission

## User Interactions

### Form Filling
1. User taps input field
2. Keyboard appears (with KeyboardAvoidingView)
3. User types information
4. Field updates in real-time
5. Moves to next field on return/next

### Delivery Selection
1. User taps delivery option card
2. Radio button fills with blue dot
3. Card border changes to blue (#1e40af)
4. Card background lightens to #eff6ff
5. Total updates with new delivery fee

### Payment Method Selection
1. User taps payment method card
2. Radio button fills
3. Card highlights in blue
4. Icon color changes to blue

### Checkout Process
1. User taps "Place Order & Pay" button
2. Button shows loading spinner
3. Form validation runs
4. If errors: Alert shows specific issue
5. If valid: Paystack UI opens
6. User completes payment
7. On success: Success alert appears
8. Cart is cleared
9. Order is saved
10. User chooses next action

## Color Scheme

### Primary Colors
- **Main Blue**: #1e40af (buttons, totals, accents)
- **Light Blue**: #eff6ff (active backgrounds)
- **Border Blue**: #bfdbfe (active borders)

### Text Colors
- **Primary**: #0f172a (headings, important text)
- **Secondary**: #6b7280 (labels, descriptions)
- **Tertiary**: #9ca3af (placeholders)

### Backgrounds
- **Screen**: #f8fbff (light blue tint)
- **Cards**: #ffffff (white)
- **Inputs**: #f9fafb (very light gray)

### Status Colors
- **Success**: #10b981 (green - payment status)
- **Error**: #ef4444 (red - clear cart button)
- **Warning**: #f59e0b (yellow - backend issues)

## Responsive Design

### Small Screens (320px+)
- ScrollView ensures all content accessible
- Single column layout
- Stacked form fields
- Full-width cards and buttons

### Large Screens (Tablets)
- Same layout (optimized for mobile-first)
- More padding and spacing
- Larger touch targets
- Better readability

### Keyboard Handling
- KeyboardAvoidingView prevents keyboard overlap
- Scroll to focused field
- Proper tab order for form fields
- Return key advances to next field

## Accessibility Features

### Visual
- High contrast text
- Clear labels and instructions
- Visual feedback on interactions
- Icons supplement text labels

### Functional
- Large touch targets (min 44x44pt)
- Clear error messages
- Loading indicators
- Success confirmations

### Navigation
- Back button always available
- Clear action buttons
- Breadcrumb context (Cart → Checkout)
- Multiple exit points after success

## Performance Optimizations

### Loading
- Parallel data loading (cart + user)
- Cached user data pre-fills form
- Fast initial render
- Lazy calculation of totals

### User Feedback
- Immediate visual feedback on taps
- Loading states during operations
- Progress indicators for async tasks
- Optimistic UI updates where safe

### Error Handling
- Graceful degradation
- Clear error messages
- Retry mechanisms
- Offline support with local storage

## Testing Checkpoints

### Visual Testing
- ✅ All sections render correctly
- ✅ Colors match design system
- ✅ Icons display properly
- ✅ Spacing is consistent
- ✅ Shadows and elevations work

### Functional Testing
- ✅ Form validation works
- ✅ Delivery type changes total
- ✅ Payment methods selectable
- ✅ Cart loads correctly
- ✅ User data pre-fills
- ✅ Payment processes successfully
- ✅ Order creates properly
- ✅ Cart clears after checkout
- ✅ Navigation works correctly

### Edge Case Testing
- ✅ Empty cart redirects
- ✅ Invalid email rejected
- ✅ Missing fields caught
- ✅ Payment cancellation handled
- ✅ Backend failure handled
- ✅ Network timeout handled

## Integration Verification

### Storage
- ✅ Loads cart from AsyncStorage
- ✅ Loads user from AsyncStorage
- ✅ Saves order to AsyncStorage
- ✅ Clears cart after success

### Payment
- ✅ Paystack initialization works
- ✅ Payment processing works
- ✅ Payment verification works
- ✅ Demo mode fallback works

### API
- ✅ Order creation via API
- ✅ Fallback to local storage
- ✅ Error handling for API failures

### Navigation
- ✅ Back navigation to Cart
- ✅ Forward navigation to Orders
- ✅ Forward navigation to Products
- ✅ Proper parameter passing
