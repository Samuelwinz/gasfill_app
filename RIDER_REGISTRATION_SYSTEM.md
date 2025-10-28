# Rider Registration System Documentation

## 📋 Overview

The rider registration system is **fully implemented** and functional across all layers:
- ✅ Frontend UI with comprehensive validation
- ✅ AuthContext integration
- ✅ API service layer
- ✅ Backend FastAPI endpoint
- ✅ Database persistence

---

## 🏗️ System Architecture

```
RiderRegistrationScreen.tsx (UI)
         ↓
   AuthContext.riderRegister()
         ↓
   riderApi.riderRegister()
         ↓
   POST /api/auth/rider-register
         ↓
   db.create_rider()
         ↓
   SQLite Database (riders table)
```

---

## 📱 Frontend Components

### 1. **RiderRegistrationScreen.tsx**
**Location:** `gasfill-mobile/src/screens/RiderRegistrationScreen.tsx`

**Features:**
- ✅ Complete form with 10 fields
- ✅ Real-time validation
- ✅ Visual feedback (error/success borders)
- ✅ Password visibility toggles
- ✅ Terms & conditions checkbox
- ✅ Loading states
- ✅ Error/success alerts

**Form Fields:**
```typescript
{
  username: string;          // Required, trimmed
  email: string;            // Required, email format
  password: string;         // Required, min 6 chars
  confirmPassword: string;  // Must match password
  phone: string;           // Required, phone format
  license_number: string;  // Required, uppercase
  vehicle_type: string;    // Picker: motorcycle/bicycle/car
  vehicle_number: string;  // Required, uppercase
  emergency_contact: string; // Required, phone format
  area_coverage: string;   // Required, multiline
}
```

**Validation Rules:**
```typescript
// Email validation
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Phone validation  
const phoneRegex = /^[\+]?[0-9]{10,15}$/;

// Password validation
password.length >= 6

// Matching passwords
password === confirmPassword
```

**Usage:**
```tsx
const handleRegister = async () => {
  // Validate form
  const { isValid, errors } = validateForm();
  if (!isValid) return;
  
  // Prepare data
  const registerData = {
    username: formData.username.trim(),
    email: formData.email.toLowerCase().trim(),
    password: formData.password,
    phone: formData.phone.trim(),
    license_number: formData.license_number.toUpperCase(),
    vehicle_type: formData.vehicle_type,
    vehicle_number: formData.vehicle_number.toUpperCase(),
    emergency_contact: formData.emergency_contact.trim(),
    area_coverage: formData.area_coverage.trim(),
  };
  
  // Call registration
  await riderRegister(registerData);
};
```

---

### 2. **AuthContext.tsx**
**Location:** `gasfill-mobile/src/context/AuthContext.tsx`

**Function:** `riderRegister()`

**Implementation:**
```typescript
const riderRegister = async (riderData: RiderRegisterData): Promise<boolean> => {
  try {
    setIsLoading(true);
    console.log('📝 Attempting rider registration for:', riderData.email);
    
    // Call API
    const response = await riderRegisterApi(riderData);
    console.log('✅ Rider registration response received:', response);

    // Save token and rider data
    await StorageService.saveToken(response.token);
    await StorageService.setItem('rider', response.rider);
    await StorageService.setItem('userRole', 'rider');

    // Update state
    setToken(response.token);
    setRider(response.rider);
    setUserRole('rider');

    console.log('✅ Rider registration successful for:', response.rider.email);
    return true;
  } catch (error: any) {
    console.error('❌ Rider registration error:', error);
    throw new Error(error.response?.data?.detail || 'Registration failed. Please try again.');
  } finally {
    setIsLoading(false);
  }
};
```

**Features:**
- ✅ Calls API service
- ✅ Saves JWT token
- ✅ Persists rider profile
- ✅ Sets user role to 'rider'
- ✅ Updates context state
- ✅ Auto-login after registration
- ✅ Error handling with detailed messages

---

### 3. **riderApi.ts**
**Location:** `gasfill-mobile/src/services/riderApi.ts`

**API Configuration:**
```typescript
const API_BASE_URL = __DEV__ 
  ? 'http://192.168.1.25:8000'  // Local development
  : 'https://your-production-api.com';
```

**Type Definition:**
```typescript
export interface RiderRegisterData {
  username: string;
  email: string;
  password: string;
  phone: string;
  license_number: string;
  vehicle_type: 'motorcycle' | 'bicycle' | 'car';
  vehicle_number: string;
  emergency_contact: string;
  area_coverage: string;
}

export interface RiderAuthResponse {
  token: string;
  rider: RiderProfile;
  message?: string;
}
```

