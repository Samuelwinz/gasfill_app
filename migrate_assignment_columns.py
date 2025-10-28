"""
Database Migration: Add Order Assignment Columns
Adds the new columns required for the order assignment system
"""
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / 'gasfill.db'

def migrate_database():
    """Add assignment columns to orders table if they don't exist"""
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    # Get existing columns
    cur.execute("PRAGMA table_info(orders)")
    existing_columns = [row[1] for row in cur.fetchall()]
    
    print(f"✓ Found {len(existing_columns)} existing columns in orders table")
    
    # Define new columns to add
    new_columns = [
        ('assignment_expires_at', 'TEXT'),
        ('assignment_attempts', 'INTEGER DEFAULT 0'),
        ('assigned_riders', 'TEXT'),
        ('customer_location', 'TEXT'),
        ('distance_km', 'REAL'),
        ('estimated_time_minutes', 'INTEGER')
    ]
    
    columns_added = 0
    columns_skipped = 0
    
    for col_name, col_type in new_columns:
        if col_name not in existing_columns:
            try:
                cur.execute(f"ALTER TABLE orders ADD COLUMN {col_name} {col_type}")
                print(f"✅ Added column: {col_name} ({col_type})")
                columns_added += 1
            except sqlite3.OperationalError as e:
                print(f"⚠️  Warning adding {col_name}: {e}")
        else:
            print(f"⏭️  Column already exists: {col_name}")
            columns_skipped += 1
    
    conn.commit()
    
    # Verify the migration
    cur.execute("PRAGMA table_info(orders)")
    final_columns = [row[1] for row in cur.fetchall()]
    
    print(f"\n📊 Migration Summary:")
    print(f"   - Columns added: {columns_added}")
    print(f"   - Columns skipped: {columns_skipped}")
    print(f"   - Total columns now: {len(final_columns)}")
    
    # Display all assignment-related columns
    print(f"\n🔍 Assignment System Columns:")
    assignment_cols = [col for col in final_columns if 'assign' in col.lower() or 
                       col in ['customer_location', 'distance_km', 'estimated_time_minutes']]
    for col in assignment_cols:
        print(f"   ✓ {col}")
    
    conn.close()
    print(f"\n✅ Migration complete! Database ready for order assignment system.")

if __name__ == '__main__':
    print("🔧 Starting database migration for order assignment system...\n")
    migrate_database()
