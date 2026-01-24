"""
Seed script for Material Audit MVP.

Run with: python seed.py

This script populates the database with sample data for development and testing.
"""
from decimal import Decimal
from app.database import SessionLocal
from app.models import (
    Material,
    Contractor,
    FinishedGood,
    BOM,
    Warehouse,
    Supplier,
    WarehouseInventory,
    UnitConversion,
    VarianceThreshold,
    ContractorInventory,
)


def seed_materials(db):
    """Seed materials with various units."""
    materials = [
        {"code": "CEM001", "name": "Cement (OPC 53)", "unit": "bags"},
        {"code": "CEM002", "name": "Cement (PPC)", "unit": "bags"},
        {"code": "STL001", "name": "Steel Rods 8mm", "unit": "kg"},
        {"code": "STL002", "name": "Steel Rods 10mm", "unit": "kg"},
        {"code": "STL003", "name": "Steel Rods 12mm", "unit": "kg"},
        {"code": "SND001", "name": "River Sand", "unit": "cubic_meters"},
        {"code": "SND002", "name": "M-Sand", "unit": "cubic_meters"},
        {"code": "BRK001", "name": "Clay Bricks", "unit": "pieces"},
        {"code": "BRK002", "name": "Fly Ash Bricks", "unit": "pieces"},
        {"code": "GRV001", "name": "Gravel 20mm", "unit": "cubic_meters"},
        {"code": "GRV002", "name": "Gravel 40mm", "unit": "cubic_meters"},
        {"code": "TMT001", "name": "TMT Bars Fe500", "unit": "kg"},
        {"code": "PNT001", "name": "Primer Paint", "unit": "liters"},
        {"code": "PNT002", "name": "Exterior Paint", "unit": "liters"},
        {"code": "TIL001", "name": "Floor Tiles 2x2", "unit": "pieces"},
    ]

    print("Seeding materials...")
    created = 0
    for m in materials:
        existing = db.query(Material).filter(Material.code == m["code"]).first()
        if not existing:
            db.add(Material(**m))
            created += 1
            print(f"  Added: {m['name']}")
        else:
            print(f"  Skipped (exists): {m['name']}")
    print(f"  Created {created} materials\n")


def seed_contractors(db):
    """Seed contractors."""
    contractors = [
        {"code": "CON001", "name": "Sharma Construction", "phone": "9876543210"},
        {"code": "CON002", "name": "Patel Builders", "phone": "9876543211"},
        {"code": "CON003", "name": "Singh Infrastructure", "phone": "9876543212"},
        {"code": "CON004", "name": "Kumar & Sons", "phone": "9876543213"},
        {"code": "CON005", "name": "Gupta Enterprises", "phone": "9876543214"},
    ]

    print("Seeding contractors...")
    created = 0
    for c in contractors:
        existing = db.query(Contractor).filter(Contractor.code == c["code"]).first()
        if not existing:
            db.add(Contractor(**c))
            created += 1
            print(f"  Added: {c['name']}")
        else:
            print(f"  Skipped (exists): {c['name']}")
    print(f"  Created {created} contractors\n")


def seed_warehouses(db):
    """Seed warehouses."""
    warehouses = [
        {
            "code": "WH001",
            "name": "Main Warehouse",
            "location": "Industrial Area, Phase 1",
            "address": "Plot 42, Industrial Area, Phase 1, New Delhi - 110001",
            "contact_person": "Rajesh Kumar",
            "phone": "9876500001",
            "is_active": True,
        },
        {
            "code": "WH002",
            "name": "Secondary Warehouse",
            "location": "Industrial Area, Phase 2",
            "address": "Plot 78, Industrial Area, Phase 2, New Delhi - 110002",
            "contact_person": "Suresh Sharma",
            "phone": "9876500002",
            "is_active": True,
        },
        {
            "code": "WH003",
            "name": "Site Storage - Project Alpha",
            "location": "Construction Site Alpha",
            "address": "Near Metro Station, Sector 15, Noida - 201301",
            "contact_person": "Amit Singh",
            "phone": "9876500003",
            "is_active": True,
        },
    ]

    print("Seeding warehouses...")
    created = 0
    for w in warehouses:
        existing = db.query(Warehouse).filter(Warehouse.code == w["code"]).first()
        if not existing:
            db.add(Warehouse(**w))
            created += 1
            print(f"  Added: {w['name']}")
        else:
            print(f"  Skipped (exists): {w['name']}")
    print(f"  Created {created} warehouses\n")