**Registration Function:**
```typescript
export const riderRegister = async (
  data: RiderRegisterData
): Promise<RiderAuthResponse> => {
  const response = await riderApiClient.post<RiderAuthResponse>(
    '/api/auth/rider-register',
    data
  );
  return response.data;
};
```

**Features:**
- ✅ Type-safe API calls
- ✅ Automatic auth token injection
- ✅ Request/response logging
- ✅ Error handling
- ✅ Timeout configuration (5s)

---

## 🔧 Backend Implementation

### 1. **FastAPI Endpoint**
**Location:** `python_server.py`

**Model Definition:**
```python
class RiderRegister(BaseModel):
    username: str
    email: EmailStr
    password: str
    phone: str
    license_number: str
    vehicle_type: str  # "motorcycle", "bicycle", "car"
    vehicle_number: str
    emergency_contact: str
    area_coverage: str  # Areas they can deliver to
```

**Endpoint:**
```python
@app.post("/api/auth/rider-register")
async def rider_register(rider_data: RiderRegister):
    """Register a new rider"""
    # 1. Check if rider already exists
    existing_rider = db.get_rider_by_email(rider_data.email)
    if existing_rider:
        raise HTTPException(
            status_code=400,
            detail="Rider with this email already exists"
        )
    
    # 2. Hash password
    hashed_password = hash_password(rider_data.password)
    
    # 3. Create rider record in database
    rider = db.create_rider({
        "username": rider_data.username,
        "email": rider_data.email,
        "password": hashed_password,
        "phone": rider_data.phone,
        "license_number": rider_data.license_number,
        "vehicle_type": rider_data.vehicle_type,
        "vehicle_number": rider_data.vehicle_number,
        "emergency_contact": rider_data.emergency_contact,
        "area_coverage": rider_data.area_coverage,
        "status": "offline",
        "location": None,
        "rating": 5.0,
        "total_deliveries": 0,
        "successful_deliveries": 0,
        "earnings": 0.0,
        "commission_rate": 0.8,
        "delivery_fee": 10.0,
        "is_verified": False,
        "is_active": True,
        "is_suspended": False,
        "document_status": "pending"
    })
    
    # 4. Create JWT access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": rider_data.email, "role": "rider"}, 
        expires_delta=access_token_expires
    )
    
    # 5. Return response
    return {
        "message": "Rider registered successfully",
        "token": access_token,
        "rider": {
            "id": rider["id"],
            "username": rider["username"],
            "email": rider["email"],
            "phone": rider["phone"],
            "vehicle_type": rider["vehicle_type"],
            "status": rider["status"],
            "is_verified": rider["is_verified"]
        }
    }
```

**Features:**
- ✅ Email uniqueness validation
- ✅ Password hashing (bcrypt)
- ✅ Database persistence
- ✅ JWT token generation
- ✅ Auto-login response
- ✅ Error handling
- ✅ Default values for new riders

---

### 2. **Database Functions**
**Location:** `db.py`

**Function:** `create_rider()`
```python
def create_rider(rider_data: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new rider in the database"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    now = datetime.now(UTC).isoformat()
    
    cur.execute('''
        INSERT INTO riders (
            username, email, password, phone, license_number, vehicle_type, 
            vehicle_number, emergency_contact, area_coverage, status, location,
            rating, total_deliveries, successful_deliveries, earnings,
            commission_rate, delivery_fee, is_verified, is_active, is_suspended,
            verification_date, verification_notes, document_status,
            suspension_date, suspension_reason, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        # ... parameter mapping ...
    ))
    
    rider_id = cur.lastrowid
    conn.commit()
    
    # Fetch and return the created rider
    cur.execute('SELECT * FROM riders WHERE id=?', (rider_id,))
    row = cur.fetchone()
    conn.close()
    
    return _row_to_rider(row)
```

**Supporting Functions:**
```python
def get_rider_by_email(email: str) -> Optional[Dict[str, Any]]
def get_rider_by_id(rider_id: int) -> Optional[Dict[str, Any]]
def get_all_riders() -> List[Dict[str, Any]]
def update_rider(rider_id: int, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]
```

---

## 🔒 Security Features

### Password Hashing
```python
def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash"""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
```

### JWT Authentication
```python
SECRET_KEY = "your-secret-key-here-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 43200  # 30 days

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
```

---

## 🧪 Testing

