"""
Batch Geocode Existing Orders
-------------------------------
This script geocodes orders that have a customer_address but no customer_location.
It uses a geocoding service to convert text addresses to GPS coordinates.

Usage:
    python batch_geocode_orders.py [--dry-run] [--limit N]

Options:
    --dry-run    Show what would be updated without making changes
    --limit N    Only process N orders (for testing)
"""

import sqlite3
import json
import sys
import argparse
from typing import Optional, Dict, List
import requests
import time

# Database connection
import os
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(SCRIPT_DIR, "gasfill.db")

# Geocoding settings
GEOCODING_API = "https://nominatim.openstreetmap.org/search"
GEOCODING_HEADERS = {
    "User-Agent": "GasFill-Batch-Geocoder/1.0"
}

# Ghana bounds for validation
GHANA_BOUNDS = {
    'north': 11.17,
    'south': 4.74,
    'west': -3.26,
    'east': 1.20
}


def is_within_ghana(lat: float, lng: float) -> bool:
    """Check if coordinates are within Ghana bounds."""
    return (GHANA_BOUNDS['south'] <= lat <= GHANA_BOUNDS['north'] and
            GHANA_BOUNDS['west'] <= lng <= GHANA_BOUNDS['east'])


def geocode_address(address: str) -> Optional[Dict[str, float]]:
    """
    Geocode an address using Nominatim (OpenStreetMap).
    
    Args:
        address: The address string to geocode
        
    Returns:
        Dictionary with 'lat' and 'lng' keys, or None if not found
    """
    try:
        # Add Ghana to the query to improve accuracy
        query = f"{address}, Ghana"
        
        params = {
            'q': query,
            'format': 'json',
            'limit': 1,
            'countrycodes': 'gh'  # Limit to Ghana
        }
        
        print(f"  Geocoding: {query}")
        response = requests.get(
            GEOCODING_API, 
            params=params, 
            headers=GEOCODING_HEADERS,
            timeout=10
        )
        
        if response.status_code == 200:
            results = response.json()
            
            if results and len(results) > 0:
                result = results[0]
                lat = float(result['lat'])
                lng = float(result['lon'])
                
                # Validate within Ghana
                if is_within_ghana(lat, lng):
                    print(f"  ✓ Found: {lat:.5f}, {lng:.5f}")
                    return {'lat': lat, 'lng': lng}
                else:
                    print(f"  ✗ Outside Ghana bounds: {lat:.5f}, {lng:.5f}")
                    return None
            else:
                print(f"  ✗ No results found")
                return None
        else:
            print(f"  ✗ API error: {response.status_code}")
            return None
            
    except Exception as e:
        print(f"  ✗ Error: {e}")
        return None


def get_orders_without_location(limit: Optional[int] = None) -> List[Dict]:
    """
    Get orders that have an address but no location.
    
    Args:
        limit: Maximum number of orders to return
        
    Returns:
        List of order dictionaries
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    query = """
        SELECT id, customer_name, customer_address, customer_location, status
        FROM orders
        WHERE customer_address IS NOT NULL 
          AND customer_address != ''
          AND (customer_location IS NULL OR customer_location = '')
        ORDER BY created_at DESC
    """
    
    if limit:
        query += f" LIMIT {limit}"
    
    cursor.execute(query)
    orders = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return orders


def update_order_location(order_id: str, location: Dict[str, float], dry_run: bool = False) -> bool:
    """
    Update an order's customer_location in the database.
    
    Args:
        order_id: The order ID
        location: Dictionary with 'lat' and 'lng' keys
        dry_run: If True, don't actually update the database
        
    Returns:
        True if successful
    """
    if dry_run:
        print(f"  [DRY RUN] Would update order {order_id}")
        return True
    
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        location_json = json.dumps(location)
        
        cursor.execute(
            "UPDATE orders SET customer_location = ? WHERE id = ?",
            (location_json, order_id)
        )
        
        conn.commit()
        conn.close()
        
        print(f"  ✓ Updated order {order_id}")
        return True
        
    except Exception as e:
        print(f"  ✗ Database error: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description='Batch geocode orders without locations')
    parser.add_argument('--dry-run', action='store_true', 
                        help='Show what would be updated without making changes')
    parser.add_argument('--limit', type=int, default=None,
                        help='Maximum number of orders to process')
    parser.add_argument('--delay', type=float, default=1.5,
                        help='Delay between geocoding requests (seconds)')
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("Batch Geocode Orders")
    print("=" * 60)
    
    if args.dry_run:
        print("⚠️  DRY RUN MODE - No changes will be made")
        print()
    
    # Get orders without location
    print(f"Fetching orders without location...")
    orders = get_orders_without_location(args.limit)
    
    if not orders:
        print("✓ No orders found that need geocoding!")
        return
    
    print(f"Found {len(orders)} orders to process")
    print()
    
    # Statistics
    stats = {
        'total': len(orders),
        'geocoded': 0,
        'failed': 0,
        'skipped': 0
    }
    
    # Process each order
    for i, order in enumerate(orders, 1):
        print(f"[{i}/{len(orders)}] Order: {order['id']}")
        print(f"  Customer: {order['customer_name']}")
        print(f"  Address: {order['customer_address']}")
        print(f"  Status: {order['status']}")
        
        # Geocode the address
        location = geocode_address(order['customer_address'])
        
        if location:
            # Update the order
            if update_order_location(order['id'], location, args.dry_run):
                stats['geocoded'] += 1
            else:
                stats['failed'] += 1
        else:
            print(f"  ⊘ Skipped (couldn't geocode)")
            stats['skipped'] += 1
        
        print()
        
        # Respect rate limits (Nominatim requires 1 request/second)
        if i < len(orders):
            time.sleep(args.delay)
    
    # Print summary
    print("=" * 60)
    print("Summary")
    print("=" * 60)
    print(f"Total orders processed: {stats['total']}")
    print(f"✓ Successfully geocoded: {stats['geocoded']}")
    print(f"✗ Failed to update: {stats['failed']}")
    print(f"⊘ Skipped (no location found): {stats['skipped']}")
    print()
    
    if args.dry_run:
        print("This was a DRY RUN - no changes were made")
        print("Run without --dry-run to actually update the database")
    else:
        print("✓ Database updated successfully!")


if __name__ == "__main__":
    main()
