# Subscription Badge Feature

## Overview
Added subscription tier badges to user profiles showing their active refill plan (Basic/Pro/Family).

## Changes Made

### 1. User Type Extension (`src/types/index.ts`)
```typescript
export interface User {
  // ... existing fields
  subscription_tier?: 'basic' | 'pro' | 'family' | null;
  subscription_status?: 'active' | 'paused' | 'cancelled' | 'expired' | null;
}
```

### 2. ProfileScreen Updates (`src/screens/ProfileScreen.tsx`)

#### Subscription Badge Display
Added a subscription badge below the "VERIFIED CUSTOMER" badge that shows:
- **Basic Plan**: Green badge with flame-outline icon
- **Pro Plan**: Blue badge with flame icon
- **Family Plan**: Purple badge with rocket icon

The badge only displays when:
- User has a subscription tier
- Subscription status is 'active'

#### Menu Item Addition
Added new menu item for customers:
```typescript
{ 
  icon: 'flame-outline', 
  name: 'Subscription Plans', 
  screen: 'RefillPlans', 
  description: 'Manage your refill plan' 
}
```

#### Styles Added
```typescript
subscriptionBadge: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 12,
  gap: 5,
  marginTop: 8,
}

// Tier-specific backgrounds
subscriptionBasic: { backgroundColor: '#d1fae5' }    // Green
subscriptionPro: { backgroundColor: '#dbeafe' }      // Blue
subscriptionFamily: { backgroundColor: '#f3e8ff' }   // Purple

// Tier-specific text colors
subscriptionBasicText: { color: '#059669' }
subscriptionProText: { color: '#3b82f6' }
subscriptionFamilyText: { color: '#9333ea' }
```

### 3. AuthContext Demo Data (`src/context/AuthContext.tsx`)

#### Login Demo User
```typescript
const demoUser: User = {
  // ... existing fields
  subscription_tier: 'pro',
  subscription_status: 'active',
}
```

#### Registration Demo User
```typescript
const demoUser: User = {
  // ... existing fields
  subscription_tier: 'basic',
  subscription_status: 'active',
}
```

## Visual Examples

### Basic Plan Badge
```
┌──────────────────┐
│ 🔥 BASIC PLAN    │  (Green background)
└──────────────────┘
```

### Pro Plan Badge
```
┌──────────────────┐
│ 🔥 PRO PLAN      │  (Blue background)
└──────────────────┘
```

### Family Plan Badge
```
┌──────────────────┐
│ 🚀 FAMILY PLAN   │  (Purple background)
└──────────────────┘
```

## User Experience Flow

1. **New Users**: Register → Get Basic plan badge
2. **Existing Users**: Login → See Pro plan badge
3. **No Subscription**: No badge displayed (customer badge only)
4. **Inactive Subscription**: No badge displayed (subscription_status !== 'active')

## Profile Screen Layout

```
┌─────────────────────────────────┐
│         [Avatar Image]           │
│         John Doe                 │
│     john@example.com             │
│     +233241234567                │
│                                  │
│   ┌───────────────────────┐     │
│   │ ✓ VERIFIED CUSTOMER   │     │  (Blue)
│   └───────────────────────┘     │
│                                  │
│   ┌───────────────────────┐     │
│   │ 🔥 PRO PLAN           │     │  (Blue - if active)
│   └───────────────────────┘     │
│                                  │
│   [Customer Stats]               │
└─────────────────────────────────┘
```

## Integration with Refill Plans

The subscription badge links to the refill plan system:
- Tapping "Subscription Plans" menu → Opens RefillPlans screen
- Users can upgrade/downgrade their subscription
- Badge updates automatically when subscription changes

## Backend Integration (TODO)

When backend is ready, update:

1. **User Model** - Add fields:
   ```python
   subscription_tier = models.CharField(max_length=10, null=True)
   subscription_status = models.CharField(max_length=20, null=True)
   ```

2. **API Response** - Include in auth responses:
   ```json
   {
     "user": {
       "id": 1,
       "username": "john",
       "subscription_tier": "pro",
       "subscription_status": "active"
     }
   }
   ```

3. **Update Endpoint** - Create API for subscription changes:
   ```
   POST /api/subscriptions/update
   {
     "tier": "pro",
     "status": "active"
   }
   ```

## Testing

### Test Cases

1. **New Registration**
   - Expected: Basic plan badge appears
   - Icon: Flame outline (green)

2. **Login with Pro Plan**
   - Expected: Pro plan badge appears
   - Icon: Flame (blue)

3. **No Active Subscription**
   - Expected: No subscription badge
   - Only verified customer badge shows

4. **Paused Subscription**
   - Expected: No subscription badge
   - Only verified customer badge shows

5. **Navigate to Plans**
   - Tap "Subscription Plans"
   - Expected: RefillPlans screen opens

## Color Scheme

| Tier   | Background | Text Color | Icon       |
|--------|-----------|------------|------------|
| Basic  | #d1fae5   | #059669    | flame-outline |
| Pro    | #dbeafe   | #3b82f6    | flame      |
| Family | #f3e8ff   | #9333ea    | rocket     |

## Next Steps

1. ✅ Add subscription fields to User type
2. ✅ Display subscription badge in ProfileScreen
3. ✅ Add "Subscription Plans" menu item
4. ✅ Update demo users with subscription data
5. 🔄 Connect to backend when available
6. 🔄 Add subscription update API calls
7. 🔄 Implement subscription expiry handling
8. 🔄 Add subscription renewal reminders
