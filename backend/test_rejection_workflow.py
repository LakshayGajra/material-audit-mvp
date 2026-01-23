"""
Test script for the rejection tracking workflow.

This script tests the complete rejection workflow:
1. Contractor reports rejected material (REPORTED)
2. Manager approves rejection (APPROVED)
3. Warehouse receives returned material (RECEIVED_AT_WAREHOUSE)

Run from backend directory:
    source venv/bin/activate
    python test_rejection_workflow.py
"""

import requests
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


def setup_test_data():
    """Set up test data for rejection workflow."""
    log_step("SETUP", "Creating test data")

    # Create/find warehouse
    warehouse_data = {
        "code": "WH-REJ-TEST",
        "name": "Rejection Test Warehouse",
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
        warehouse = next((w for w in warehouses if w["code"] == "WH-REJ-TEST"), None)
        log(f"Warehouse exists: {warehouse['code']} (ID: {warehouse['id']})")
    else:
        log_error(f"Failed to create warehouse: {resp.text}")
        return None

    # Create/find contractor
    resp = requests.get(f"{BASE_URL}/api/contractors")
    all_contractors = resp.json()
    contractor = next((c for c in all_contractors if c["code"] == "CON-REJ-TEST"), None)

    if not contractor:
        contractor_data = {"code": "CON-REJ-TEST", "name": "Rejection Test Contractor", "phone": "1234567890"}
        resp = requests.post(f"{BASE_URL}/api/contractors", json=contractor_data)
        if resp.status_code == 200:
            contractor = resp.json()
            log_success(f"Created contractor: {contractor['code']} (ID: {contractor['id']})")
        else:
            log_error(f"Failed to create contractor: {resp.text}")
            return None
    else:
        log(f"Contractor exists: {contractor['code']} (ID: {contractor['id']})")

    # Create/find material
    resp = requests.get(f"{BASE_URL}/api/materials")
    all_materials = resp.json()
    material = next((m for m in all_materials if m["code"] == "MAT-REJ-TEST"), None)

    if not material:
        material_data = {"code": "MAT-REJ-TEST", "name": "Rejection Test Steel", "unit": "kg"}
        resp = requests.post(f"{BASE_URL}/api/materials", json=material_data)
        if resp.status_code == 200:
            material = resp.json()
            log_success(f"Created material: {material['code']} (ID: {material['id']})")
        else:
            log_error(f"Failed to create material: {resp.text}")
            return None
    else:
        log(f"Material exists: {material['code']} (ID: {material['id']})")

    # Set up warehouse inventory: 5000kg
    inv_data = {
        "warehouse_id": warehouse["id"],
        "material_id": material["id"],
        "current_quantity": 5000,
        "unit_of_measure": "kg",
        "reorder_point": 100,
        "reorder_quantity": 500
    }

    # Check if inventory exists
    resp = requests.get(f"{BASE_URL}/api/v1/warehouses/{warehouse['id']}/inventory")
    inventory = resp.json()
    existing_inv = next((i for i in inventory if i["material_id"] == material["id"]), None)

    if existing_inv:
        # Update to reset
        update_data = {"current_quantity": 5000}
        resp = requests.put(
            f"{BASE_URL}/api/v1/warehouses/{warehouse['id']}/inventory/{existing_inv['id']}",
            json=update_data
        )
        if resp.status_code == 200:
            log(f"Reset warehouse inventory to 5000 kg")
    else:
        resp = requests.post(
            f"{BASE_URL}/api/v1/warehouses/{warehouse['id']}/inventory",
            json=inv_data
        )
        if resp.status_code == 201:
            log_success(f"Added 5000 kg to warehouse")
        else:
            log_error(f"Failed to add warehouse inventory: {resp.text}")

    # Issue 1000kg to contractor (to create contractor inventory)
    issuance_data = {
        "warehouse_id": warehouse["id"],
        "contractor_id": contractor["id"],
        "material_id": material["id"],
        "quantity": 1000,
        "unit_of_measure": "kg",
        "issued_date": str(date.today()),
        "issued_by": "Test Setup",
        "notes": "Initial issuance for rejection test"
    }

    resp = requests.post(f"{BASE_URL}/api/v1/issuances", json=issuance_data)
    if resp.status_code == 201:
        issuance = resp.json()
        log_success(f"Issued 1000 kg to contractor: {issuance['issuance_number']}")
    elif "Insufficient" in resp.text:
        log(f"Issuance skipped (may already have inventory)")
    else:
        log_error(f"Failed to issue material: {resp.text}")

    # Verify setup
    resp = requests.get(f"{BASE_URL}/api/v1/warehouses/{warehouse['id']}/inventory")
    inventory = resp.json()
    wh_inv = next((i for i in inventory if i["material_id"] == material["id"]), None)
    if wh_inv:
        log(f"Warehouse inventory: {wh_inv['current_quantity']} {wh_inv['unit_of_measure']}")

    resp = requests.get(f"{BASE_URL}/api/contractors/{contractor['id']}/inventory")
    contractor_inv = resp.json()
    con_inv = next((i for i in contractor_inv if i["material_id"] == material["id"]), None)
    if con_inv:
        log(f"Contractor inventory: {con_inv['quantity']} kg")

    return {
        "warehouse": warehouse,
        "contractor": contractor,
        "material": material,
    }


def get_warehouse_inventory(warehouse_id, material_id):
    """Get current warehouse inventory for a material."""
    resp = requests.get(f"{BASE_URL}/api/v1/warehouses/{warehouse_id}/inventory")
    if resp.status_code == 200:
        inventory = resp.json()
        return next((i for i in inventory if i["material_id"] == material_id), None)
    return None


def get_contractor_inventory(contractor_id, material_id):
    """Get current contractor inventory for a material."""
    resp = requests.get(f"{BASE_URL}/api/contractors/{contractor_id}/inventory")
    if resp.status_code == 200:
        inventory = resp.json()
        return next((i for i in inventory if i["material_id"] == material_id), None)
    return None


def test_rejection_workflow(test_data):
    """Test the complete rejection workflow."""
    warehouse = test_data["warehouse"]
    contractor = test_data["contractor"]
    material = test_data["material"]

    # Get initial inventories
    initial_wh = get_warehouse_inventory(warehouse["id"], material["id"])
    initial_con = get_contractor_inventory(contractor["id"], material["id"])

    initial_wh_qty = float(initial_wh["current_quantity"]) if initial_wh else 0
    initial_con_qty = float(initial_con["quantity"]) if initial_con else 0

    log(f"Initial warehouse inventory: {initial_wh_qty} kg")
    log(f"Initial contractor inventory: {initial_con_qty} kg")

    # ============================================================
    # Step 1: Report Rejection
    # ============================================================
    log_step(1, "Report Rejection - 100kg Steel (Visible rust damage)")

    rejection_data = {
        "contractor_id": contractor["id"],
        "material_id": material["id"],
        "quantity_rejected": 100,
        "unit_of_measure": "kg",
        "rejection_date": str(date.today()),
        "rejection_reason": "Visible rust damage on surface, not suitable for use",
        "reported_by": "Site Supervisor John",
        "notes": "Found during quality inspection"
    }

    resp = requests.post(f"{BASE_URL}/api/v1/rejections/report", json=rejection_data)
    if resp.status_code != 201:
        log_error(f"Failed to report rejection: {resp.text}")
        return False

    rejection = resp.json()
    rejection_id = rejection["id"]
    log_success(f"Rejection reported: {rejection['rejection_number']}")
    log(f"  Status: {rejection['status']}")
    log(f"  Quantity: {rejection['quantity_rejected']} {rejection['unit_of_measure']}")

    # Verify status = REPORTED
    if rejection["status"] == "REPORTED":
        log_success("Status correctly set to REPORTED")
    else:
        log_error(f"Expected status REPORTED, got {rejection['status']}")
        return False

    # Verify NO inventory changes
    wh_after_report = get_warehouse_inventory(warehouse["id"], material["id"])
    con_after_report = get_contractor_inventory(contractor["id"], material["id"])

    wh_qty_after_report = float(wh_after_report["current_quantity"]) if wh_after_report else 0
    con_qty_after_report = float(con_after_report["quantity"]) if con_after_report else 0

    if abs(wh_qty_after_report - initial_wh_qty) < 0.01:
        log_success(f"Warehouse inventory unchanged: {wh_qty_after_report} kg")
    else:
        log_error(f"Warehouse inventory changed unexpectedly: {initial_wh_qty} -> {wh_qty_after_report}")
        return False

    if abs(con_qty_after_report - initial_con_qty) < 0.01:
        log_success(f"Contractor inventory unchanged: {con_qty_after_report} kg")
    else:
        log_error(f"Contractor inventory changed unexpectedly: {initial_con_qty} -> {con_qty_after_report}")
        return False

    log_success("[EMAIL] Notification sent to warehouse manager (simulated)")

    # ============================================================
    # Step 2: Approve Rejection
    # ============================================================
    log_step(2, "Approve Rejection - Return to Main Warehouse")

    approval_data = {
        "approved_by": "Quality Manager Sarah",
        "return_warehouse_id": warehouse["id"],
        "notes": "Approved based on photo evidence"
    }

    resp = requests.put(f"{BASE_URL}/api/v1/rejections/{rejection_id}/approve", json=approval_data)
    if resp.status_code != 200:
        log_error(f"Failed to approve rejection: {resp.text}")
        return False

    rejection = resp.json()
    log_success(f"Rejection approved by {rejection['approved_by']}")
    log(f"  Status: {rejection['status']}")
    log(f"  Return warehouse: {rejection['return_warehouse_name']}")

    # Verify status = APPROVED
    if rejection["status"] == "APPROVED":
        log_success("Status correctly changed to APPROVED")
    else:
        log_error(f"Expected status APPROVED, got {rejection['status']}")
        return False

    # Verify STILL no inventory changes
    wh_after_approval = get_warehouse_inventory(warehouse["id"], material["id"])
    con_after_approval = get_contractor_inventory(contractor["id"], material["id"])

    wh_qty_after_approval = float(wh_after_approval["current_quantity"]) if wh_after_approval else 0
    con_qty_after_approval = float(con_after_approval["quantity"]) if con_after_approval else 0

    if abs(wh_qty_after_approval - initial_wh_qty) < 0.01:
        log_success(f"Warehouse inventory still unchanged: {wh_qty_after_approval} kg")
    else:
        log_error(f"Warehouse inventory changed unexpectedly")
        return False

    if abs(con_qty_after_approval - initial_con_qty) < 0.01:
        log_success(f"Contractor inventory still unchanged: {con_qty_after_approval} kg")
    else:
        log_error(f"Contractor inventory changed unexpectedly")
        return False

    log_success("[EMAIL] Notification sent to contractor (simulated)")

    # ============================================================
    # Step 3: Receive at Warehouse
    # ============================================================
    log_step(3, "Receive at Warehouse - Material returned")

    receive_data = {
        "received_by": "Warehouse Clerk Mike",
        "notes": "Material received and inspected, confirmed rust damage"
    }

    resp = requests.put(f"{BASE_URL}/api/v1/rejections/{rejection_id}/receive", json=receive_data)
    if resp.status_code != 200:
        log_error(f"Failed to receive rejection: {resp.text}")
        return False

    rejection = resp.json()
    log_success(f"Rejection received at warehouse")
    log(f"  Status: {rejection['status']}")
    log(f"  Received by: {rejection['received_by']}")
    log(f"  GRN Number: {rejection['warehouse_grn_number']}")

    # Verify status = RECEIVED_AT_WAREHOUSE
    if rejection["status"] == "RECEIVED_AT_WAREHOUSE":
        log_success("Status correctly changed to RECEIVED_AT_WAREHOUSE")
    else:
        log_error(f"Expected status RECEIVED_AT_WAREHOUSE, got {rejection['status']}")
        return False

    # Verify GRN generated
    if rejection["warehouse_grn_number"]:
        log_success(f"Return GRN generated: {rejection['warehouse_grn_number']}")
    else:
        log_error("Return GRN not generated")
        return False

    # NOW verify inventory changes
    wh_final = get_warehouse_inventory(warehouse["id"], material["id"])
    con_final = get_contractor_inventory(contractor["id"], material["id"])

    wh_qty_final = float(wh_final["current_quantity"]) if wh_final else 0
    con_qty_final = float(con_final["quantity"]) if con_final else 0

    # Contractor should be reduced by 100kg
    expected_con = initial_con_qty - 100
    if abs(con_qty_final - expected_con) < 0.01:
        log_success(f"Contractor inventory reduced: {initial_con_qty} -> {con_qty_final} kg (expected: {expected_con})")
    else:
        log_error(f"Contractor inventory wrong: {con_qty_final}, expected {expected_con}")
        return False

    # Warehouse should be increased by 100kg
    expected_wh = initial_wh_qty + 100
    if abs(wh_qty_final - expected_wh) < 0.01:
        log_success(f"Warehouse inventory increased: {initial_wh_qty} -> {wh_qty_final} kg (expected: {expected_wh})")
    else:
        log_error(f"Warehouse inventory wrong: {wh_qty_final}, expected {expected_wh}")
        return False

    return True


def main():
    print("\n" + "="*60)
    print("REJECTION WORKFLOW TEST")
    print("="*60)

    try:
        # Setup
        test_data = setup_test_data()
        if not test_data:
            log_error("Failed to set up test data")
            return

        # Run test
        result = test_rejection_workflow(test_data)

        # Summary
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)

        if result:
            log_success("All rejection workflow tests passed!")
            print("""
Results:
- Step 1: Rejection reported (REPORTED) - No inventory changes
- Step 2: Rejection approved (APPROVED) - No inventory changes
- Step 3: Material received (RECEIVED_AT_WAREHOUSE) - Inventory updated
  - Contractor inventory reduced by 100kg
  - Warehouse inventory increased by 100kg
  - Return GRN generated

The rejection workflow is working correctly!
            """)
        else:
            log_error("Rejection workflow test failed")

    except requests.exceptions.ConnectionError:
        log_error("Could not connect to the API server.")
        log("Make sure the server is running: uvicorn app.main:app --reload")
    except Exception as e:
        log_error(f"Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
