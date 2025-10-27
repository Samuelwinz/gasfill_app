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
    
    # Orders table
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
    
    # Chat rooms table
    cur.execute('''
        CREATE TABLE IF NOT EXISTS chat_rooms (
            id TEXT PRIMARY KEY,
            order_id INTEGER NOT NULL,
            status TEXT DEFAULT 'active',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            last_message TEXT,
            last_message_time TEXT
        )
    ''')
    
    # Chat participants table
    cur.execute('''
        CREATE TABLE IF NOT EXISTS chat_participants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chat_room_id TEXT NOT NULL,
            user_id INTEGER NOT NULL,
            user_type TEXT NOT NULL,
            user_name TEXT NOT NULL,
            user_avatar TEXT,
            joined_at TEXT NOT NULL,
            FOREIGN KEY (chat_room_id) REFERENCES chat_rooms(id),
            UNIQUE(chat_room_id, user_id, user_type)
        )
    ''')
    
    # Chat messages table
    cur.execute('''
        CREATE TABLE IF NOT EXISTS chat_messages (
            id TEXT PRIMARY KEY,
            chat_room_id TEXT NOT NULL,
            sender_id INTEGER NOT NULL,
            sender_type TEXT NOT NULL,
            sender_name TEXT NOT NULL,
            message TEXT NOT NULL,
            message_type TEXT DEFAULT 'text',
            image_url TEXT,
            location_data TEXT,
            is_read INTEGER DEFAULT 0,
            is_delivered INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            read_at TEXT,
            FOREIGN KEY (chat_room_id) REFERENCES chat_rooms(id)
        )
    ''')
    
    # Create indexes for better query performance
    cur.execute('CREATE INDEX IF NOT EXISTS idx_chat_rooms_order ON chat_rooms(order_id)')
    cur.execute('CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(chat_room_id)')
    cur.execute('CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at)')
    cur.execute('CREATE INDEX IF NOT EXISTS idx_chat_participants_room ON chat_participants(chat_room_id)')
    
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

# ============================================================================
# CHAT DATABASE FUNCTIONS
# ============================================================================

def create_or_get_chat_room(order_id: int, customer_id: int, customer_name: str, 
                            rider_id: Optional[int] = None, rider_name: Optional[str] = None) -> Dict[str, Any]:
    """Create or get existing chat room for an order"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    
    # Check if chat room exists for this order
    cur.execute('SELECT * FROM chat_rooms WHERE order_id=?', (order_id,))
    room = cur.fetchone()
    
    now = datetime.now(UTC).isoformat()
    
    if room:
        # Return existing room
        room_id = room['id']
    else:
        # Create new room
        room_id = f"room_ORD-{order_id}"
        cur.execute('''
            INSERT INTO chat_rooms (id, order_id, status, created_at, updated_at)
            VALUES (?, ?, 'active', ?, ?)
        ''', (room_id, order_id, now, now))
        
        # Add customer as participant
        cur.execute('''
            INSERT OR IGNORE INTO chat_participants 
            (chat_room_id, user_id, user_type, user_name, joined_at)
            VALUES (?, ?, 'customer', ?, ?)
        ''', (room_id, customer_id, customer_name, now))
        
        # Add rider as participant if provided
        if rider_id and rider_name:
            cur.execute('''
                INSERT OR IGNORE INTO chat_participants 
                (chat_room_id, user_id, user_type, user_name, joined_at)
                VALUES (?, ?, 'rider', ?, ?)
            ''', (room_id, rider_id, rider_name, now))
        
        conn.commit()
    
    # Get complete room data with participants
    cur.execute('SELECT * FROM chat_rooms WHERE id=?', (room_id,))
    room = cur.fetchone()
    
    # Get participants
    cur.execute('SELECT * FROM chat_participants WHERE chat_room_id=?', (room_id,))
    participants = cur.fetchall()
    
    # Get unread count (placeholder - would need user context)
    unread_count = 0
    
    conn.close()
    
    result = {
        'id': room['id'],
        'order_id': room['order_id'],
        'status': room['status'],
        'created_at': room['created_at'],
        'updated_at': room['updated_at'],
        'last_message': room['last_message'],
        'last_message_time': room['last_message_time'],
        'unread_count': unread_count,
        'participants': [
            {
                'id': p['user_id'],
                'name': p['user_name'],
                'user_type': p['user_type'],
                'avatar': p['user_avatar'],
                'is_online': False  # Would need WebSocket tracking
            } for p in participants
        ]
    }
    
    # Add customer/rider specific fields for backwards compatibility
    for p in participants:
        if p['user_type'] == 'customer':
            result['customer_id'] = p['user_id']
            result['customer_name'] = p['user_name']
            result['customer_avatar'] = p['user_avatar']
        elif p['user_type'] == 'rider':
            result['rider_id'] = p['user_id']
            result['rider_name'] = p['user_name']
            result['rider_avatar'] = p['user_avatar']
    
    return result

def get_chat_messages(chat_room_id: str, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
    """Get messages for a chat room with pagination"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    
    cur.execute('''
        SELECT * FROM chat_messages 
        WHERE chat_room_id=? 
        ORDER BY created_at ASC 
        LIMIT ? OFFSET ?
    ''', (chat_room_id, limit, offset))
    
    rows = cur.fetchall()
    conn.close()
    
    return [{
        'id': row['id'],
        'chat_room_id': row['chat_room_id'],
        'sender_id': row['sender_id'],
        'sender_type': row['sender_type'],
        'sender_name': row['sender_name'],
        'message': row['message'],
        'message_type': row['message_type'],
        'image_url': row['image_url'],
        'location': json.loads(row['location_data']) if row['location_data'] else None,
        'is_read': bool(row['is_read']),
        'is_delivered': bool(row['is_delivered']),
        'created_at': row['created_at'],
        'read_at': row['read_at']
    } for row in rows]