def seed_suppliers(db):
    """Seed suppliers."""
    suppliers = [
        {
            "code": "SUP001",
            "name": "UltraTech Cement Ltd",
            "contact_person": "Vikram Mehta",
            "phone": "9876600001",
            "email": "sales@ultratech.example.com",
            "address": "Cement House, Mumbai - 400001",
            "payment_terms": "Net 30",
            "is_active": True,
        },
        {
            "code": "SUP002",
            "name": "TATA Steel Dealers",
            "contact_person": "Rahul Tata",
            "phone": "9876600002",
            "email": "orders@tatasteel.example.com",
            "address": "Steel Plaza, Jamshedpur - 831001",
            "payment_terms": "Net 45",
            "is_active": True,
        },
        {
            "code": "SUP003",
            "name": "Rajasthan Minerals",
            "contact_person": "Dinesh Rajput",
            "phone": "9876600003",
            "email": "minerals@rajasthan.example.com",
            "address": "Mining Colony, Jodhpur - 342001",
            "payment_terms": "Advance 50%",
            "is_active": True,
        },
        {
            "code": "SUP004",
            "name": "South India Bricks",
            "contact_person": "Murugan K",
            "phone": "9876600004",
            "email": "bricks@southindia.example.com",
            "address": "Brick Works, Chennai - 600001",
            "payment_terms": "Net 15",
            "is_active": True,
        },
        {
            "code": "SUP005",
            "name": "Asian Paints Distributors",
            "contact_person": "Priya Patel",
            "phone": "9876600005",
            "email": "paints@asian.example.com",
            "address": "Color House, Ahmedabad - 380001",
            "payment_terms": "Net 30",
            "is_active": True,
        },
    ]

    print("Seeding suppliers...")
    created = 0
    for s in suppliers:
        existing = db.query(Supplier).filter(Supplier.code == s["code"]).first()
        if not existing:
            db.add(Supplier(**s))
            created += 1
            print(f"  Added: {s['name']}")
        else:
            print(f"  Skipped (exists): {s['name']}")
    print(f"  Created {created} suppliers\n")


def seed_finished_goods(db):
    """Seed finished goods (products)."""
    finished_goods = [
        {"code": "FG001", "name": "Concrete Block 6 inch"},
        {"code": "FG002", "name": "Concrete Block 4 inch"},
        {"code": "FG003", "name": "RCC Slab - Standard"},
        {"code": "FG004", "name": "Boundary Wall Section"},
        {"code": "FG005", "name": "Column Type A"},
        {"code": "FG006", "name": "Beam Type B"},
    ]

    print("Seeding finished goods...")
    created = 0
    for fg in finished_goods:
        existing = db.query(FinishedGood).filter(FinishedGood.code == fg["code"]).first()
        if not existing:
            db.add(FinishedGood(**fg))
            created += 1
            print(f"  Added: {fg['name']}")
        else:
            print(f"  Skipped (exists): {fg['name']}")
    print(f"  Created {created} finished goods\n")


