from app.database import SessionLocal
from app.models import Material, Contractor

db = SessionLocal()

# Seed Materials
materials = [
    {"code": "CEM001", "name": "Cement", "unit": "bags"},
    {"code": "STL001", "name": "Steel Rods", "unit": "kg"},
    {"code": "SND001", "name": "Sand", "unit": "cubic meters"},
    {"code": "BRK001", "name": "Bricks", "unit": "pieces"},
    {"code": "GRV001", "name": "Gravel", "unit": "cubic meters"},
]

# Seed Contractors
contractors = [
    {"code": "CON001", "name": "Sharma Construction", "phone": "9876543210"},
    {"code": "CON002", "name": "Patel Builders", "phone": "9876543211"},
    {"code": "CON003", "name": "Singh Infrastructure", "phone": "9876543212"},
    {"code": "CON004", "name": "Kumar & Sons", "phone": "9876543213"},
]

print("Seeding materials...")
for m in materials:
    existing = db.query(Material).filter(Material.code == m["code"]).first()
    if not existing:
        db.add(Material(**m))
        print(f"  Added: {m['name']}")
    else:
        print(f"  Skipped (exists): {m['name']}")

print("\nSeeding contractors...")
for c in contractors:
    existing = db.query(Contractor).filter(Contractor.code == c["code"]).first()
    if not existing:
        db.add(Contractor(**c))
        print(f"  Added: {c['name']}")
    else:
        print(f"  Skipped (exists): {c['name']}")

db.commit()
db.close()
print("\nDone!")
