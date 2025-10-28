"""
Test Order Assignment System
Tests the complete order assignment workflow including:
- Auto-assignment to nearest rider
- 30-second timeout mechanism
- Accept/reject functionality
- Fallback to next rider on timeout
"""

import requests
import json
import time
from datetime import datetime

BASE_URL = "http://192.168.1.25:8000"

# Test credentials
TEST_CUSTOMER = {
    "email": "customer@test.com",
    "password": "password123"
}

TEST_RIDER_1 = {
    "email": "rider1@gasfill.com",  # Use pre-created verified rider
    "password": "rider123",
    "username": "Rider One",
    "phone": "+2348011111111",
    "license_number": "LIC-001",
    "vehicle_type": "motorcycle",
    "vehicle_number": "ABC-001",
    "emergency_contact": "+2348099999991",
    "area_coverage": "Lagos Island",
    "location": json.dumps({"latitude": 6.4541, "longitude": 3.3947})  # Lagos Island
}

TEST_RIDER_2 = {
    "email": "rider2@gasfill.com",  # Use pre-created verified rider
    "password": "rider123",
    "username": "Rider Two",
    "phone": "+2348022222222",
    "license_number": "LIC-002",
    "vehicle_type": "bicycle",
    "vehicle_number": "ABC-002",
    "emergency_contact": "+2348099999992",
    "area_coverage": "Victoria Island",
    "location": json.dumps({"latitude": 6.4281, "longitude": 3.4219})  # Victoria Island
}

def print_header(title):
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)

def print_step(step_num, description):
    print(f"\n{step_num}. {description}")
    print("-" * 70)

def register_rider(rider_data):
    """Register a new rider"""
    try:
        response = requests.post(
            f"{BASE_URL}/api/auth/rider-register",
            json=rider_data
        )
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Rider registered: {rider_data['username']}")
            return data['token'], data['rider']['id']
        elif response.status_code == 400:
            # Rider already exists, try to login
            login_response = requests.post(
                f"{BASE_URL}/api/auth/rider-login",
                json={"email": rider_data['email'], "password": rider_data['password']}
            )
            if login_response.status_code == 200:
                data = login_response.json()
                print(f"✅ Rider logged in: {rider_data['username']}")
                return data['token'], data['rider']['id']
        print(f"❌ Failed to register/login rider: {response.text}")
        return None, None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None, None