def seed_unit_conversions(db):
    """Seed unit conversions for materials."""
    print("Seeding unit conversions...")

    # Get materials
    cement = db.query(Material).filter(Material.code == "CEM001").first()
    steel_8mm = db.query(Material).filter(Material.code == "STL001").first()
    sand = db.query(Material).filter(Material.code == "SND001").first()
    bricks = db.query(Material).filter(Material.code == "BRK001").first()
    paint = db.query(Material).filter(Material.code == "PNT001").first()

    conversions = []

    # Cement: bags to kg (1 bag = 50 kg)
    if cement:
        conversions.append({
            "material_id": cement.id,
            "from_unit": "bags",
            "to_unit": "kg",
            "conversion_factor": Decimal("50.0"),
        })
        conversions.append({
            "material_id": cement.id,
            "from_unit": "kg",
            "to_unit": "bags",
            "conversion_factor": Decimal("0.02"),
        })
        conversions.append({
            "material_id": cement.id,
            "from_unit": "bags",
            "to_unit": "metric_ton",
            "conversion_factor": Decimal("0.05"),
        })

    # Steel: kg to metric tons
    if steel_8mm:
        conversions.append({
            "material_id": steel_8mm.id,
            "from_unit": "kg",
            "to_unit": "metric_ton",
            "conversion_factor": Decimal("0.001"),
        })
        conversions.append({
            "material_id": steel_8mm.id,
            "from_unit": "metric_ton",
            "to_unit": "kg",
            "conversion_factor": Decimal("1000.0"),
        })

    # Sand: cubic meters to cubic feet (1 m3 = 35.3147 ft3)
    if sand:
        conversions.append({
            "material_id": sand.id,
            "from_unit": "cubic_meters",
            "to_unit": "cubic_feet",
            "conversion_factor": Decimal("35.3147"),
        })
        conversions.append({
            "material_id": sand.id,
            "from_unit": "cubic_feet",
            "to_unit": "cubic_meters",
            "conversion_factor": Decimal("0.0283168"),
        })

    # Bricks: pieces to thousand (1000 pieces = 1 thousand)
    if bricks:
        conversions.append({
            "material_id": bricks.id,
            "from_unit": "pieces",
            "to_unit": "thousand",
            "conversion_factor": Decimal("0.001"),
        })
        conversions.append({
            "material_id": bricks.id,
            "from_unit": "thousand",
            "to_unit": "pieces",
            "conversion_factor": Decimal("1000.0"),
        })

    # Paint: liters to gallons (1 liter = 0.264172 gallons)
    if paint:
        conversions.append({
            "material_id": paint.id,
            "from_unit": "liters",
            "to_unit": "gallons",
            "conversion_factor": Decimal("0.264172"),
        })
        conversions.append({
            "material_id": paint.id,
            "from_unit": "gallons",
            "to_unit": "liters",
            "conversion_factor": Decimal("3.78541"),
        })

    created = 0
    for conv in conversions:
        existing = db.query(UnitConversion).filter(
            UnitConversion.material_id == conv["material_id"],
            UnitConversion.from_unit == conv["from_unit"],
            UnitConversion.to_unit == conv["to_unit"],
        ).first()
        if not existing:
            db.add(UnitConversion(**conv))
            created += 1
            material = db.query(Material).filter(Material.id == conv["material_id"]).first()
            print(f"  Added: {material.name if material else 'Unknown'}: {conv['from_unit']} -> {conv['to_unit']}")
        else:
            print(f"  Skipped (exists): {conv['from_unit']} -> {conv['to_unit']}")
    print(f"  Created {created} unit conversions\n")


def seed_variance_thresholds(db):
    """Seed variance thresholds for materials."""
    print("Seeding variance thresholds...")

    # Get materials
    materials = db.query(Material).all()
    contractors = db.query(Contractor).all()

    thresholds = []

    # Material-level defaults (no contractor)
    for m in materials:
        # High-value materials get tighter thresholds
        if "Steel" in m.name or "TMT" in m.name:
            threshold_pct = Decimal("1.5")  # 1.5% for steel
        elif "Cement" in m.name:
            threshold_pct = Decimal("2.0")  # 2% for cement
        elif "Paint" in m.name:
            threshold_pct = Decimal("3.0")  # 3% for paint (can spill)
        else:
            threshold_pct = Decimal("5.0")  # 5% for aggregates, bricks, etc.

        thresholds.append({
            "contractor_id": None,  # Material default
            "material_id": m.id,
            "threshold_percentage": threshold_pct,
            "is_active": True,
            "created_by": "seed_script",
            "notes": "Material default threshold",
        })

    # Contractor-specific thresholds (stricter for some)
    if contractors and materials:
        # First contractor gets stricter thresholds (good track record)
        con1 = contractors[0]
        for m in materials[:3]:  # First 3 materials
            thresholds.append({
                "contractor_id": con1.id,
                "material_id": m.id,
                "threshold_percentage": Decimal("1.0"),  # 1% stricter
                "is_active": True,
                "created_by": "seed_script",
                "notes": f"Stricter threshold for {con1.name} - good track record",
            })

        # Last contractor gets looser thresholds (newer contractor)
        if len(contractors) > 1:
            con_last = contractors[-1]
            for m in materials[:3]:
                thresholds.append({
                    "contractor_id": con_last.id,
                    "material_id": m.id,
                    "threshold_percentage": Decimal("7.0"),  # 7% more lenient
                    "is_active": True,
                    "created_by": "seed_script",
                    "notes": f"Lenient threshold for {con_last.name} - new contractor",
                })

    created = 0
    for t in thresholds:
        existing = db.query(VarianceThreshold).filter(
            VarianceThreshold.contractor_id == t["contractor_id"],
            VarianceThreshold.material_id == t["material_id"],
        ).first()
        if not existing:
            db.add(VarianceThreshold(**t))
            created += 1
    print(f"  Created {created} variance thresholds\n")


