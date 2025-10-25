import sqlite3
import json
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime, UTC

DB_PATH = Path(__file__).parent / 'gasfill.db'

def init_db():
    """Initialize SQLite database with orders table"""
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute('''
        CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY,
            items TEXT,
            total REAL,
            customer_email TEXT,
            customer_name TEXT,
            customer_phone TEXT,
            customer_address TEXT,
            delivery_type TEXT,
            status TEXT,
            payment_status TEXT,
            payment_reference TEXT,
            created_at TEXT,
            updated_at TEXT,
            rider_id INTEGER,
            tracking_info TEXT
        )
    ''')
    conn.commit()
    conn.close()

def _row_to_order(row: sqlite3.Row) -> Dict[str, Any]:
    """Convert SQLite row to order dict"""
    return {
        'id': row['id'],
        'items': json.loads(row['items']) if row['items'] else [],
        'total': row['total'],
        'customer_email': row['customer_email'],
        'customer_name': row['customer_name'],
        'customer_phone': row['customer_phone'],
        'customer_address': row['customer_address'],
        'delivery_type': row['delivery_type'],
        'status': row['status'],
        'payment_status': row['payment_status'],
        'payment_reference': row['payment_reference'],
        'created_at': row['created_at'],
        'updated_at': row['updated_at'],
        'rider_id': row['rider_id'],
        'tracking_info': json.loads(row['tracking_info']) if row['tracking_info'] else None
    }

def create_order(order: Dict[str, Any]) -> Dict[str, Any]:
    """Create or update an order in the database"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute('''INSERT OR REPLACE INTO orders
        (id, items, total, customer_email, customer_name, customer_phone, customer_address, delivery_type, status, payment_status, payment_reference, created_at, updated_at, rider_id, tracking_info)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ''', (
        order.get('id'),
        json.dumps(order.get('items') or []),
        order.get('total'),
        order.get('customer_email'),
        order.get('customer_name'),
        order.get('customer_phone'),
        order.get('customer_address'),
        order.get('delivery_type'),
        order.get('status'),
        order.get('payment_status'),
        order.get('payment_reference'),
        order.get('created_at'),
        order.get('updated_at'),
        order.get('rider_id'),
        json.dumps(order.get('tracking_info')) if order.get('tracking_info') is not None else None
    ))
    conn.commit()
    cur.execute('SELECT * FROM orders WHERE id=?', (order.get('id'),))
    row = cur.fetchone()
    conn.close()
    return _row_to_order(row)

def get_all_orders() -> List[Dict[str, Any]]:
    """Get all orders sorted by creation date (newest first)"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute('SELECT * FROM orders ORDER BY created_at DESC')
    rows = cur.fetchall()
    conn.close()
    return [_row_to_order(r) for r in rows]

def get_orders_for_customer(email: str) -> List[Dict[str, Any]]:
    """Get all orders for a specific customer email"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute('SELECT * FROM orders WHERE customer_email=? ORDER BY created_at DESC', (email,))
    rows = cur.fetchall()
    conn.close()
    return [_row_to_order(r) for r in rows]

def get_order_by_id(order_id: str) -> Optional[Dict[str, Any]]:
    """Get a single order by ID"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute('SELECT * FROM orders WHERE id=?', (order_id,))
    row = cur.fetchone()
    conn.close()
    return _row_to_order(row) if row else None

def update_order_status(order_id: str, status: str, tracking_info: Optional[Dict] = None) -> Optional[Dict[str, Any]]:
    """Update order status and optional tracking info"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    updated_at = datetime.now(UTC).isoformat()
    tracking_json = json.dumps(tracking_info) if tracking_info else None
    cur.execute('UPDATE orders SET status=?, updated_at=?, tracking_info=? WHERE id=?', 
                (status, updated_at, tracking_json, order_id))
    conn.commit()
    cur.execute('SELECT * FROM orders WHERE id=?', (order_id,))
    row = cur.fetchone()
    conn.close()
    return _row_to_order(row) if row else None

def delete_order(order_id: str) -> None:
    """Delete an order by ID"""
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute('DELETE FROM orders WHERE id=?', (order_id,))
    conn.commit()
    conn.close()

def migrate_orders(orders: List[Dict[str, Any]]) -> int:
    """Migrate in-memory orders list into SQLite DB. Returns next order_counter value."""
    init_db()
    max_idx = 0
    for o in list(reversed(orders)):
        oid = o.get('id')
        if not oid:
            continue
        # Try to parse numeric suffix from ORD-<n>
        try:
            num = int(oid.split('-')[-1])
            if num > max_idx:
                max_idx = num
        except Exception:
            pass
        # Insert into DB
        create_order(o)
    
    return max_idx + 1
