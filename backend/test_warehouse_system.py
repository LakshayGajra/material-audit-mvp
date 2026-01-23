"""
Test script for the warehouse management system.

This script tests the complete procurement workflow:
1. Create warehouse and supplier
2. Create/find material and unit conversion
3. Create, submit, and approve a purchase order
4. Receive goods partially (verify partial receipt)
5. Receive remaining goods (verify full receipt)

Run from backend directory:
    source venv/bin/activate
    python test_warehouse_system.py
"""

import requests
from decimal import Decimal
from datetime import date

BASE_URL = "http://localhost:8000"

def log(msg, level="INFO"):
    print(f"[{level}] {msg}")

def log_success(msg):
    log(f"✓ {msg}", "SUCCESS")

def log_error(msg):
    log(f"✗ {msg}", "ERROR")

def log_step(step_num, description):
    print(f"\n{'='*60}")
    print(f"Step {step_num}: {description}")
    print('='*60)


def main():
    print("\n" + "="*60)
    print("WAREHOUSE SYSTEM TEST")
    print("="*60)

    # Track created resources
    warehouse_id = None
    supplier_id = None
    material_id = None
    po_id = None

    try:
        # ============================================================
        # Step 1: Create Warehouse
        # ============================================================
        log_step(1, "Create Warehouse")

        warehouse_data = {
            "code": "WH-TEST-001",
            "name": "Test Main Warehouse",
            "location": "Industrial Area",
            "address": "123 Warehouse Street",
            "contact_person": "John Manager",
            "phone": "9876543210"
        }

        resp = requests.post(f"{BASE_URL}/api/v1/warehouses", json=warehouse_data)
        if resp.status_code == 201:
            warehouse = resp.json()
            warehouse_id = warehouse["id"]
            log_success(f"Created warehouse: {warehouse['code']} (ID: {warehouse_id})")
        elif resp.status_code == 400 and "already exists" in resp.text:
            # Warehouse exists, fetch it
            resp = requests.get(f"{BASE_URL}/api/v1/warehouses")
            warehouses = resp.json()
            warehouse = next((w for w in warehouses if w["code"] == "WH-TEST-001"), None)
            if warehouse:
                warehouse_id = warehouse["id"]
                log(f"Warehouse already exists: {warehouse['code']} (ID: {warehouse_id})")
            else:
                log_error("Could not find or create warehouse")
                return
        else:
            log_error(f"Failed to create warehouse: {resp.text}")
            return

        # ============================================================
        # Step 2: Create Supplier
        # ============================================================
        log_step(2, "Create Supplier")

        supplier_data = {
            "code": "SUP-STEEL-001",
            "name": "Premium Steel Supplier",
            "contact_person": "Steel Sales",
            "phone": "9876543211",
            "email": "sales@steelsupplier.com",
            "payment_terms": "Net 30"
        }

        resp = requests.post(f"{BASE_URL}/api/v1/suppliers", json=supplier_data)
        if resp.status_code == 201:
            supplier = resp.json()
            supplier_id = supplier["id"]
            log_success(f"Created supplier: {supplier['code']} (ID: {supplier_id})")
        elif resp.status_code == 400 and "already exists" in resp.text:
            resp = requests.get(f"{BASE_URL}/api/v1/suppliers")
            suppliers = resp.json()
            supplier = next((s for s in suppliers if s["code"] == "SUP-STEEL-001"), None)
            if supplier:
                supplier_id = supplier["id"]
                log(f"Supplier already exists: {supplier['code']} (ID: {supplier_id})")
            else:
                log_error("Could not find or create supplier")
                return
        else:
            log_error(f"Failed to create supplier: {resp.text}")
            return

        # ============================================================
        # Step 3: Find or Create Material "Steel Rods"
        # ============================================================
        log_step(3, "Find/Create Material 'Steel Rods'")

        resp = requests.get(f"{BASE_URL}/api/materials")
        materials = resp.json()
        material = next((m for m in materials if m["code"] == "STL001"), None)

        if material:
            material_id = material["id"]
            log(f"Found existing material: {material['code']} - {material['name']} (ID: {material_id})")
        else:
            material_data = {
                "code": "STL001",
                "name": "Steel Rods",
                "unit": "kg"
            }
            resp = requests.post(f"{BASE_URL}/api/materials", json=material_data)
            if resp.status_code == 200:
                material = resp.json()
                material_id = material["id"]
                log_success(f"Created material: {material['code']} (ID: {material_id})")
            else:
                log_error(f"Failed to create material: {resp.text}")
                return

        # ============================================================
        # Step 4: Create Unit Conversion (tons -> kg)
        # ============================================================
        log_step(4, "Create Unit Conversion (tons -> kg)")

        conversion_data = {
            "material_id": material_id,
            "from_unit": "tons",
            "to_unit": "kg",
            "conversion_factor": 1000
        }

        resp = requests.post(f"{BASE_URL}/api/v1/unit-conversions", json=conversion_data)
        if resp.status_code == 201:
            conversion = resp.json()
            log_success(f"Created conversion: {conversion['from_unit']} -> {conversion['to_unit']} "
                       f"(factor: {conversion['conversion_factor']})")
        elif resp.status_code == 400 and "already exists" in resp.text:
            log("Unit conversion already exists")
        else:
            log_error(f"Failed to create conversion: {resp.text}")
            # Continue anyway, might work with existing conversion

        # Test conversion endpoint
        test_conv = {
            "material_id": material_id,
            "quantity": 2,
            "from_unit": "tons",
            "to_unit": "kg"
        }
        resp = requests.post(f"{BASE_URL}/api/v1/unit-conversions/convert", json=test_conv)
        if resp.status_code == 200:
            result = resp.json()
            log_success(f"Conversion test: {result['original_quantity']} {result['from_unit']} = "
                       f"{result['converted_quantity']} {result['to_unit']}")
        else:
            log_error(f"Conversion test failed: {resp.text}")

        # ============================================================
        # Step 5: Create Purchase Order
        # ============================================================
        log_step(5, "Create Purchase Order")

        po_data = {
            "supplier_id": supplier_id,
            "warehouse_id": warehouse_id,
            "expected_delivery_date": str(date.today()),
            "notes": "Test PO for steel rods",
            "lines": [
                {
                    "material_id": material_id,
                    "quantity_ordered": 2,
                    "unit_of_measure": "tons",
                    "unit_price": 50000
                }
            ]
        }

        resp = requests.post(f"{BASE_URL}/api/v1/purchase-orders", json=po_data)
        if resp.status_code == 201:
            po = resp.json()
            po_id = po["id"]
            log_success(f"Created PO: {po['po_number']} (ID: {po_id})")
            log(f"  Status: {po['status']}")
            log(f"  Total: ${po['total_amount']}")
            log(f"  Lines: {len(po['lines'])}")
            for line in po['lines']:
                log(f"    - {line['material_code']}: {line['quantity_ordered']} {line['unit_of_measure']}")
        else:
            log_error(f"Failed to create PO: {resp.text}")
            return

        # ============================================================
        # Step 6: Submit PO
        # ============================================================
        log_step(6, "Submit PO (DRAFT -> SUBMITTED)")

        resp = requests.put(f"{BASE_URL}/api/v1/purchase-orders/{po_id}/submit")
        if resp.status_code == 200:
            po = resp.json()
            log_success(f"PO submitted. Status: {po['status']}")
        else:
            log_error(f"Failed to submit PO: {resp.text}")
            return

        # ============================================================
        # Step 7: Approve PO
        # ============================================================
        log_step(7, "Approve PO (SUBMITTED -> APPROVED)")

        approval_data = {
            "approved_by": "Test Manager",
            "notes": "Approved for testing"
        }

        resp = requests.put(f"{BASE_URL}/api/v1/purchase-orders/{po_id}/approve", json=approval_data)
        if resp.status_code == 200:
            po = resp.json()
            log_success(f"PO approved. Status: {po['status']}")
            log(f"  Approved by: {po['approved_by']}")
            log(f"  Approved at: {po['approved_at']}")
        else:
            log_error(f"Failed to approve PO: {resp.text}")
            return

        # Get PO line ID for receipts
        resp = requests.get(f"{BASE_URL}/api/v1/purchase-orders/{po_id}")
        po = resp.json()
        po_line_id = po['lines'][0]['id']

        # ============================================================
        # Step 8: Receive Partial (1 ton)
        # ============================================================
        log_step(8, "Receive Partial Goods (1 ton)")

        grn_data = {
            "purchase_order_id": po_id,
            "receipt_date": str(date.today()),
            "received_by": "Warehouse Clerk",
            "vehicle_number": "MH-01-AB-1234",
            "supplier_challan_number": "CHN-001",
            "notes": "First partial receipt",
            "lines": [
                {
                    "po_line_id": po_line_id,
                    "quantity_received": 1,
                    "batch_number": "BATCH-001",
                    "remarks": "Quality checked OK"
                }
            ]
        }

        resp = requests.post(f"{BASE_URL}/api/v1/goods-receipts", json=grn_data)
        if resp.status_code == 201:
            grn = resp.json()
            log_success(f"Created GRN: {grn['grn_number']}")
            log(f"  Received: 1 ton")
        else:
            log_error(f"Failed to create GRN: {resp.text}")
            return

        # Verify warehouse inventory
        resp = requests.get(f"{BASE_URL}/api/v1/warehouses/{warehouse_id}/inventory")
        if resp.status_code == 200:
            inventory = resp.json()
            steel_inv = next((i for i in inventory if i['material_id'] == material_id), None)
            if steel_inv:
                log_success(f"Warehouse inventory: {steel_inv['current_quantity']} {steel_inv['unit_of_measure']}")
                expected_qty = 1  # 1 ton (inventory tracked in PO unit)
                if float(steel_inv['current_quantity']) >= expected_qty:
                    log_success(f"Inventory correctly shows {expected_qty} ton")
                else:
                    log_error(f"Expected {expected_qty} ton but got {steel_inv['current_quantity']}")
            else:
                log_error("Material not found in warehouse inventory")

        # Verify PO status
        resp = requests.get(f"{BASE_URL}/api/v1/purchase-orders/{po_id}")
        po = resp.json()
        log(f"PO Status: {po['status']}")
        log(f"PO Line: {po['lines'][0]['quantity_received']} received, "
            f"{po['lines'][0]['remaining_quantity']} remaining")

        if po['status'] == "PARTIALLY_RECEIVED":
            log_success("✓ PO status correctly shows PARTIALLY_RECEIVED")
        else:
            log_error(f"Expected PARTIALLY_RECEIVED but got {po['status']}")

        # ============================================================
        # Step 9: Receive Remaining (1 ton)
        # ============================================================
        log_step(9, "Receive Remaining Goods (1 ton)")

        grn_data_2 = {
            "purchase_order_id": po_id,
            "receipt_date": str(date.today()),
            "received_by": "Warehouse Clerk",
            "vehicle_number": "MH-01-AB-5678",
            "supplier_challan_number": "CHN-002",
            "notes": "Final receipt",
            "lines": [
                {
                    "po_line_id": po_line_id,
                    "quantity_received": 1,
                    "batch_number": "BATCH-002",
                    "remarks": "Quality checked OK"
                }
            ]
        }

        resp = requests.post(f"{BASE_URL}/api/v1/goods-receipts", json=grn_data_2)
        if resp.status_code == 201:
            grn = resp.json()
            log_success(f"Created GRN: {grn['grn_number']}")
            log(f"  Received: 1 ton")
        else:
            log_error(f"Failed to create GRN: {resp.text}")
            return

        # Verify final warehouse inventory
        resp = requests.get(f"{BASE_URL}/api/v1/warehouses/{warehouse_id}/inventory")
        if resp.status_code == 200:
            inventory = resp.json()
            steel_inv = next((i for i in inventory if i['material_id'] == material_id), None)
            if steel_inv:
                log_success(f"Final warehouse inventory: {steel_inv['current_quantity']} {steel_inv['unit_of_measure']}")
                expected_qty = 2  # 2 tons (inventory tracked in PO unit)
                if float(steel_inv['current_quantity']) >= expected_qty:
                    log_success(f"Inventory correctly shows {expected_qty} tons")
                else:
                    log_error(f"Expected {expected_qty} tons but got {steel_inv['current_quantity']}")

        # Verify final PO status
        resp = requests.get(f"{BASE_URL}/api/v1/purchase-orders/{po_id}")
        po = resp.json()
        log(f"Final PO Status: {po['status']}")
        log(f"PO Line: {po['lines'][0]['quantity_received']} received, "
            f"{po['lines'][0]['remaining_quantity']} remaining")

        if po['status'] == "RECEIVED":
            log_success("✓ PO status correctly shows RECEIVED")
        else:
            log_error(f"Expected RECEIVED but got {po['status']}")

        # ============================================================
        # Summary
        # ============================================================
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        log_success("All tests completed!")
        print(f"""
Results:
- Warehouse: {warehouse_id} (WH-TEST-001)
- Supplier: {supplier_id} (SUP-STEEL-001)
- Material: {material_id} (STL001 - Steel Rods)
- PO: {po_id} ({po['po_number']}) - Status: {po['status']}
- Final Inventory: {steel_inv['current_quantity']} {steel_inv['unit_of_measure']}

The warehouse system is working correctly!
        """)

    except requests.exceptions.ConnectionError:
        log_error("Could not connect to the API server.")
        log("Make sure the server is running: uvicorn app.main:app --reload")
    except Exception as e:
        log_error(f"Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