def seed_warehouse_inventory(db):
    """Seed initial warehouse inventory."""
    print("Seeding warehouse inventory...")

    warehouses = db.query(Warehouse).all()
    materials = db.query(Material).all()

    if not warehouses or not materials:
        print("  Skipped - no warehouses or materials found\n")
        return

    main_wh = warehouses[0]  # Main warehouse
    secondary_wh = warehouses[1] if len(warehouses) > 1 else None

    inventory_items = []

    # Main warehouse - well stocked
    for m in materials:
        if "Cement" in m.name:
            qty = Decimal("500")  # 500 bags
            reorder_point = Decimal("100")
            reorder_qty = Decimal("200")
        elif "Steel" in m.name or "TMT" in m.name:
            qty = Decimal("5000")  # 5000 kg
            reorder_point = Decimal("1000")
            reorder_qty = Decimal("3000")
        elif "Sand" in m.name or "Gravel" in m.name:
            qty = Decimal("100")  # 100 cubic meters
            reorder_point = Decimal("20")
            reorder_qty = Decimal("50")
        elif "Brick" in m.name:
            qty = Decimal("10000")  # 10000 pieces
            reorder_point = Decimal("2000")
            reorder_qty = Decimal("5000")
        elif "Paint" in m.name:
            qty = Decimal("200")  # 200 liters
            reorder_point = Decimal("50")
            reorder_qty = Decimal("100")
        elif "Tile" in m.name:
            qty = Decimal("1000")  # 1000 pieces
            reorder_point = Decimal("200")
            reorder_qty = Decimal("500")
        else:
            qty = Decimal("100")
            reorder_point = Decimal("20")
            reorder_qty = Decimal("50")

        inventory_items.append({
            "warehouse_id": main_wh.id,
            "material_id": m.id,
            "current_quantity": qty,
            "unit_of_measure": m.unit,
            "reorder_point": reorder_point,
            "reorder_quantity": reorder_qty,
        })

    # Secondary warehouse - some items, some low stock
    if secondary_wh:
        for i, m in enumerate(materials):
            if i % 2 == 0:  # Only half the materials
                qty = Decimal("50")  # Lower stock
                reorder_point = Decimal("30")
                reorder_qty = Decimal("100")

                inventory_items.append({
                    "warehouse_id": secondary_wh.id,
                    "material_id": m.id,
                    "current_quantity": qty,
                    "unit_of_measure": m.unit,
                    "reorder_point": reorder_point,
                    "reorder_quantity": reorder_qty,
                })

    created = 0
    for inv in inventory_items:
        existing = db.query(WarehouseInventory).filter(
            WarehouseInventory.warehouse_id == inv["warehouse_id"],
            WarehouseInventory.material_id == inv["material_id"],
        ).first()
        if not existing:
            db.add(WarehouseInventory(**inv))
            created += 1
    print(f"  Created {created} warehouse inventory items\n")


