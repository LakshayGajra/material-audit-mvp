"""
Test script for the enhanced material issuance system.

This script tests:
1. Basic issuance with warehouse deduction
2. Unit conversion during issuance
3. Insufficient stock handling
4. Race condition prevention (concurrent issuances)

Run from backend directory:
    source venv/bin/activate
    python test_issuance_system.py
"""

import requests
import threading
import time
from datetime import date
from decimal import Decimal

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


def setup_test_data():
    """Set up test data: warehouse, contractors, materials, and inventory."""
    log_step("SETUP", "Creating test data")

    # Create warehouse
    warehouse_data = {
        "code": "WH-ISSUANCE-TEST",
        "name": "Issuance Test Warehouse",
        "location": "Test Location",
        "is_active": True,
    }
    resp = requests.post(f"{BASE_URL}/api/v1/warehouses", json=warehouse_data)
    if resp.status_code == 201:
        warehouse = resp.json()
        log_success(f"Created warehouse: {warehouse['code']} (ID: {warehouse['id']})")
    elif resp.status_code == 400 and "already exists" in resp.text:
        resp = requests.get(f"{BASE_URL}/api/v1/warehouses")
        warehouses = resp.json()
        warehouse = next((w for w in warehouses if w["code"] == "WH-ISSUANCE-TEST"), None)
        log(f"Warehouse exists: {warehouse['code']} (ID: {warehouse['id']})")
    else:
        log_error(f"Failed to create warehouse: {resp.text}")
        return None

    # Create contractors
    contractors = []
    for code, name in [("CON-ABC", "ABC Contractor"), ("CON-XYZ", "XYZ Contractor")]:
        # First check if contractor already exists
        resp = requests.get(f"{BASE_URL}/api/contractors")
        all_contractors = resp.json()
        contractor = next((c for c in all_contractors if c["code"] == code), None)

        if contractor:
            log(f"Contractor exists: {contractor['code']} (ID: {contractor['id']})")
            contractors.append(contractor)
        else:
            contractor_data = {"code": code, "name": name, "phone": "1234567890"}
            resp = requests.post(f"{BASE_URL}/api/contractors", json=contractor_data)
            if resp.status_code == 200:
                contractor = resp.json()
                log_success(f"Created contractor: {contractor['code']} (ID: {contractor['id']})")
                contractors.append(contractor)
            else:
                log_error(f"Failed to create contractor {code}: {resp.text}")

    if len(contractors) < 2:
        log_error("Need at least 2 contractors for testing")
        return None

    # Create/find materials
    materials = []
    for code, name, unit in [("MAT-STEEL-TEST", "Steel Test", "kg"), ("MAT-BOLTS-TEST", "Bolts Test", "pcs")]:
        resp = requests.get(f"{BASE_URL}/api/materials")
        all_materials = resp.json()
        material = next((m for m in all_materials if m["code"] == code), None)

        if not material:
            material_data = {"code": code, "name": name, "unit": unit}
            resp = requests.post(f"{BASE_URL}/api/materials", json=material_data)
            if resp.status_code == 200:
                material = resp.json()
                log_success(f"Created material: {material['code']} (ID: {material['id']})")
            else:
                log_error(f"Failed to create material {code}: {resp.text}")
                continue
        else:
            log(f"Material exists: {material['code']} (ID: {material['id']})")

        materials.append(material)

    if len(materials) < 2:
        log_error("Need at least 2 materials for testing")
        return None

    # Create unit conversion: tons -> kg for steel
    steel = materials[0]
    conversion_data = {
        "material_id": steel["id"],
        "from_unit": "tons",
        "to_unit": "kg",
        "conversion_factor": 1000
    }
    resp = requests.post(f"{BASE_URL}/api/v1/unit-conversions", json=conversion_data)
    if resp.status_code == 201:
        log_success("Created unit conversion: tons -> kg (factor: 1000)")
    elif resp.status_code == 400 and "already exists" in resp.text:
        log("Unit conversion already exists")
    else:
        log_error(f"Failed to create conversion: {resp.text}")

    # Add inventory to warehouse
    # Steel: 5000kg, Bolts: 10000pcs
    for material, qty, unit in [(materials[0], 5000, "kg"), (materials[1], 10000, "pcs")]:
        inv_data = {
            "warehouse_id": warehouse["id"],
            "material_id": material["id"],
            "current_quantity": qty,
            "unit_of_measure": unit,
            "reorder_point": 100,
            "reorder_quantity": 500
        }
        resp = requests.post(
            f"{BASE_URL}/api/v1/warehouses/{warehouse['id']}/inventory",
            json=inv_data
        )
        if resp.status_code == 201:
            log_success(f"Added {qty} {unit} of {material['code']} to warehouse")
        elif resp.status_code == 400 and "already exists" in resp.text:
            # Update existing inventory
            resp = requests.get(f"{BASE_URL}/api/v1/warehouses/{warehouse['id']}/inventory")
            inventory = resp.json()
            inv_item = next((i for i in inventory if i["material_id"] == material["id"]), None)
            if inv_item:
                update_data = {"current_quantity": qty}
                resp = requests.put(
                    f"{BASE_URL}/api/v1/warehouses/{warehouse['id']}/inventory/{inv_item['id']}",
                    json=update_data
                )
                if resp.status_code == 200:
                    log(f"Reset inventory for {material['code']} to {qty} {unit}")
                else:
                    log_error(f"Failed to update inventory: {resp.text}")
        else:
            log_error(f"Failed to add inventory: {resp.text}")

    return {
        "warehouse": warehouse,
        "contractors": contractors,
        "materials": materials,
    }


