#!/usr/bin/env python3
"""Test script for GasFill API with database integration"""

import requests
import json
import time

BASE_URL = "http://localhost:5002/api"

def test_register():
    """Test customer registration"""
    print("[*] Testing customer registration...")
    data = {
        "username": "testcustomer",
        "email": "testcustomer@example.com",
        "password": "test123",
        "phone": "0987654321",
        "address": "123 Test Street",
        "role": "customer"
    }
    
    response = requests.post(f"{BASE_URL}/auth/register", json=data)
    print(f"Status: {response.status_code}")
    result = response.json()
    print(json.dumps(result, indent=2))
    
    if response.status_code == 200:
        token = result.get("token")
        return token
    return None

def test_create_order(token):
    """Test order creation"""
    print("[*] Testing order creation...")
    headers = {"Authorization": f"Bearer {token}"}
    data = {
        "customer_name": "Test Customer",
        "customer_email": "testcustomer@example.com",
        "customer_phone": "0987654321",
        "customer_address": "123 Test Street",
        "items": [
            {
                "id": "prod1",
                "name": "5kg Cylinder",
                "price": 25.0,
                "quantity": 1
            }
        ],
        "total": 25.0,
        "delivery_type": "standard",
        "payment_status": "pending"
    }
    
    response = requests.post(f"{BASE_URL}/orders", json=data, headers=headers)
    print(f"Status: {response.status_code}")
    result = response.json()
    print(json.dumps(result, indent=2))
    
    if response.status_code == 201:
        order_id = result.get("id")
        return order_id
    return None

def test_get_customer_orders(token):
    """Test getting customer orders"""
    print("[*] Testing get customer orders...")
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.get(f"{BASE_URL}/customer/orders", headers=headers)
    print(f"Status: {response.status_code}")
    result = response.json()
    print(json.dumps(result, indent=2))
    
    return result if response.status_code == 200 else None

def test_update_order_status(token, order_id):
    """Test updating order status"""
    print(f"[*] Testing update order status for {order_id}...")
    headers = {"Authorization": f"Bearer {token}"}
    data = {
        "status": "accepted"
    }
    
    response = requests.patch(f"{BASE_URL}/orders/{order_id}/status", json=data, headers=headers)
    print(f"Status: {response.status_code}")
    result = response.json()
    print(json.dumps(result, indent=2))
    
    return result if response.status_code == 200 else None

if __name__ == "__main__":
    print("[+] GasFill API Test Suite\n")
    
    try:
        # Wait for server to be ready
        time.sleep(1)
        
        # Test registration
        token = test_register()
        if not token:
            print("[-] Registration failed!")
            exit(1)
        
        # Test create order
        order_id = test_create_order(token)
        if not order_id:
            print("[-] Order creation failed!")
        else:
            print(f"[+] Order created: {order_id}")
        
        # Test get customer orders
        orders = test_get_customer_orders(token)
        if orders:
            print(f"[+] Retrieved {len(orders)} orders from database")
        else:
            print("[-] Failed to get customer orders!")
        
        # Test update order status
        if order_id:
            updated = test_update_order_status(token, order_id)
            if updated and updated.get("status") == "accepted":
                print(f"[+] Order status updated to: {updated.get('status')}")
            else:
                print("[-] Failed to update order status!")
        
        print("\n[+] All tests completed!")
        
    except Exception as e:
        print(f"[-] Error: {e}")
        exit(1)
