import sys
import hashlib
sys.path.insert(0, '.')
import db

def hash_password(password: str) -> str:
    """Hash password using SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()

db.init_db()

# Create sample customer
sample_customer_email = "ann@gasfill.com"
existing_customer = db.get_user_by_email(sample_customer_email)
if not existing_customer:
    db.create_user({
        "username": "Ann Mensah",
        "email": sample_customer_email,
        "password": hash_password("customer123"),
        "phone": "+233241234567",
        "address": "123 Oxford Street, Accra",
        "role": "customer",
        "is_active": True
    })
    print(f"✅ Sample customer created: {sample_customer_email} / customer123")
else:
    print(f"ℹ️  Customer already exists: {sample_customer_email}")

# Check existing orders
existing_orders = db.get_all_orders()
print(f"📊 Current orders in database: {len(existing_orders)}")

if len(existing_orders) < 3:
    # Create 5 sample orders with different statuses
    sample_orders = [
        {
            "customer_name": "Ann Mensah",
            "customer_email": sample_customer_email,
            "customer_phone": "+233241234567",
            "delivery_address": "123 Oxford Street, Accra",
            "items": [{"name": "12.5kg Gas Cylinder", "quantity": 1, "price": 150.0}],
            "total_amount": 160.0,
            "payment_method": "cash",
            "payment_status": "pending",
            "status": "assigned",
            "rider_id": 1,
            "delivery_fee": 10.0,
            "notes": "Please call when you arrive"
        },
        {
            "customer_name": "Ann Mensah",
            "customer_email": sample_customer_email,
            "customer_phone": "+233241234567",
            "delivery_address": "456 Ring Road, Accra",
            "items": [{"name": "6kg Gas Cylinder", "quantity": 2, "price": 75.0}],
            "total_amount": 160.0,
            "payment_method": "momo",
            "payment_status": "completed",
            "status": "in_transit",
            "rider_id": 1,
            "delivery_fee": 10.0,
            "notes": "Gate code: 1234"
        },
        {
            "customer_name": "Ann Mensah",
            "customer_email": sample_customer_email,
            "customer_phone": "+233241234567",
            "delivery_address": "789 Spintex Road, Accra",
            "items": [{"name": "12.5kg Gas Cylinder", "quantity": 1, "price": 150.0}],
            "total_amount": 160.0,
            "payment_method": "card",
            "payment_status": "completed",
            "status": "delivered",
            "rider_id": 2,
            "delivery_fee": 10.0,
            "notes": "Thank you!"
        },
        {
            "customer_name": "Ann Mensah",
            "customer_email": sample_customer_email,
            "customer_phone": "+233241234567",
            "delivery_address": "321 Tema Station Road, Tema",
            "items": [{"name": "6kg Gas Cylinder", "quantity": 1, "price": 75.0}],
            "total_amount": 85.0,
            "payment_method": "cash",
            "payment_status": "pending",
            "status": "pending",
            "rider_id": None,
            "delivery_fee": 10.0,
            "notes": ""
        },
        {
            "customer_name": "Ann Mensah",
            "customer_email": sample_customer_email,
            "customer_phone": "+233241234567",
            "delivery_address": "555 Airport Residential, Accra",
            "items": [{"name": "12.5kg Gas Cylinder", "quantity": 2, "price": 150.0}],
            "total_amount": 310.0,
            "payment_method": "momo",
            "payment_status": "completed",
            "status": "pickup",
            "rider_id": 2,
            "delivery_fee": 10.0,
            "notes": "Apartment 5B"
        }
    ]
    
    orders_created = 0
    for i, order_data in enumerate(sample_orders, 1):
        try:
            order_id = db.create_order(order_data)
            print(f"✅ Order {i} created: ID={order_id}, Status={order_data['status']}, Rider={order_data.get('rider_id', 'None')}")
            orders_created += 1
        except Exception as e:
            print(f"⚠️  Error creating order {i}: {e}")
            import traceback
            traceback.print_exc()
    
    print(f"\n✅ Created {orders_created} sample orders")
    print(f"📦 Statuses: pending, assigned, in_transit, pickup, delivered")
else:
    print(f"ℹ️  Sample orders already exist ({len(existing_orders)} orders found)")
    for order in existing_orders[:5]:
        print(f"   - Order {order['id']}: {order['status']} - {order['customer_name']}")

print("\n✨ Done!")
