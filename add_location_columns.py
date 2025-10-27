#!/usr/bin/env python3
"""
Migration script to add customer_location column to orders table
"""
import sqlite3
import json

DB_PATH = "gasfill.db"

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    # Check if customer_location column exists
    cur.execute("PRAGMA table_info(orders)")
    columns = [row[1] for row in cur.fetchall()]
    
    if 'customer_location' not in columns:
        print("Adding customer_location column to orders table...")
        cur.execute("ALTER TABLE orders ADD COLUMN customer_location TEXT")
        conn.commit()
        print("✅ Added customer_location column")
    else:
        print("✅ customer_location column already exists")
    
    conn.close()
    print("\n✅ Migration complete!")

if __name__ == "__main__":
    migrate()