def get_warehouse_inventory(warehouse_id, material_id):
    """Get current warehouse inventory for a material."""
    resp = requests.get(f"{BASE_URL}/api/v1/warehouses/{warehouse_id}/inventory")
    if resp.status_code == 200:
        inventory = resp.json()
        return next((i for i in inventory if i["material_id"] == material_id), None)
    return None


def get_contractor_inventory(contractor_id):
    """Get current contractor inventory."""
    resp = requests.get(f"{BASE_URL}/api/contractors/{contractor_id}/inventory")
    if resp.status_code == 200:
        return resp.json()
    return []


def test_basic_issuance(test_data):
    """Test 1: Basic issuance - 500kg Steel to ABC."""
    log_step(1, "Basic Issuance - 500kg Steel to ABC")

    warehouse = test_data["warehouse"]
    abc_contractor = test_data["contractors"][0]
    steel = test_data["materials"][0]

    # Get initial inventory
    initial_wh_inv = get_warehouse_inventory(warehouse["id"], steel["id"])
    initial_qty = float(initial_wh_inv["current_quantity"]) if initial_wh_inv else 0
    log(f"Initial warehouse stock: {initial_qty} {initial_wh_inv['unit_of_measure'] if initial_wh_inv else 'kg'}")

    # Issue 500kg
    issuance_data = {
        "warehouse_id": warehouse["id"],
        "contractor_id": abc_contractor["id"],
        "material_id": steel["id"],
        "quantity": 500,
        "unit_of_measure": "kg",
        "issued_date": str(date.today()),
        "issued_by": "Test User",
        "notes": "Test basic issuance"
    }

    resp = requests.post(f"{BASE_URL}/api/v1/issuances", json=issuance_data)
    if resp.status_code != 201:
        log_error(f"Issuance failed: {resp.text}")
        return False

    issuance = resp.json()
    log_success(f"Created issuance: {issuance['issuance_number']}")

    # Verify warehouse reduced
    final_wh_inv = get_warehouse_inventory(warehouse["id"], steel["id"])
    final_qty = float(final_wh_inv["current_quantity"])
    expected_qty = initial_qty - 500

    if abs(final_qty - expected_qty) < 0.01:
        log_success(f"Warehouse reduced to {final_qty}kg (expected: {expected_qty}kg)")
    else:
        log_error(f"Warehouse has {final_qty}kg, expected {expected_qty}kg")
        return False

    # Verify contractor has material
    contractor_inv = get_contractor_inventory(abc_contractor["id"])
    steel_inv = next((i for i in contractor_inv if i["material_id"] == steel["id"]), None)
    if steel_inv and float(steel_inv["quantity"]) >= 500:
        log_success(f"Contractor ABC has {steel_inv['quantity']} {steel['unit']}")
    else:
        log_error(f"Contractor inventory not updated correctly")
        return False

    # Verify transaction logged
    resp = requests.get(f"{BASE_URL}/api/v1/issuances/{issuance['id']}")
    if resp.status_code == 200:
        log_success("Issuance transaction logged and retrievable")
    else:
        log_error("Could not retrieve issuance transaction")
        return False

    return True


