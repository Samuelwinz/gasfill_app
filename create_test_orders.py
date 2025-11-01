"""
Create Sample Orders with Ghana Addresses
------------------------------------------
This script creates sample orders with real Ghana addresses for testing geocoding.
"""

import sqlite3
import json
from datetime import datetime

DB_PATH = "gasfill.db"

GHANA_ADDRESSES = [
    "Circle, Accra",
    "Osu, Accra",
    "Tema Station, Tema",
    "Madina Market, Greater Accra",
    "University of Ghana, Legon",
    "Accra Mall, Tetteh Quarshie",
    "Kotoka International Airport, Accra",
    "Ridge, Accra",
    "Dansoman, Accra",
    "Labadi Beach, Accra",
]

def create_test_orders():
    """Create sample orders with Ghana addresses but no location."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    created_count = 0
    
    for i, address in enumerate(GHANA_ADDRESSES, 1):
        order_id = f"TEST-{datetime.now().strftime('%Y%m%d')}-{i:03d}"
        
        # Check if order already exists
        cursor.execute("SELECT id FROM orders WHERE id = ?", (order_id,))
        if cursor.fetchone():
            print(f"⊘ Order {order_id} already exists, skipping")
            continue
        
        order_data = {
            'id': order_id,
            'customer_name': f'Test Customer {i}',
            'customer_email': f'test{i}@gasfill.com',
            'customer_phone': f'0{200000000 + i}',
            'customer_address': address,
            'customer_location': None,  # No location yet
            'total': 120.00,
            'delivery_type': 'standard',
            'status': 'pending',
            'payment_status': 'pending',
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        # Sample items
        items = [
            {'name': '13kg Gas Cylinder Refill', 'quantity': 1, 'price': 120.00}
        ]
        items_json = json.dumps(items)
        
        cursor.execute("""
            INSERT INTO orders (
                id, items, customer_name, customer_email, customer_phone,
                customer_address, customer_location, total, delivery_type,
                status, payment_status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            order_data['id'], items_json, order_data['customer_name'],
            order_data['customer_email'], order_data['customer_phone'],
            order_data['customer_address'], order_data['customer_location'],
            order_data['total'], order_data['delivery_type'],
            order_data['status'], order_data['payment_status'],
            order_data['created_at'], order_data['updated_at']
        ))
        
        print(f"✓ Created order {order_id}: {address}")
        created_count += 1
    
    conn.commit()
    conn.close()
    
    print()
    print(f"✓ Created {created_count} test orders")
    print(f"⊘ Skipped {len(GHANA_ADDRESSES) - created_count} existing orders")
    print()
    print("Now run: python batch_geocode_orders.py --dry-run")

if __name__ == "__main__":
    create_test_orders()
