#!/usr/bin/env python3
"""Test script for rider orders display"""

import subprocess
import time
import requests
import json

BASE_URL = "http://localhost:5002/api"

def test_rider_orders():
    """Test rider available orders from SQLite database"""
    print("[*] GasFill Rider Orders Test\n")
    
    try:
        # Wait for server
        time.sleep(2)
        
        # 1. Login as a rider (use default rider)
        print("[*] Step 1: Login as rider...")
        rider_login_data = {
            "email": "rider1@gasfill.com",
            "password": "rider123"
        }
        
        response = requests.post(f"{BASE_URL}/auth/rider-login", json=rider_login_data, timeout=10)
        print(f"    Status: {response.status_code}")
        if response.status_code != 200:
            print(f"    Error: {response.text}")
            return False
        
        rider_result = response.json()
        rider_token = rider_result.get("token")
        print(f"    [+] Rider logged in: {rider_result.get('email')}")
        print(f"    [+] Token received: {rider_token[:40]}...")
        
        # 2. Register customer and create orders
        print("\n[*] Step 2: Create test orders...")
        cust_data = {
            "username": "test_cust_rider",
            "email": "cust_rider@example.com",
            "password": "cust123",
            "phone": "0987654321",
            "address": "123 Test St, Accra",
            "role": "customer"
        }
        
        response = requests.post(f"{BASE_URL}/auth/register", json=cust_data, timeout=10)
        if response.status_code != 200:
            print(f"    Error registering customer: {response.text}")
            return False
        
        cust_result = response.json()
        cust_token = cust_result.get("token")
        print(f"    [+] Customer registered")
        
        # Create multiple orders
        headers = {"Authorization": f"Bearer {cust_token}"}
        for i in range(3):
            order_data = {
                "customer_name": "Test Customer",
                "customer_email": "cust_rider@example.com",
                "customer_phone": "0987654321",
                "customer_address": "123 Test St, Accra",
                "items": [
                    {
                        "id": f"prod{i}",
                        "name": f"5kg Cylinder Set {i+1}",
                        "price": 25.0 + i * 5,
                        "quantity": 1
                    }
                ],
                "total": 25.0 + i * 5,
                "delivery_type": "standard"
            }
            
            response = requests.post(f"{BASE_URL}/orders", json=order_data, headers=headers, timeout=10)
            if response.status_code == 201:
                order = response.json()
                print(f"    [+] Order created: {order.get('id')} - {order.get('total')} GHS")
            else:
                print(f"    [-] Failed to create order: {response.text}")
        
        # 3. Check available orders as rider
        print("\n[*] Step 3: Check available orders for rider...")
        rider_headers = {"Authorization": f"Bearer {rider_token}"}
        
        response = requests.get(f"{BASE_URL}/rider/orders/available", headers=rider_headers, timeout=10)
        print(f"    Status: {response.status_code}")
        
        if response.status_code == 200:
            orders = response.json()
            print(f"    [+] Retrieved {len(orders)} available orders")
            
            if orders:
                print("\n[*] Available Orders Details:")
                for order in orders:
                    print(f"    - Order ID: {order.get('id')}")
                    print(f"      Customer: {order.get('customer_name')} ({order.get('customer_phone')})")
                    print(f"      Address: {order.get('customer_address')}")
                    print(f"      Total: {order.get('total')} GHS")
                    print(f"      Status: {order.get('status')}")
                    print(f"      Items: {len(order.get('items', []))} item(s)")
                    print()
            else:
                print("    [-] No orders returned (database may be empty)")
        else:
            print(f"    [-] Failed to retrieve orders: {response.text}")
            return False
        
        # 4. Test accepting an order
        if orders and len(orders) > 0:
            print("[*] Step 4: Test accepting an order...")
            order_to_accept = orders[0]
            order_id = order_to_accept.get('id')
            
            response = requests.post(f"{BASE_URL}/rider/orders/{order_id}/accept", headers=rider_headers, timeout=10)
            print(f"    Status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print(f"    [+] Order accepted successfully!")
                print(f"        Order Status: {result.get('status')}")
                print(f"        Assigned Rider: {result.get('assigned_rider_id')}")
            else:
                print(f"    [-] Failed to accept order: {response.text}")
        
        print("\n[SUCCESS] Rider orders test completed successfully!")
        return True
        
    except requests.exceptions.ConnectionError:
        print("[ERROR] Could not connect to server. Is it running on port 5002?")
        return False
    except Exception as e:
        print(f"[ERROR] {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = test_rider_orders()
    exit(0 if success else 1)