def create_chat_message(message_data: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new chat message"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    
    now = datetime.now(UTC).isoformat()
    message_id = f"msg_{int(datetime.now(UTC).timestamp() * 1000)}"
    
    cur.execute('''
        INSERT INTO chat_messages 
        (id, chat_room_id, sender_id, sender_type, sender_name, message, 
         message_type, image_url, location_data, is_delivered, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    ''', (
        message_id,
        message_data['chat_room_id'],
        message_data['sender_id'],
        message_data['sender_type'],
        message_data['sender_name'],
        message_data.get('message', ''),
        message_data.get('message_type', 'text'),
        message_data.get('image_url'),
        json.dumps(message_data.get('location')) if message_data.get('location') else None,
        now
    ))
    
    # Update chat room's last message
    cur.execute('''
        UPDATE chat_rooms 
        SET last_message=?, last_message_time=?, updated_at=?
        WHERE id=?
    ''', (message_data.get('message', ''), now, now, message_data['chat_room_id']))
    
    conn.commit()
    
    # Fetch the created message
    cur.execute('SELECT * FROM chat_messages WHERE id=?', (message_id,))
    row = cur.fetchone()
    conn.close()
    
    return {
        'id': row['id'],
        'chat_room_id': row['chat_room_id'],
        'sender_id': row['sender_id'],
        'sender_type': row['sender_type'],
        'sender_name': row['sender_name'],
        'message': row['message'],
        'message_type': row['message_type'],
        'image_url': row['image_url'],
        'location': json.loads(row['location_data']) if row['location_data'] else None,
        'is_read': bool(row['is_read']),
        'is_delivered': bool(row['is_delivered']),
        'created_at': row['created_at'],
        'read_at': row['read_at']
    }

def mark_messages_as_read(chat_room_id: str, message_ids: List[str]) -> None:
    """Mark multiple messages as read"""
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    now = datetime.now(UTC).isoformat()
    
    placeholders = ','.join('?' * len(message_ids))
    cur.execute(f'''
        UPDATE chat_messages 
        SET is_read=1, read_at=?
        WHERE chat_room_id=? AND id IN ({placeholders})
    ''', [now, chat_room_id] + message_ids)
    
    conn.commit()
    conn.close()

def get_user_chat_rooms(user_id: int, user_type: str) -> List[Dict[str, Any]]:
    """Get all chat rooms for a user"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    
    # Get all rooms where user is a participant
    cur.execute('''
        SELECT DISTINCT cr.* 
        FROM chat_rooms cr
        JOIN chat_participants cp ON cr.id = cp.chat_room_id
        WHERE cp.user_id=? AND cp.user_type=?
        ORDER BY cr.updated_at DESC
    ''', (user_id, user_type))
    
    rooms = cur.fetchall()
    result = []
    
    for room in rooms:
        # Get participants for this room
        cur.execute('SELECT * FROM chat_participants WHERE chat_room_id=?', (room['id'],))
        participants = cur.fetchall()
        
        # Count unread messages for this user
        cur.execute('''
            SELECT COUNT(*) as unread_count 
            FROM chat_messages 
            WHERE chat_room_id=? AND is_read=0 
            AND NOT (sender_id=? AND sender_type=?)
        ''', (room['id'], user_id, user_type))
        unread_row = cur.fetchone()
        unread_count = unread_row['unread_count'] if unread_row else 0
        
        room_data = {
            'id': room['id'],
            'order_id': room['order_id'],
            'status': room['status'],
            'created_at': room['created_at'],
            'updated_at': room['updated_at'],
            'last_message': room['last_message'],
            'last_message_time': room['last_message_time'],
            'unread_count': unread_count,
            'participants': [
                {
                    'id': p['user_id'],
                    'name': p['user_name'],
                    'user_type': p['user_type'],
                    'avatar': p['user_avatar'],
                    'is_online': False
                } for p in participants
            ]
        }
        
        # Add customer/rider fields
        for p in participants:
            if p['user_type'] == 'customer':
                room_data['customer_id'] = p['user_id']
                room_data['customer_name'] = p['user_name']
                room_data['customer_avatar'] = p['user_avatar']
            elif p['user_type'] == 'rider':
                room_data['rider_id'] = p['user_id']
                room_data['rider_name'] = p['user_name']
                room_data['rider_avatar'] = p['user_avatar']
        
        result.append(room_data)
    
    conn.close()
    return result

def close_chat_room(chat_room_id: str) -> None:
    """Close a chat room"""
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    now = datetime.now(UTC).isoformat()
    
    cur.execute('''
        UPDATE chat_rooms 
        SET status='closed', updated_at=?
        WHERE id=?
    ''', (now, chat_room_id))
    
    conn.commit()
    conn.close()