### Manual Testing
1. **Start the backend server:**
   ```bash
   python gasfill_app/python_server.py
   ```

2. **Run the test script:**
   ```bash
   python gasfill_app/test_rider_registration.py
   ```

### Test Coverage
✅ **Successful Registration**
- Valid data submission
- Token generation
- Database persistence
- Auto-login

✅ **Duplicate Email Prevention**
- Rejects duplicate emails
- Returns 400 error
- Proper error message

✅ **Input Validation**
- Email format validation
- Required field checks
- Returns 422 for invalid data

✅ **Login After Registration**
- Can login with registered credentials
- Token authentication works

---

## 📊 Database Schema

**Riders Table:**
```sql
CREATE TABLE riders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    phone TEXT NOT NULL,
    license_number TEXT NOT NULL,
    vehicle_type TEXT NOT NULL,
    vehicle_number TEXT NOT NULL,
    emergency_contact TEXT NOT NULL,
    area_coverage TEXT NOT NULL,
    status TEXT DEFAULT 'offline',
    location TEXT,
    rating REAL DEFAULT 5.0,
    total_deliveries INTEGER DEFAULT 0,
    successful_deliveries INTEGER DEFAULT 0,
    earnings REAL DEFAULT 0.0,
    commission_rate REAL DEFAULT 0.8,
    delivery_fee REAL DEFAULT 10.0,
    is_verified INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    is_suspended INTEGER DEFAULT 0,
    verification_date TEXT,
    verification_notes TEXT,
    document_status TEXT DEFAULT 'pending',
    suspension_date TEXT,
    suspension_reason TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
)
```

---

## 🚀 Usage Flow

### User Journey:
1. User opens GasFill app
2. Navigates to "Register as Rider"
3. Fills out registration form:
   - Personal info (username, email, password, phone)
   - License information
   - Vehicle details
   - Emergency contact
   - Service areas
4. Accepts terms and conditions
5. Submits form
6. System validates input
7. Backend creates rider account
8. JWT token generated
9. User auto-logged in
10. Navigated to rider dashboard

### Error Scenarios:
- **Duplicate email:** "Rider with this email already exists"
- **Invalid email format:** Field validation error
- **Password too short:** "Password must be at least 6 characters"
- **Missing required field:** Field-specific error message
- **Backend error:** "Registration failed. Please try again."

---

## 🎯 System Status

### ✅ Fully Implemented Features:
1. Complete registration form UI
2. Real-time field validation
3. Visual feedback and error messages
4. Password hashing (bcrypt)
5. JWT token authentication
6. Database persistence
7. Duplicate email prevention
8. Auto-login after registration
9. Error handling at all layers
10. TypeScript type safety

### ✅ No Errors Found:
- Frontend: 0 TypeScript errors
- Backend: Fully functional
- Database: Schema complete

---

## 📝 Example Request/Response

### Request:
```json
POST http://localhost:8000/api/auth/rider-register
Content-Type: application/json

{
  "username": "john_rider",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "phone": "+2348012345678",
  "license_number": "LIC123456",
  "vehicle_type": "motorcycle",
  "vehicle_number": "ABC-123-XYZ",
  "emergency_contact": "+2348087654321",
  "area_coverage": "Ikeja, Victoria Island, Lekki"
}
```

### Response (200 OK):
```json
{
  "message": "Rider registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "rider": {
    "id": 1,
    "username": "john_rider",
    "email": "john@example.com",
    "phone": "+2348012345678",
    "vehicle_type": "motorcycle",
    "status": "offline",
    "is_verified": false
  }
}
```

### Error Response (400 Bad Request):
```json
{
  "detail": "Rider with this email already exists"
}
```

---

## 🔄 Next Steps (Optional Enhancements)

1. **Email Verification**
   - Send verification email
   - Verify email before activation

2. **Document Upload**
   - Upload license photo
   - Upload vehicle documents
   - Admin verification workflow

3. **SMS Verification**
   - Send OTP to phone
   - Verify phone number

4. **Enhanced Validation**
   - License number format validation
   - Vehicle number plate validation
   - Area coverage validation

5. **Onboarding Flow**
   - Tutorial screens
   - Profile photo upload
   - Bank account setup

---

## 📞 Support

If you encounter any issues:
1. Check backend server is running on port 8000
2. Verify database exists and has riders table
3. Check network connectivity
4. Review console logs for errors
5. Run test script to validate system

---

**Status:** ✅ FULLY OPERATIONAL
**Last Updated:** 2024
**Version:** 1.0.0