def set_rider_available(token, location=None):
    """Set rider status to available"""
    try:
        data = {"status": "available"}
        if location:
            data["location"] = location
        
        response = requests.put(
            f"{BASE_URL}/api/rider/status",
            json=data,
            headers={"Authorization": f"Bearer {token}"}
        )
        if response.status_code == 200:
            print("✅ Rider set to available")
            return True
        print(f"❌ Failed to set rider available: {response.text}")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def create_test_order(customer_location=None):
    """Create a test order"""
    try:
        order_data = {
            "items": [
                {"name": "6kg Gas Cylinder", "quantity": 1, "price": 50.00}
            ],
            "customer_name": "Test Customer",
            "customer_email": "customer@test.com",
            "customer_phone": "+2348000000000",
            "customer_address": "123 Test Street, Lagos",
            "total": 60.00,
            "delivery_type": "standard"
        }
        
        if customer_location:
            order_data["customer_location"] = customer_location  # Send as dict, not JSON string
        
        response = requests.post(
            f"{BASE_URL}/api/orders",
            json=order_data
        )
        
        # Debug: Print status code
        if response.status_code == 200 or response.status_code == 201:
            data = response.json()
            order_id = data.get('id') or data.get('order_id')
            print(f"✅ Order created: {order_id}")
            return order_id
        else:
            print(f"❌ Failed to create order (status {response.status_code}): {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def assign_order(order_id, customer_location=None):
    """Auto-assign order to nearest rider"""
    try:
        response = requests.post(
            f"{BASE_URL}/api/orders/{order_id}/assign",
            json=customer_location if customer_location else {}
        )
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Order assigned to: {data['rider']['username']}")
            print(f"   Distance: {data.get('distance_km', 'N/A')} km")
            print(f"   ETA: {data.get('estimated_time_minutes', 'N/A')} minutes")
            print(f"   Expires at: {data.get('assignment_expires_at', 'N/A')}")
            return data['rider']['id']
        print(f"❌ Failed to assign order: {response.text}")
        return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def get_pending_assignments(rider_token):
    """Get pending assignments for rider"""
    try:
        response = requests.get(
            f"{BASE_URL}/api/rider/orders/pending",
            headers={"Authorization": f"Bearer {rider_token}"}
        )
        if response.status_code == 200:
            pending = response.json()
            print(f"✅ Found {len(pending)} pending assignment(s)")
            return pending
        print(f"❌ Failed to get pending assignments: {response.text}")
        return []
    except Exception as e:
        print(f"❌ Error: {e}")
        return []

def accept_assignment(order_id, rider_token):
    """Rider accepts order assignment"""
    try:
        response = requests.post(
            f"{BASE_URL}/api/rider/orders/{order_id}/confirm-assignment",
            headers={"Authorization": f"Bearer {rider_token}"}
        )
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Assignment accepted: {data.get('message')}")
            return True
        print(f"❌ Failed to accept assignment: {response.text}")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def reject_assignment(order_id, rider_token):
    """Rider rejects order assignment"""
    try:
        response = requests.post(
            f"{BASE_URL}/api/rider/orders/{order_id}/reject",
            headers={"Authorization": f"Bearer {rider_token}"}
        )
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Assignment rejected: {data.get('message')}")
            return True
        print(f"❌ Failed to reject assignment: {response.text}")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_assignment_workflow():
    """Test complete assignment workflow"""
    print_header("ORDER ASSIGNMENT SYSTEM TEST")
    
    # Step 1: Register/Login Riders
    print_step(1, "Register/Login Test Riders")
    rider1_token, rider1_id = register_rider(TEST_RIDER_1)
    rider2_token, rider2_id = register_rider(TEST_RIDER_2)
    
    if not rider1_token or not rider2_token:
        print("\n❌ Failed to set up riders. Exiting...")
        return
    
    # Step 2: Set Riders Available with Locations
    print_step(2, "Set Riders to Available with GPS Locations")
    
    # Rider 1: Closer to customer (Lagos Island)
    rider1_location = {"lat": 6.4541, "lng": 3.3947}
    set_rider_available(rider1_token, rider1_location)
    
    # Rider 2: Farther from customer (Victoria Island)
    rider2_location = {"lat": 6.4281, "lng": 3.4219}
    set_rider_available(rider2_token, rider2_location)
    
    # Step 3: Create Test Order
    print_step(3, "Create Test Order")
    customer_location = {"latitude": 6.4550, "longitude": 3.3900}  # Near Rider 1
    order_id = create_test_order(customer_location)
    
    if not order_id:
        print("\n❌ Failed to create order. Exiting...")
        return
    
    # Step 4: Auto-assign Order
    print_step(4, "Auto-assign Order to Nearest Rider")
    assigned_rider_id = assign_order(order_id, customer_location)
    
    if assigned_rider_id == rider1_id:
        print("✅ Correctly assigned to Rider 1 (nearest)")
    elif assigned_rider_id == rider2_id:
        print("⚠️  Assigned to Rider 2 (should be Rider 1)")
    
    # Step 5: Check Pending Assignments
    print_step(5, "Check Pending Assignments for Rider 1")
    time.sleep(1)  # Give server time to process
    pending = get_pending_assignments(rider1_token if assigned_rider_id == rider1_id else rider2_token)
    
    if pending:
        print(f"   Order ID: {pending[0].get('id')}")
        print(f"   Status: {pending[0].get('status')}")
        print(f"   Expires At: {pending[0].get('assignment_expires_at')}")
    
    # Step 6: Test Acceptance Flow
    print_step(6, "Rider Accepts Assignment")
    assigned_token = rider1_token if assigned_rider_id == rider1_id else rider2_token
    accept_assignment(order_id, assigned_token)
    
    print("\n" + "=" * 70)
    print("  ✅ ASSIGNMENT WORKFLOW TEST COMPLETED")
    print("=" * 70)

def test_rejection_workflow():
    """Test rejection and reassignment workflow"""
    print_header("REJECTION & REASSIGNMENT TEST")
    
    # Setup riders
    print_step(1, "Setup Riders")
    rider1_token, rider1_id = register_rider(TEST_RIDER_1)
    rider2_token, rider2_id = register_rider(TEST_RIDER_2)
    
    if not rider1_token or not rider2_token:
        print("\n❌ Failed to set up riders. Exiting...")
        return
    
    # Set available
    print_step(2, "Set Riders Available")
    set_rider_available(rider1_token, {"lat": 6.4541, "lng": 3.3947})
    set_rider_available(rider2_token, {"lat": 6.4281, "lng": 3.4219})
    
    # Create order
    print_step(3, "Create Order")
    customer_location = {"latitude": 6.4550, "longitude": 3.3900}
    order_id = create_test_order(customer_location)
    
    if not order_id:
        return
    
    # Assign
    print_step(4, "Auto-assign to Rider 1")
    assigned_rider_id = assign_order(order_id, customer_location)
    
    # Reject
    print_step(5, "Rider 1 Rejects Assignment")
    time.sleep(1)
    reject_assignment(order_id, rider1_token)
    
    # Reassign
    print_step(6, "Reassign to Rider 2")
    time.sleep(1)
    assigned_rider_id = assign_order(order_id, customer_location)
    
    if assigned_rider_id == rider2_id:
        print("✅ Successfully reassigned to Rider 2")
    
    print("\n" + "=" * 70)
    print("  ✅ REJECTION TEST COMPLETED")
    print("=" * 70)

def test_timeout_scenario():
    """Test timeout and auto-reassignment"""
    print_header("TIMEOUT & AUTO-REASSIGNMENT TEST")
    print("⚠️  This test takes 35+ seconds to complete (waiting for timeout)")
    
    # Setup riders
    print_step(1, "Setup Riders")
    rider1_token, rider1_id = register_rider(TEST_RIDER_1)
    rider2_token, rider2_id = register_rider(TEST_RIDER_2)
    
    if not rider1_token or not rider2_token:
        return
    
    # Set available
    print_step(2, "Set Riders Available")
    set_rider_available(rider1_token, {"lat": 6.4541, "lng": 3.3947})
    set_rider_available(rider2_token, {"lat": 6.4281, "lng": 3.4219})
    
    # Create and assign
    print_step(3, "Create and Assign Order to Rider 1")
    order_id = create_test_order({"latitude": 6.4550, "longitude": 3.3900})
    if not order_id:
        return
    
    assigned_rider_id = assign_order(order_id, {"latitude": 6.4550, "longitude": 3.3900})
    
    # Wait for timeout
    print_step(4, "Wait for 30-second Timeout")
    print("   Waiting", end="", flush=True)
    for i in range(35):
        time.sleep(1)
        print(".", end="", flush=True)
    print(" Done!")
    
    # Check if reassigned
    print_step(5, "Check if Order Was Auto-Reassigned")
    pending = get_pending_assignments(rider2_token)
    
    if pending:
        print("✅ Order was automatically reassigned to Rider 2 after timeout")
    else:
        print("⚠️  No pending assignment found for Rider 2")
    
    print("\n" + "=" * 70)
    print("  ✅ TIMEOUT TEST COMPLETED")
    print("=" * 70)

if __name__ == "__main__":
    try:
        # Run all tests
        test_assignment_workflow()
        input("\n\nPress Enter to run rejection test...")
        test_rejection_workflow()
        
        response = input("\n\nRun timeout test? (takes 35+ seconds) [y/N]: ")
        if response.lower() == 'y':
            test_timeout_scenario()
        
        print("\n" + "=" * 70)
        print("  🎉 ALL TESTS COMPLETED")
        print("=" * 70)
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Tests interrupted by user")
    except Exception as e:
        print(f"\n\n❌ Test failed with error: {e}")
