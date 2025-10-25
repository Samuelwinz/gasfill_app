#!/usr/bin/env python3
"""Test order tracking workflow: accept -> pickup -> delivery"""

import subprocess
import time
import requests
import json

BASE_URL = "http://localhost:5002/api"

def test_order_tracking():
    """Test complete order tracking workflow"""
    print("[*] GasFill Order Tracking Workflow Test\n")
    
    try:
        # Wait for server
        time.sleep(2)
        
        # 1. Login as rider
        print("[*] Step 1: Rider login...")
        rider_login = {
            "email": "rider1@gasfill.com",
            "password": "rider123"
        }
        
        response = requests.post(f"{BASE_URL}/auth/rider-login", json=rider_login, timeout=10)
        if response.status_code != 200:
            print(f"    [-] Failed: {response.text}")
            return False
        
        rider_result = response.json()
        rider_token = rider_result.get("token")
        print(f"    [+] Rider logged in successfully")
        
        # 2. Register customer and create order
        print("\n[*] Step 2: Create test order...")
        cust_data = {
            "username": "tracking_test_cust",
            "email": "tracking@example.com",
            "password": "cust123",
            "phone": "0244123456",
            "address": "Accra Tech Park",
            "role": "customer"
        }
        
        response = requests.post(f"{BASE_URL}/auth/register", json=cust_data, timeout=10)
        if response.status_code != 200:
            print(f"    [-] Customer registration failed: {response.text}")
            return False
        
        cust_token = response.json().get("token")
        print(f"    [+] Customer registered")
        
        # Create order
        order_data = {
            "customer_name": "John Tracker",
            "customer_email": "tracking@example.com",
            "customer_phone": "0244123456",
            "customer_address": "Accra Tech Park",
            "items": [
                {"id": "cyl1", "name": "10kg Cylinder", "price": 50.0, "quantity": 1}
            ],
            "total": 50.0,
            "delivery_type": "express"
        }
        
        headers = {"Authorization": f"Bearer {cust_token}"}
        response = requests.post(f"{BASE_URL}/orders", json=order_data, headers=headers, timeout=10)
        if response.status_code != 201:
            print(f"    [-] Order creation failed: {response.text}")
            return False
        
        order = response.json()
        order_id = order.get("id")
        print(f"    [+] Order created: {order_id}")
        print(f"        Status: {order.get('status')}")
        
        # 3. Get available orders as rider
        print("\n[*] Step 3: Rider checks available orders...")
        rider_headers = {"Authorization": f"Bearer {rider_token}"}
        
        response = requests.get(f"{BASE_URL}/rider/orders/available", headers=rider_headers, timeout=10)
        if response.status_code != 200:
            print(f"    [-] Failed to get available orders: {response.text}")
            return False
        
        available_orders = response.json()
        print(f"    [+] Found {len(available_orders)} available orders")
        
        # Verify our order is in the list
        if not any(o.get('id') == order_id for o in available_orders):
            print(f"    [-] Our order not in available list!")
            return False
        
        print(f"    [+] Order {order_id} is available for pickup")
        
        # 4. Rider accepts order
        print("\n[*] Step 4: Rider accepts order...")
        response = requests.post(f"{BASE_URL}/rider/orders/{order_id}/accept", headers=rider_headers, timeout=10)
        if response.status_code != 200:
            print(f"    [-] Failed to accept order: {response.text}")
            return False
        
        accepted_order = response.json()
        print(f"    [+] Order accepted!")
        print(f"        New Status: {accepted_order.get('status')}")
        print(f"        Assigned Rider: {accepted_order.get('assigned_rider_id') or accepted_order.get('rider_id')}")
        
        # 5. Get rider's active orders
        print("\n[*] Step 5: Rider checks active orders...")
        response = requests.get(f"{BASE_URL}/rider/orders?status=accepted", headers=rider_headers, timeout=10)
        if response.status_code != 200:
            print(f"    [-] Failed: {response.text}")
            return False
        
        rider_orders = response.json()
        print(f"    [+] Rider has {len(rider_orders)} active order(s)")
        
        if any(o.get('id') == order_id for o in rider_orders):
            print(f"    [+] Order {order_id} is in rider's active list")
        
        # 6. Rider updates status to pickup_in_progress
        print("\n[*] Step 6: Rider starts pickup...")
        status_update = {
            "status": "pickup_in_progress",
            "location": "Warehouse Gate A",
            "notes": "Starting pickup"
        }
        
        response = requests.put(
            f"{BASE_URL}/rider/orders/{order_id}/status",
            json=status_update,
            headers=rider_headers,
            timeout=10
        )
        if response.status_code != 200:
            print(f"    [-] Failed: {response.text}")
            return False
        
        updated = response.json()
        print(f"    [+] Status updated to: {updated.get('status')}")
        if updated.get('tracking_info'):
            print(f"        Tracking Info: {json.dumps(updated.get('tracking_info'), indent=8)[:200]}...")
        
        # 7. Rider updates status to delivery_in_progress
        print("\n[*] Step 7: Rider starts delivery...")
        status_update = {
            "status": "delivery_in_progress",
            "location": "Accra Tech Park Gate",
            "notes": "On the way to delivery location"
        }
        
        response = requests.put(
            f"{BASE_URL}/rider/orders/{order_id}/status",
            json=status_update,
            headers=rider_headers,
            timeout=10
        )
        if response.status_code != 200:
            print(f"    [-] Failed: {response.text}")
            return False
        
        updated = response.json()
        print(f"    [+] Status updated to: {updated.get('status')}")
        
        # 8. Rider completes delivery
        print("\n[*] Step 8: Rider completes delivery...")
        status_update = {
            "status": "delivered",
            "location": "Accra Tech Park Reception",
            "notes": "Successfully delivered"
        }
        
        response = requests.put(
            f"{BASE_URL}/rider/orders/{order_id}/status",
            json=status_update,
            headers=rider_headers,
            timeout=10
        )
        if response.status_code != 200:
            print(f"    [-] Failed: {response.text}")
            return False
        
        final_order = response.json()
        print(f"    [+] Order delivered!")
        print(f"        Final Status: {final_order.get('status')}")
        
        # 9. Customer checks order tracking
        print("\n[*] Step 9: Customer checks order tracking...")
        response = requests.get(f"{BASE_URL}/customer/orders", headers=headers, timeout=10)
        if response.status_code != 200:
            print(f"    [-] Failed: {response.text}")
            return False
        
        customer_orders = response.json()
        tracked_order = next((o for o in customer_orders if o.get('id') == order_id), None)
        
        if tracked_order:
            print(f"    [+] Customer can see order {order_id}")
            print(f"        Status: {tracked_order.get('status')}")
            if tracked_order.get('tracking_info'):
                print(f"        Tracking Info Available: Yes")
                print(f"        Last Location: {tracked_order.get('tracking_info', {}).get('current_location', 'N/A')}")
        else:
            print(f"    [-] Order not found in customer orders!")
            return False
        
        print("\n[SUCCESS] Complete order tracking workflow tested successfully!")
        print(f"\nOrder Journey: {order_id}")
        print("  pending -> accepted -> pickup_in_progress -> delivery_in_progress -> delivered")
        
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
    success = test_order_tracking()
    exit(0 if success else 1)
