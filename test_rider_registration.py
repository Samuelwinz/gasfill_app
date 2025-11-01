"""
Test script for rider registration flow
Tests the complete registration process from API to database
"""
import requests
import json
import sys

# Backend configuration
BASE_URL = "http://localhost:8000"

def test_rider_registration():
    """Test rider registration endpoint"""
    print("🧪 Testing Rider Registration Flow")
    print("=" * 50)
    
    # Test data
    rider_data = {
        "username": "test_rider_001",
        "email": f"test_rider_{hash(str(sys.argv)) % 10000}@example.com",  # Unique email
        "password": "SecurePass123!",
        "phone": "+2348012345678",
        "license_number": "LIC123456",
        "vehicle_type": "motorcycle",
        "vehicle_number": "ABC-123-XYZ",
        "emergency_contact": "+2348087654321",
        "area_coverage": "Ikeja, Victoria Island, Lekki"
    }
    
    print(f"\n1️⃣ Testing Registration")
    print(f"Email: {rider_data['email']}")
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/auth/rider-register",
            json=rider_data,
            timeout=5
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Registration Successful!")
            print(f"\nResponse Data:")
            print(f"  - Message: {data.get('message')}")
            print(f"  - Token Length: {len(data.get('token', ''))} chars")
            print(f"\nRider Info:")
            rider_info = data.get('rider', {})
            print(f"  - ID: {rider_info.get('id')}")
            print(f"  - Username: {rider_info.get('username')}")
            print(f"  - Email: {rider_info.get('email')}")
            print(f"  - Phone: {rider_info.get('phone')}")
            print(f"  - Vehicle: {rider_info.get('vehicle_type')}")
            print(f"  - Status: {rider_info.get('status')}")
            print(f"  - Verified: {rider_info.get('is_verified')}")
            
            # Test login with the registered credentials
            print(f"\n2️⃣ Testing Login with Registered Credentials")
            login_response = requests.post(
                f"{BASE_URL}/api/auth/rider-login",
                json={
                    "email": rider_data['email'],
                    "password": rider_data['password']
                },
                timeout=5
            )
            
            if login_response.status_code == 200:
                print("✅ Login Successful!")
                login_data = login_response.json()
                print(f"  - Token Length: {len(login_data.get('token', ''))} chars")
            else:
                print(f"❌ Login Failed: {login_response.status_code}")
                print(login_response.text)
            
        else:
            print(f"❌ Registration Failed")
            print(f"Response: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection Error: Is the Python server running?")
        print(f"   Start it with: python gasfill_app/python_server.py")
    except requests.exceptions.Timeout:
        print("❌ Request Timeout")
    except Exception as e:
        print(f"❌ Error: {e}")

def test_duplicate_registration():
    """Test that duplicate email is rejected"""
    print(f"\n3️⃣ Testing Duplicate Registration Prevention")
    print("=" * 50)
    
    duplicate_data = {
        "username": "test_rider_duplicate",
        "email": "duplicate@example.com",
        "password": "SecurePass123!",
        "phone": "+2348012345678",
        "license_number": "LIC999999",
        "vehicle_type": "motorcycle",
        "vehicle_number": "DUP-999-XXX",
        "emergency_contact": "+2348087654321",
        "area_coverage": "Test Area"
    }
    
    try:
        # First registration
        response1 = requests.post(
            f"{BASE_URL}/api/auth/rider-register",
            json=duplicate_data,
            timeout=5
        )
        
        # Second registration with same email
        response2 = requests.post(
            f"{BASE_URL}/api/auth/rider-register",
            json=duplicate_data,
            timeout=5
        )
        
        if response2.status_code == 400:
            error_data = response2.json()
            print("✅ Duplicate Prevention Working!")
            print(f"  - Error: {error_data.get('detail')}")
        else:
            print(f"⚠️ Expected 400, got {response2.status_code}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

def test_validation():
    """Test input validation"""
    print(f"\n4️⃣ Testing Input Validation")
    print("=" * 50)
    
    invalid_data = {
        "username": "test",
        "email": "invalid-email",  # Invalid email format
        "password": "123",
        "phone": "",
        "license_number": "",
        "vehicle_type": "invalid_vehicle",
        "vehicle_number": "",
        "emergency_contact": "",
        "area_coverage": ""
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/auth/rider-register",
            json=invalid_data,
            timeout=5
        )
        
        if response.status_code == 422:
            print("✅ Validation Working!")
            print(f"  - Status: {response.status_code} (Unprocessable Entity)")
        else:
            print(f"⚠️ Expected 422, got {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    print("\n" + "=" * 50)
    print("🚀 RIDER REGISTRATION SYSTEM TEST")
    print("=" * 50)
    
    test_rider_registration()
    test_duplicate_registration()
    test_validation()
    
    print("\n" + "=" * 50)
    print("✅ Test Suite Completed")
    print("=" * 50 + "\n")