def seed_bom(db):
    """Seed Bill of Materials for finished goods."""
    print("Seeding BOM (Bill of Materials)...")

    # Get finished goods and materials
    fg_block_6 = db.query(FinishedGood).filter(FinishedGood.code == "FG001").first()
    fg_block_4 = db.query(FinishedGood).filter(FinishedGood.code == "FG002").first()
    fg_slab = db.query(FinishedGood).filter(FinishedGood.code == "FG003").first()

    cement = db.query(Material).filter(Material.code == "CEM001").first()
    sand = db.query(Material).filter(Material.code == "SND001").first()
    gravel = db.query(Material).filter(Material.code == "GRV001").first()
    steel = db.query(Material).filter(Material.code == "STL001").first()

    bom_items = []

    # Concrete Block 6 inch - requires cement, sand, gravel
    if fg_block_6 and cement and sand and gravel:
        bom_items.extend([
            {"finished_good_id": fg_block_6.id, "material_id": cement.id, "quantity_per_unit": 0.5},  # 0.5 bags per block
            {"finished_good_id": fg_block_6.id, "material_id": sand.id, "quantity_per_unit": 0.002},  # 0.002 m3 per block
            {"finished_good_id": fg_block_6.id, "material_id": gravel.id, "quantity_per_unit": 0.003},  # 0.003 m3 per block
        ])

    # Concrete Block 4 inch - less material
    if fg_block_4 and cement and sand and gravel:
        bom_items.extend([
            {"finished_good_id": fg_block_4.id, "material_id": cement.id, "quantity_per_unit": 0.35},
            {"finished_good_id": fg_block_4.id, "material_id": sand.id, "quantity_per_unit": 0.0015},
            {"finished_good_id": fg_block_4.id, "material_id": gravel.id, "quantity_per_unit": 0.002},
        ])

    # RCC Slab - requires cement, sand, gravel, steel
    if fg_slab and cement and sand and gravel and steel:
        bom_items.extend([
            {"finished_good_id": fg_slab.id, "material_id": cement.id, "quantity_per_unit": 8.0},  # 8 bags per slab
            {"finished_good_id": fg_slab.id, "material_id": sand.id, "quantity_per_unit": 0.4},   # 0.4 m3 per slab
            {"finished_good_id": fg_slab.id, "material_id": gravel.id, "quantity_per_unit": 0.8}, # 0.8 m3 per slab
            {"finished_good_id": fg_slab.id, "material_id": steel.id, "quantity_per_unit": 80.0}, # 80 kg per slab
        ])

    created = 0
    for bom in bom_items:
        existing = db.query(BOM).filter(
            BOM.finished_good_id == bom["finished_good_id"],
            BOM.material_id == bom["material_id"],
        ).first()
        if not existing:
            db.add(BOM(**bom))
            created += 1
    print(f"  Created {created} BOM items\n")


def seed_contractor_inventory(db):
    """Seed initial contractor inventory."""
    print("Seeding contractor inventory...")

    contractors = db.query(Contractor).all()
    materials = db.query(Material).limit(5).all()  # First 5 materials

    if not contractors or not materials:
        print("  Skipped - no contractors or materials found\n")
        return

    created = 0
    for contractor in contractors[:3]:  # First 3 contractors
        for m in materials:
            existing = db.query(ContractorInventory).filter(
                ContractorInventory.contractor_id == contractor.id,
                ContractorInventory.material_id == m.id,
            ).first()
            if not existing:
                # Random initial quantity
                qty = Decimal("100") if "Cement" in m.name else Decimal("50")
                db.add(ContractorInventory(
                    contractor_id=contractor.id,
                    material_id=m.id,
                    quantity=float(qty),
                ))
                created += 1
    print(f"  Created {created} contractor inventory items\n")


def main():
    """Main seed function."""
    print("=" * 60)
    print("Material Audit MVP - Database Seeding")
    print("=" * 60 + "\n")

    db = SessionLocal()

    try:
        # Seed in order of dependencies
        seed_materials(db)
        seed_contractors(db)
        seed_warehouses(db)
        seed_suppliers(db)
        seed_finished_goods(db)

        # Commit base data first
        db.commit()

        # Seed dependent data
        seed_unit_conversions(db)
        seed_variance_thresholds(db)
        seed_warehouse_inventory(db)
        seed_bom(db)
        seed_contractor_inventory(db)

        # Final commit
        db.commit()

        print("=" * 60)
        print("Seeding complete!")
        print("=" * 60)

    except Exception as e:
        print(f"\nError during seeding: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