def test_unit_conversion(test_data):
    """Test 2: Unit conversion - Issue 0.5 tons Steel (should convert to 500kg)."""
    log_step(2, "Unit Conversion - 0.5 tons Steel to ABC")

    warehouse = test_data["warehouse"]
    abc_contractor = test_data["contractors"][0]
    steel = test_data["materials"][0]

    # Get initial inventory
    initial_wh_inv = get_warehouse_inventory(warehouse["id"], steel["id"])
    initial_qty = float(initial_wh_inv["current_quantity"]) if initial_wh_inv else 0
    log(f"Initial warehouse stock: {initial_qty} {initial_wh_inv['unit_of_measure'] if initial_wh_inv else 'kg'}")

    # Issue 0.5 tons (should convert to 500kg)
    issuance_data = {
        "warehouse_id": warehouse["id"],
        "contractor_id": abc_contractor["id"],
        "material_id": steel["id"],
        "quantity": 0.5,
        "unit_of_measure": "tons",
        "issued_date": str(date.today()),
        "issued_by": "Test User",
        "notes": "Test unit conversion issuance"
    }

    resp = requests.post(f"{BASE_URL}/api/v1/issuances", json=issuance_data)
    if resp.status_code != 201:
        log_error(f"Issuance failed: {resp.text}")
        return False

    issuance = resp.json()
    log_success(f"Created issuance: {issuance['issuance_number']}")
    log(f"  Issued: {issuance['quantity']} {issuance['unit_of_measure']}")
    log(f"  Converted to: {issuance['quantity_in_base_unit']} {issuance['base_unit']}")

    # Verify conversion was applied (0.5 tons = 500 kg)
    if abs(float(issuance['quantity_in_base_unit']) - 500) < 0.01:
        log_success("Unit conversion correct: 0.5 tons = 500 kg")
    else:
        log_error(f"Unit conversion wrong: expected 500, got {issuance['quantity_in_base_unit']}")
        return False

    # Verify warehouse reduced by 500kg
    final_wh_inv = get_warehouse_inventory(warehouse["id"], steel["id"])
    final_qty = float(final_wh_inv["current_quantity"])
    expected_qty = initial_qty - 500

    if abs(final_qty - expected_qty) < 0.01:
        log_success(f"Warehouse reduced to {final_qty}kg (expected: {expected_qty}kg)")
    else:
        log_error(f"Warehouse has {final_qty}kg, expected {expected_qty}kg")
        return False

    return True


def test_insufficient_stock(test_data):
    """Test 3: Insufficient stock - Try to issue more than available."""
    log_step(3, "Insufficient Stock - Try to issue 5000kg Steel to XYZ")

    warehouse = test_data["warehouse"]
    xyz_contractor = test_data["contractors"][1]
    steel = test_data["materials"][0]

    # Get initial inventory
    initial_wh_inv = get_warehouse_inventory(warehouse["id"], steel["id"])
    initial_qty = float(initial_wh_inv["current_quantity"]) if initial_wh_inv else 0
    log(f"Current warehouse stock: {initial_qty} kg")

    # Try to issue 5000kg (more than available after previous tests)
    issuance_data = {
        "warehouse_id": warehouse["id"],
        "contractor_id": xyz_contractor["id"],
        "material_id": steel["id"],
        "quantity": 5000,
        "unit_of_measure": "kg",
        "issued_date": str(date.today()),
        "issued_by": "Test User",
        "notes": "Test insufficient stock"
    }

    resp = requests.post(f"{BASE_URL}/api/v1/issuances", json=issuance_data)

    if resp.status_code == 400 and "Insufficient" in resp.text:
        log_success(f"Correctly rejected: {resp.json()['detail']}")
    else:
        log_error(f"Should have been rejected but got: {resp.status_code} - {resp.text}")
        return False

    # Verify no changes to warehouse inventory
    final_wh_inv = get_warehouse_inventory(warehouse["id"], steel["id"])
    final_qty = float(final_wh_inv["current_quantity"])

    if abs(final_qty - initial_qty) < 0.01:
        log_success(f"Warehouse inventory unchanged: {final_qty} kg")
    else:
        log_error(f"Warehouse inventory changed unexpectedly: {initial_qty} -> {final_qty}")
        return False

    # Verify no transaction logged for XYZ
    resp = requests.get(f"{BASE_URL}/api/v1/contractors/{xyz_contractor['id']}/issuance-history")
    if resp.status_code == 200:
        history = resp.json()
        # Check if there's any issuance with 5000kg
        large_issuance = [i for i in history.get("items", []) if float(i["quantity"]) >= 5000]
        if not large_issuance:
            log_success("No failed transaction logged")
        else:
            log_error("Failed transaction was incorrectly logged")
            return False

    return True


