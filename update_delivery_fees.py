"""
Migration script to update delivery fees for existing orders based on customer location
Fees are calculated from gas station to customer, capped at 50% of order total
"""
import sqlite3
import json
from math import radians, sin, cos, sqrt, atan2

DB_PATH = "gasfill.db"

# Gas Station/Depot location (GasFill Main Station - Accra, Ghana)
STATION_LAT = 5.6037
STATION_LNG = -0.1870

def calculate_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """
    Calculate distance between two coordinates using Haversine formula
    Returns distance in meters
    """
    # Earth's radius in meters
    R = 6371000
    
    # Convert to radians
    lat1_rad = radians(lat1)
    lat2_rad = radians(lat2)
    delta_lat = radians(lat2 - lat1)
    delta_lng = radians(lng2 - lng1)
    
    # Haversine formula
    a = sin(delta_lat / 2) ** 2 + cos(lat1_rad) * cos(lat2_rad) * sin(delta_lng / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    distance = R * c
    
    return distance

def calculate_delivery_fee(distance_meters: float, order_total: float = 0) -> float:
    """
    Calculate delivery fee based on distance from gas station to customer
    Base fee: 10 GHS for first 500 meters
    Additional: 2 GHS per additional 500 meters
    Maximum: 50% of order total (gas price cap)
    """
    BASE_DISTANCE = 500  # meters
    BASE_FEE = 10.0  # GHS
    ADDITIONAL_FEE_PER_500M = 2.0  # GHS
    MAX_FEE_PERCENTAGE = 0.5  # 50% of order total
    
    if distance_meters <= BASE_DISTANCE:
        calculated_fee = BASE_FEE
    else:
        # Calculate additional 500m increments
        additional_distance = distance_meters - BASE_DISTANCE
        additional_increments = (additional_distance + BASE_DISTANCE - 1) // BASE_DISTANCE  # Ceiling division
        calculated_fee = BASE_FEE + (additional_increments * ADDITIONAL_FEE_PER_500M)
    
    # Apply 50% cap based on order total
    if order_total > 0:
        max_fee = order_total * MAX_FEE_PERCENTAGE
        calculated_fee = min(calculated_fee, max_fee)
    
    return round(calculated_fee, 2)

def update_order_delivery_fees():
    """Update delivery fees for all orders with customer_location"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Get all orders with customer_location and total
        cursor.execute("""
            SELECT id, customer_location, delivery_fee, total 
            FROM orders 
            WHERE customer_location IS NOT NULL
        """)
        
        orders = cursor.fetchall()
        updated_count = 0
        skipped_count = 0
        
        print(f"\n📦 Found {len(orders)} orders with customer location")
        print("=" * 60)
        
        for order_id, customer_location_str, current_fee, order_total in orders:
            try:
                # Parse customer location JSON
                customer_location = json.loads(customer_location_str)
                customer_lat = customer_location.get('lat')
                customer_lng = customer_location.get('lng')
                
                if not customer_lat or not customer_lng:
                    print(f"⚠️  Order {order_id}: Invalid location data, skipping")
                    skipped_count += 1
                    continue
                
                # Calculate distance from gas station to customer
                distance_meters = calculate_distance(
                    STATION_LAT, STATION_LNG,
                    customer_lat, customer_lng
                )
                
                # Calculate new delivery fee with 50% cap
                new_fee = calculate_delivery_fee(distance_meters, order_total)
                uncapped_fee = calculate_delivery_fee(distance_meters, 0)
                
                # Update if fee has changed
                if abs(new_fee - current_fee) > 0.01:  # Allow for small floating point differences
                    cursor.execute("""
                        UPDATE orders 
                        SET delivery_fee = ? 
                        WHERE id = ?
                    """, (new_fee, order_id))
                    
                    cap_msg = f" (capped from ₵{uncapped_fee:.2f})" if uncapped_fee != new_fee else ""
                    print(f"✅ Order {order_id}:")
                    print(f"   Distance: {distance_meters:.0f}m ({distance_meters/1000:.2f}km)")
                    print(f"   Order total: ₵{order_total:.2f}")
                    print(f"   Old fee: ₵{current_fee:.2f} → New fee: ₵{new_fee:.2f}{cap_msg}")
                    updated_count += 1
                else:
                    print(f"✓  Order {order_id}: Fee already correct (₵{current_fee:.2f})")
                    skipped_count += 1
                    
            except json.JSONDecodeError:
                print(f"⚠️  Order {order_id}: Could not parse location JSON, skipping")
                skipped_count += 1
            except Exception as e:
                print(f"❌ Order {order_id}: Error - {e}")
                skipped_count += 1
        
        # Commit changes
        conn.commit()
        
        print("=" * 60)
        print(f"\n✅ Migration complete!")
        print(f"   Updated: {updated_count} orders")
        print(f"   Skipped: {skipped_count} orders")
        print(f"   Total: {len(orders)} orders\n")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    print("\n🚀 Starting delivery fee migration...")
    update_order_delivery_fees()
