#!/usr/bin/env python3
"""Quick test to verify picked_up (legacy status) works"""

import requests

BASE_URL = "http://localhost:5002/api"

# Login as rider
rider_login = requests.post(f"{BASE_URL}/auth/rider-login", json={
    "email": "rider1@gasfill.com",
    "password": "rider123"
})

if rider_login.status_code != 200:
    print(f"❌ Login failed: {rider_login.text}")
    exit(1)

token = rider_login.json()["token"]
headers = {"Authorization": f"Bearer {token}"}

# Create test customer and order
import time
customer_reg = requests.post(f"{BASE_URL}/auth/register", json={
    "email": f"legacy_test_{int(time.time())}@example.com",
    "password": "test123",
    "username": "Legacy Test"
})

customer_token = customer_reg.json()["token"]
customer_headers = {"Authorization": f"Bearer {customer_token}"}

order = requests.post(f"{BASE_URL}/orders", json={
    "items": [{"name": "13kg Cylinder", "quantity": 1, "price": 150}],
    "total": 150,
    "customer_name": "Legacy Test",
    "customer_email": customer_reg.json()["user"]["email"],
    "customer_phone": "+233241234567",
    "customer_address": "Test Address",
    "delivery_type": "standard"
}, headers=customer_headers)

order_id = order.json()["id"]
print(f"✅ Created order: {order_id}")

# Accept order
accept = requests.post(f"{BASE_URL}/rider/orders/{order_id}/accept", headers=headers)
print(f"✅ Accepted order: {accept.json()['status']}")

# Test picked_up status (legacy)
print("\n🧪 Testing legacy 'picked_up' status...")
update = requests.put(f"{BASE_URL}/rider/orders/{order_id}/status", json={
    "status": "picked_up",
    "location": "Depot",
    "notes": "Using legacy picked_up status"
}, headers=headers)

if update.status_code == 200:
    result = update.json()
    print(f"✅ SUCCESS! Status updated to: {result['new_status']}")
    print(f"   Message: {result['message']}")
    print(f"   Previous: {result['previous_status']} → New: {result['new_status']}")
    print("\n✅ Legacy 'picked_up' status is supported!")
else:
    print(f"❌ FAILED: {update.json()['detail']}")
    print("   Legacy status NOT working")
