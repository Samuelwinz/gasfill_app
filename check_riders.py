import sqlite3

conn = sqlite3.connect('gasfill.db')
cur = conn.cursor()
cur.execute("SELECT id, email, status, location FROM riders WHERE email LIKE '%gasfill%'")
riders = cur.fetchall()

print("Riders in database:")
for r in riders:
    print(f'\nID: {r[0]}')
    print(f'Email: {r[1]}')
    print(f'Status: {r[2]}')
    print(f'Location: {r[3]}')

conn.close()
