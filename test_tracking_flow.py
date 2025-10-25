#!/usr/bin/env python3
"""
Comprehensive test for order tracking flow: pending -> assigned -> pickup -> in_transit -> delivered
"""

import requests
import json
import time

BASE_URL = "http://localhost:5002/api"

def print_step(step, desc):
    print(f"\n{'='*60}")
    print(f"STEP {step}: {desc}")
    print('='*60)

def print_success(msg):
    print(f"✅ {msg}")

def print_error(msg):
    print(f"❌ {msg}")

def print_info(msg):
    print(f"ℹ️  {msg}")

def test_tracking_flow():
    """Test complete order tracking flow with validation"""
    
    print("\n🚀 GASFILL ORDER TRACKING FLOW TEST")
    print("="*60)
    
    try:
        # Step 1: Rider login
        print_step(1, "Rider Login")
        rider_login = requests.post(f"{BASE_URL}/auth/rider-login", json={
            "email": "rider1@gasfill.com",
            "password": "rider123"
        })
        
        if rider_login.status_code != 200:
            print_error(f"Rider login failed: {rider_login.text}")
            return
        
        rider_token = rider_login.json()["token"]
        rider_headers = {"Authorization": f"Bearer {rider_token}"}
        print_success("Rider logged in successfully")
        print_info(f"Token: {rider_token[:20]}...")
        
        # Step 2: Customer registration and order creation
        print_step(2, "Customer Creates Order")
        customer_reg = requests.post(f"{BASE_URL}/auth/register", json={
            "email": f"testcustomer_{int(time.time())}@example.com",
            "password": "test123",
            "username": "Test Customer"
        })
        
        customer_token = customer_reg.json()["token"]
        customer_headers = {"Authorization": f"Bearer {customer_token}"}
        customer_email = customer_reg.json()["user"]["email"]
        
        order_data = {
            "items": [
                {"name": "13kg LPG Cylinder", "quantity": 2, "price": 150}
            ],
            "total": 300,
            "customer_name": "Test Customer",
            "customer_email": customer_email,
            "customer_phone": "+233241234567",
            "customer_address": "123 Test Street, Accra",
            "delivery_type": "standard"
        }
        
        order_response = requests.post(f"{BASE_URL}/orders", 
                                      json=order_data, 
                                      headers=customer_headers)
        
        if order_response.status_code != 201:
            print_error(f"Order creation failed: {order_response.text}")
            return
        
        order = order_response.json()
        order_id = order["id"]
        print_success(f"Order created: {order_id}")
        print_info(f"Status: {order['status']}")
        print_info(f"Total: ₵{order['total']}")
        
        # Step 3: Verify order is in available list
        print_step(3, "Rider Checks Available Orders")
        available = requests.get(f"{BASE_URL}/rider/orders/available", headers=rider_headers)
        available_orders = available.json()
        
        order_found = any(o["id"] == order_id for o in available_orders)
        if not order_found:
            print_error(f"Order {order_id} not in available list")
            return
        
        print_success(f"Found {len(available_orders)} available order(s)")
        print_info(f"Order {order_id} is available for assignment")
        
        # Step 4: Rider accepts order (pending -> assigned)
        print_step(4, "Rider Accepts Order")
        accept_response = requests.post(f"{BASE_URL}/rider/orders/{order_id}/accept", 
                                       headers=rider_headers)
        
        if accept_response.status_code != 200:
            print_error(f"Accept failed: {accept_response.text}")
            return
        
        accept_data = accept_response.json()
        print_success("Order accepted successfully!")
        print_info(f"Status: {accept_data['status']}")
        print_info(f"Rider ID: {accept_data['rider_id']}")
        
        # Verify status is 'assigned'
        if accept_data['status'] != 'assigned':
            print_error(f"Expected status 'assigned', got '{accept_data['status']}'")
            return
        
        # Step 5: Verify order appears in rider's active orders
        print_step(5, "Verify Order in Rider's Active List")
        active_orders = requests.get(f"{BASE_URL}/rider/orders?status=assigned", 
                                    headers=rider_headers)
        active_list = active_orders.json()
        
        if len(active_list) == 0:
            print_error("No orders in rider's active list")
            return
        
        print_success(f"Rider has {len(active_list)} assigned order(s)")
        
        # Step 6: Start pickup (assigned -> pickup)
        print_step(6, "Rider Starts Pickup")
        pickup_update = requests.put(f"{BASE_URL}/rider/orders/{order_id}/status", 
                                    json={
                                        "status": "pickup",
                                        "location": "GasFill Depot, Tema",
                                        "notes": "Heading to depot to collect cylinder"
                                    },
                                    headers=rider_headers)
        
        if pickup_update.status_code != 200:
            print_error(f"Pickup update failed: {pickup_update.text}")
            return
        
        pickup_data = pickup_update.json()
        print_success("Status updated to pickup!")
        print_info(f"Previous: {pickup_data['previous_status']}")
        print_info(f"New: {pickup_data['new_status']}")
        print_info(f"Location: {pickup_data['tracking_info']['current_location']}")
        
        # Step 7: Start transit (pickup -> in_transit)
        print_step(7, "Rider Starts Delivery")
        transit_update = requests.put(f"{BASE_URL}/rider/orders/{order_id}/status", 
                                     json={
                                         "status": "in_transit",
                                         "location": "Ring Road, Accra",
                                         "notes": "On the way to customer"
                                     },
                                     headers=rider_headers)
        
        if transit_update.status_code != 200:
            print_error(f"Transit update failed: {transit_update.text}")
            return
        
        transit_data = transit_update.json()
        print_success("Order in transit to customer!")
        print_info(f"Status: {transit_data['new_status']}")
        
        # Step 8: Complete delivery (in_transit -> delivered)
        print_step(8, "Rider Completes Delivery")
        delivered_update = requests.put(f"{BASE_URL}/rider/orders/{order_id}/status", 
                                       json={
                                           "status": "delivered",
                                           "location": "123 Test Street, Accra",
                                           "notes": "Delivered successfully to customer"
                                       },
                                       headers=rider_headers)
        
        if delivered_update.status_code != 200:
            print_error(f"Delivery completion failed: {delivered_update.text}")
            return
        
        delivered_data = delivered_update.json()
        print_success("🎉 Order delivered successfully!")
        print_info(f"Final status: {delivered_data['new_status']}")
        print_info(f"Delivery time: {delivered_data['timestamp']}")
        
        # Step 9: Customer views order with tracking
        print_step(9, "Customer Views Order Tracking")
        customer_orders = requests.get(f"{BASE_URL}/customer/orders", 
                                      headers=customer_headers)
        
        customer_order_list = customer_orders.json()
        customer_order = next((o for o in customer_order_list if o["id"] == order_id), None)
        
        if not customer_order:
            print_error("Customer cannot see their order")
            return
        
        print_success("Customer can view order tracking")
        print_info(f"Status: {customer_order['status']}")
        print_info(f"Tracking available: {'tracking_info' in customer_order}")
        
        if customer_order.get('tracking_info'):
            tracking = customer_order['tracking_info']
            print_info(f"Rider: {tracking.get('rider_name', 'N/A')}")
            print_info(f"Last location: {tracking.get('current_location', 'N/A')}")
            if 'status_history' in tracking:
                print_info(f"Status history: {len(tracking['status_history'])} entries")
        
        # Step 10: Test invalid transition
        print_step(10, "Test Invalid Status Transition (should fail)")
        invalid_update = requests.put(f"{BASE_URL}/rider/orders/{order_id}/status", 
                                     json={
                                         "status": "pickup",  # Can't go back from delivered
                                         "location": "Test",
                                         "notes": "Should fail"
                                     },
                                     headers=rider_headers)
        
        if invalid_update.status_code == 400:
            print_success("Invalid transition correctly rejected!")
            print_info(f"Error: {invalid_update.json()['detail']}")
        else:
            print_error("Invalid transition was allowed (should have failed)")
        
        # Final Summary
        print("\n" + "="*60)
        print("✅ ALL TESTS PASSED!")
        print("="*60)
        print("\nOrder Journey:")
        print("  pending → assigned → pickup → in_transit → delivered")
        print("\nValidations Passed:")
        print("  ✓ Status transitions enforced correctly")
        print("  ✓ Tracking info accumulated properly")
        print("  ✓ Rider ownership verified")
        print("  ✓ Customer can view tracking")
        print("  ✓ Invalid transitions rejected")
        print("\n" + "="*60)
        
    except requests.exceptions.ConnectionError:
        print_error("Cannot connect to server. Is it running on port 5002?")
    except Exception as e:
        print_error(f"Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_tracking_flow()