def test_race_condition(test_data):
    """Test 4: Race condition - Simulate concurrent issuances."""
    log_step(4, "Race Condition - Two concurrent 3000kg issuances")

    warehouse = test_data["warehouse"]
    abc_contractor = test_data["contractors"][0]
    xyz_contractor = test_data["contractors"][1]
    steel = test_data["materials"][0]

    # Reset warehouse inventory to 4000kg for this test
    resp = requests.get(f"{BASE_URL}/api/v1/warehouses/{warehouse['id']}/inventory")
    inventory = resp.json()
    steel_inv = next((i for i in inventory if i["material_id"] == steel["id"]), None)
    if steel_inv:
        update_data = {"current_quantity": 4000}
        resp = requests.put(
            f"{BASE_URL}/api/v1/warehouses/{warehouse['id']}/inventory/{steel_inv['id']}",
            json=update_data
        )
        if resp.status_code == 200:
            log("Reset warehouse inventory to 4000kg for race condition test")

    # Get initial inventory
    initial_wh_inv = get_warehouse_inventory(warehouse["id"], steel["id"])
    initial_qty = float(initial_wh_inv["current_quantity"])
    log(f"Initial warehouse stock: {initial_qty} kg")

    results = {"success": 0, "failed": 0, "errors": []}

    def issue_to_contractor(contractor, amount):
        """Thread function to issue material."""
        issuance_data = {
            "warehouse_id": warehouse["id"],
            "contractor_id": contractor["id"],
            "material_id": steel["id"],
            "quantity": amount,
            "unit_of_measure": "kg",
            "issued_date": str(date.today()),
            "issued_by": "Concurrent Test",
            "notes": f"Race condition test for {contractor['name']}"
        }

        resp = requests.post(f"{BASE_URL}/api/v1/issuances", json=issuance_data)
        if resp.status_code == 201:
            results["success"] += 1
            log(f"  Thread {contractor['code']}: SUCCESS")
        else:
            results["failed"] += 1
            results["errors"].append(resp.json().get("detail", resp.text))
            log(f"  Thread {contractor['code']}: FAILED - {resp.json().get('detail', '')[:50]}")

    # Create and start threads
    log("Starting concurrent issuances (3000kg each)...")
    thread1 = threading.Thread(target=issue_to_contractor, args=(abc_contractor, 3000))
    thread2 = threading.Thread(target=issue_to_contractor, args=(xyz_contractor, 3000))

    thread1.start()
    thread2.start()

    thread1.join()
    thread2.join()

    log(f"Results: {results['success']} succeeded, {results['failed']} failed")

    # Verify exactly one succeeded
    if results["success"] == 1 and results["failed"] == 1:
        log_success("Race condition handled correctly: one succeeded, one failed")
    else:
        log_error(f"Unexpected results: {results['success']} succeeded, {results['failed']} failed")
        return False

    # Verify final warehouse inventory
    final_wh_inv = get_warehouse_inventory(warehouse["id"], steel["id"])
    final_qty = float(final_wh_inv["current_quantity"])
    expected_qty = initial_qty - 3000  # Only one issuance should have succeeded

    if abs(final_qty - expected_qty) < 0.01:
        log_success(f"Final warehouse inventory: {final_qty}kg (expected: {expected_qty}kg)")
    else:
        log_error(f"Final inventory wrong: {final_qty}kg, expected {expected_qty}kg")
        return False

    # Verify inventory is not negative
    if final_qty >= 0:
        log_success("Inventory is not negative (race condition prevented)")
    else:
        log_error(f"CRITICAL: Inventory went negative: {final_qty}")
        return False

    return True


def main():
    print("\n" + "="*60)
    print("ENHANCED ISSUANCE SYSTEM TEST")
    print("="*60)

    try:
        # Setup
        test_data = setup_test_data()
        if not test_data:
            log_error("Failed to set up test data")
            return

        results = {
            "Test 1 - Basic Issuance": test_basic_issuance(test_data),
            "Test 2 - Unit Conversion": test_unit_conversion(test_data),
            "Test 3 - Insufficient Stock": test_insufficient_stock(test_data),
            "Test 4 - Race Condition": test_race_condition(test_data),
        }

        # Summary
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)

        passed = sum(1 for v in results.values() if v)
        total = len(results)

        for test_name, result in results.items():
            status = "PASSED" if result else "FAILED"
            symbol = "✓" if result else "✗"
            print(f"  {symbol} {test_name}: {status}")

        print(f"\nTotal: {passed}/{total} tests passed")

        if passed == total:
            log_success("All tests passed!")
        else:
            log_error(f"{total - passed} test(s) failed")

    except requests.exceptions.ConnectionError:
        log_error("Could not connect to the API server.")
        log("Make sure the server is running: uvicorn app.main:app --reload")
    except Exception as e:
        log_error(f"Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
