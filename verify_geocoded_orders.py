"""
Verify Geocoded Orders
-----------------------
Check that orders were successfully geocoded.
"""

import sqlite3
import json

DB_PATH = "gasfill.db"

def verify_geocoded_orders():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Get test orders
    cursor.execute("""
        SELECT id, customer_name, customer_address, customer_location
        FROM orders
        WHERE id LIKE 'TEST-%'
        ORDER BY id
    """)
    
    orders = cursor.fetchall()
    conn.close()
    
    print("=" * 70)
    print("Geocoded Orders Verification")
    print("=" * 70)
    print()
    
    geocoded = 0
    not_geocoded = 0
    
    for order in orders:
        print(f"Order: {order['id']}")
        print(f"  Customer: {order['customer_name']}")
        print(f"  Address: {order['customer_address']}")
        
        if order['customer_location']:
            try:
                location = json.loads(order['customer_location'])
                print(f"  ✓ Location: {location['lat']:.5f}, {location['lng']:.5f}")
                geocoded += 1
            except:
                print(f"  ✗ Invalid location data: {order['customer_location']}")
                not_geocoded += 1
        else:
            print(f"  ✗ No location")
            not_geocoded += 1
        
        print()
    
    print("=" * 70)
    print(f"✓ Geocoded: {geocoded}")
    print(f"✗ Not geocoded: {not_geocoded}")
    print(f"Total: {len(orders)}")
    print("=" * 70)

if __name__ == "__main__":
    verify_geocoded_orders()
