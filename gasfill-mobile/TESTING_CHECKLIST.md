# End-to-End Testing Checklist - Phase 1

## Pre-Testing Setup
- [x] Backend server running on port 8000
- [ ] Expo development server running
- [ ] Mobile device/emulator connected
- [ ] Clear app data/cache for fresh test

## Test Flow 1: Complete User Journey (Happy Path)

### 1. Authentication - Login
- [ ] Open app to LoginScreen
- [ ] Test "Demo User" quick login button
- [ ] Verify successful login toast message
- [ ] Verify navigation to HomeScreen
- [ ] Verify user state persists in ProfileScreen

**Expected Result:**
- Toast: "Login successful!"
- User navigates to Products/Home screen
- Profile shows logged-in user details

### 2. Product Selection
- [ ] Navigate to ProductsScreen
- [ ] View available products (6kg, 12.5kg, 15kg cylinders)
- [ ] Select a cylinder size (tap on card)
- [ ] Verify selection highlight (border changes)
- [ ] Tap "Order Now" button

**Expected Result:**
- Selected product card shows blue border
- Toast: "Added to cart!"
- Navigates to CartScreen after 1 second

### 3. Cart Management
- [ ] Verify cart shows correct item
- [ ] Check item name and price display
- [ ] Test quantity increase (+) button
- [ ] Test quantity decrease (-) button
- [ ] Verify total price updates correctly
- [ ] Test remove item button (trash icon)
- [ ] Re-add item from ProductsScreen
- [ ] Tap "Proceed to Checkout" button

**Expected Result:**
- Cart displays item with correct details
- Quantity changes reflected in total
- Can add/remove items
- Navigation to CheckoutScreen works

### 4. Checkout Process
- [ ] Verify cart items appear in order summary
- [ ] Check customer info pre-filled (if logged in)
- [ ] Verify delivery options (Standard/Express)
- [ ] Check delivery fee calculation
- [ ] Verify total amount (subtotal + delivery)
- [ ] Select payment method (Card/Mobile Money)
- [ ] Fill in any missing customer details
- [ ] Tap "Place Order" button

**Expected Result:**
- All form fields validated
- Payment processing initiated
- Success alert shown with order ID
- Cart cleared after successful order
- Navigation options: "View Orders" or "Continue Shopping"

### 5. Order History
- [ ] Navigate to OrderHistoryScreen
- [ ] Verify new order appears in list
- [ ] Check order details (ID, date, items, total)
- [ ] Verify order status badge
- [ ] Test filter tabs (All, Delivered, On the Way, Cancelled)
- [ ] Test pull-to-refresh

**Expected Result:**
- Order shows with correct details
- Status displays properly with colored badge
- Filters work correctly
- Refresh loads latest orders

## Test Flow 2: Authentication - Registration
- [ ] Tap "Register" from LoginScreen
- [ ] Enter new user details
- [ ] Submit registration form
- [ ] Verify success toast
- [ ] Verify auto-navigation to main app

**Expected Result:**
- Registration succeeds
- User automatically logged in
- Navigates to HomeScreen

## Test Flow 3: Logout & Re-Login
- [ ] Navigate to ProfileScreen
- [ ] Tap "Logout" button
- [ ] Confirm logout in dialog
- [ ] Verify navigation back to LoginScreen
- [ ] Login again with same credentials
- [ ] Verify previous orders still visible

**Expected Result:**
- Logout clears auth state
- Re-login restores user session
- Orders persist in local storage

## Test Flow 4: Demo Mode (Backend Unavailable)
- [ ] Stop backend server
- [ ] Attempt login
- [ ] Verify demo mode activation
- [ ] Test product selection in demo mode
- [ ] Add to cart
- [ ] Complete checkout (local storage)
- [ ] Verify order saved locally
- [ ] Check OrderHistoryScreen shows local order

**Expected Result:**
- Demo mode activates automatically on timeout
- All features work with local storage
- Orders marked as "local_*" IDs
- Success messages indicate local mode

## Test Flow 5: Error Handling
- [ ] Enter invalid email format in login
- [ ] Enter wrong password
- [ ] Leave required checkout fields empty
- [ ] Test with empty cart (navigate to checkout)
- [ ] Test network timeout scenarios

**Expected Result:**
- Validation errors shown
- Toast messages for errors
- ErrorDisplay component shown where appropriate
- User can retry failed operations

## Test Flow 6: Loading States
- [ ] Verify loading spinner on app launch
- [ ] Check loading during login/register
- [ ] Verify loading when fetching orders
- [ ] Check loading during checkout

**Expected Result:**
- Loading component shows consistently
- No blank screens during data fetching
- Smooth transitions between states

## Test Flow 7: Cart Persistence
- [ ] Add items to cart
- [ ] Close app completely
- [ ] Reopen app
- [ ] Check cart still has items

**Expected Result:**
- Cart items persist in AsyncStorage
- Cart restored on app reopen

## Test Flow 8: Multiple Items Checkout
- [ ] Add 12.5kg cylinder (qty: 2)
- [ ] Add 6kg cylinder (qty: 1)
- [ ] Go to cart
- [ ] Verify both items shown
- [ ] Adjust quantities
- [ ] Proceed to checkout
- [ ] Complete order with multiple items

**Expected Result:**
- Multiple items handled correctly
- Total calculation accurate
- All items appear in order history

## Performance Checks
- [ ] App launch time < 3 seconds
- [ ] Navigation transitions smooth
- [ ] No memory leaks (check after multiple operations)
- [ ] Toast messages auto-dismiss correctly
- [ ] No console errors in terminal

## Known Issues to Document
- API timeout configured to 5 seconds for demo fallback
- Android emulator requires 10.0.2.2 IP (physical devices need actual IP)
- Payment integration uses mock service (PaystackService)

## Success Criteria
- ✅ All test flows complete without crashes
- ✅ Data persists correctly
- ✅ Error handling works gracefully
- ✅ Demo mode fallback functional
- ✅ UI/UX consistent across all screens
- ✅ No TypeScript errors
- ✅ No blocking bugs

## Notes
- Backend URL: http://10.0.2.2:8000 (emulator) or http://localhost:8000
- Default users: admin@gasfill.com/admin123, rider1@gasfill.com/rider123
- Demo mode activates on network errors
- Cart uses AsyncStorage for persistence
- Orders sync between API and local storage
