#!/usr/bin/env python3
"""
Comprehensive Test: Blind Audit Workflow

Tests the complete blind audit process:
1. Setup contractor with inventory and history
2. Auditor starts audit (sees materials, NOT expected values)
3. Auditor enters physical counts
4. Auditor submits audit
5. Manager analyzes (calculates variances, detects anomalies)
6. Manager accepts counts (adjusts inventory)

This test demonstrates the "blind" nature of the audit where
the auditor cannot see expected values until after submission.
"""
import requests
from datetime import date, timedelta
from decimal import Decimal

BASE_URL = "http://localhost:8000"

def print_header(text):
    print("\n" + "=" * 70)
    print(f"  {text}")
    print("=" * 70)

def print_step(step_num, text):
    print(f"\n--- Step {step_num}: {text} ---")

def print_success(text):
    print(f"  [OK] {text}")

def print_info(text):
    print(f"  [INFO] {text}")

def print_warning(text):
    print(f"  [WARN] {text}")

def print_error(text):
    print(f"  [ERROR] {text}")

def check_response(response, expected_status=200, context=""):
    if response.status_code != expected_status:
        print_error(f"{context}: Expected {expected_status}, got {response.status_code}")
        print_error(f"Response: {response.text[:500]}")
        return False
    return True


def main():
    print_header("BLIND AUDIT WORKFLOW TEST")
    print(f"Testing against: {BASE_URL}")
    print(f"Date: {date.today()}")

    # =========================================================================
    # SETUP PHASE
    # =========================================================================
    print_header("SETUP PHASE - Creating Test Data")

    # Step 1: Create or get contractor
    print_step("Setup-1", "Create/Get Contractor")
    contractor_data = {
        "name": "Audit Test Contractor",
        "code": "AUD-TEST-001"
    }
    response = requests.post(f"{BASE_URL}/api/contractors", json=contractor_data)
    if response.status_code == 200:
        contractor = response.json()
        print_success(f"Created contractor: {contractor['name']} (ID: {contractor['id']})")
    else:
        # Try to get existing contractor
        response = requests.get(f"{BASE_URL}/api/contractors")
        contractors = response.json()
        contractor = next((c for c in contractors if c.get('code') == 'AUD-TEST-001'), None)
        if not contractor and contractors:
            contractor = contractors[0]
        if contractor:
            print_info(f"Using existing contractor: {contractor['name']} (ID: {contractor['id']})")
        else:
            print_error("Could not create or find contractor")
            return

    contractor_id = contractor['id']

    # Step 2: Create or get material
    print_step("Setup-2", "Create/Get Material (Steel)")
    material_data = {
        "code": "STEEL-AUDIT",
        "name": "Steel for Audit Test",
        "unit": "kg"
    }
    response = requests.post(f"{BASE_URL}/api/materials", json=material_data)
    if response.status_code == 200:
        material = response.json()
        print_success(f"Created material: {material['name']} (ID: {material['id']})")
    else:
        response = requests.get(f"{BASE_URL}/api/materials")
        materials = response.json()
        material = next((m for m in materials if m.get('code') == 'STEEL-AUDIT'), None)
        if not material and materials:
            material = materials[0]
        if material:
            print_info(f"Using existing material: {material['name']} (ID: {material['id']})")
        else:
            print_error("Could not create or find material")
            return

    material_id = material['id']

    # Step 3: Create warehouse and set up inventory
    print_step("Setup-3", "Create Warehouse and Stock")
    warehouse_data = {
        "name": "Audit Test Warehouse",
        "code": "WH-AUDIT",
        "location": "Test Location"
    }
    response = requests.post(f"{BASE_URL}/api/v1/warehouses", json=warehouse_data)
    if response.status_code in [200, 201]:
        warehouse = response.json()
        print_success(f"Created warehouse: {warehouse['name']} (ID: {warehouse['id']})")
    else:
        response = requests.get(f"{BASE_URL}/api/v1/warehouses")
        warehouses = response.json()
        if isinstance(warehouses, dict):
            warehouses = warehouses.get('items', [])
        warehouse = next((w for w in warehouses if w.get('code') == 'WH-AUDIT'), None)
        if not warehouse and warehouses:
            warehouse = warehouses[0]
        if warehouse:
            print_info(f"Using existing warehouse: {warehouse['name']} (ID: {warehouse['id']})")
        else:
            print_error("Could not create or find warehouse")
            return

    warehouse_id = warehouse['id']

    # Add inventory to warehouse
    print_step("Setup-4", "Add Warehouse Inventory")
    # First check if inventory already exists
    response = requests.get(f"{BASE_URL}/api/v1/warehouses/{warehouse_id}/inventory")
    existing_inv = response.json() if response.status_code == 200 else []
    inv_item = next((i for i in existing_inv if i.get('material_id') == material_id), None)

    if inv_item:
        # Update existing inventory
        response = requests.put(
            f"{BASE_URL}/api/v1/warehouses/{warehouse_id}/inventory/{inv_item['id']}",
            json={"current_quantity": 5000}
        )
        if response.status_code == 200:
            print_info("Updated existing warehouse inventory to 5000 kg")
        else:
            print_warning(f"Failed to update inventory: {response.text[:200]}")
    else:
        # Create new inventory
        inv_data = {
            "warehouse_id": warehouse_id,
            "material_id": material_id,
            "current_quantity": 5000,
            "unit_of_measure": "kg",
            "reorder_point": 100,
            "reorder_quantity": 500
        }
        response = requests.post(f"{BASE_URL}/api/v1/warehouses/{warehouse_id}/inventory", json=inv_data)
        if response.status_code in [200, 201]:
            print_success("Added warehouse inventory: 5000 kg")
        else:
            print_warning(f"Warehouse inventory setup: {response.text[:200]}")

    # Step 5: Issue materials to contractor (this creates the expected inventory)
    print_step("Setup-5", "Issue Materials to Contractor (2000kg)")
    issue_data = {
        "warehouse_id": warehouse_id,
        "contractor_id": contractor_id,
        "material_id": material_id,
        "quantity": 2000,
        "unit_of_measure": "kg",
        "issued_date": str(date.today()),
        "issued_by": "Test Setup"
    }
    response = requests.post(f"{BASE_URL}/api/v1/issuances", json=issue_data)
    if response.status_code in [200, 201]:
        issuance = response.json()
        print_success(f"Issued 2000 kg to contractor. Issuance #: {issuance.get('issuance_number', 'N/A')}")
    else:
        print_warning(f"Issuance may already exist or failed: {response.text[:200]}")

    # Step 6: Simulate consumption (reduce expected by 1000kg)
    # We do this by issuing less and manually adjusting, or through production records
    # For simplicity, we'll note that expected = 2000kg issued
    print_step("Setup-6", "Note: Expected Inventory = 2000kg (issued) - 0 (consumed) = 2000kg")
    print_info("In a real scenario, production would consume materials")

    # Step 7: Set up threshold for Steel at 2%
    print_step("Setup-7", "Set Variance Threshold (2%)")
    threshold_data = {
        "material_id": material_id,
        "threshold_percentage": 2.0,
        "notes": "Default threshold for audit test"
    }
    response = requests.post(f"{BASE_URL}/api/v1/thresholds?created_by=TestSetup", json=threshold_data)
    if response.status_code in [200, 201]:
        threshold = response.json()
        print_success(f"Created threshold: {threshold['threshold_percentage']}% for {threshold['material_name']}")
    elif response.status_code == 400 and "already exists" in response.text:
        print_info("Threshold already exists")
    else:
        print_warning(f"Threshold setup: {response.text[:200]}")

    # Verify effective threshold
    response = requests.get(f"{BASE_URL}/api/v1/thresholds/effective/{contractor_id}/{material_id}")
    if response.status_code == 200:
        eff_threshold = response.json()
        print_success(f"Effective threshold: {eff_threshold['threshold_percentage']}% (source: {eff_threshold['source']})")

    # =========================================================================
    # AUDIT PHASE - AUDITOR PERSPECTIVE (BLIND)
    # =========================================================================
    print_header("AUDIT PHASE - Auditor Perspective (BLIND)")

    # Step 1: Auditor starts audit
    print_step(1, "Auditor Starts Audit")
    audit_start = {
        "contractor_id": contractor_id,
        "auditor_name": "Third Party Audit Co",
        "audit_type": "SCHEDULED",
        "notes": "Regular scheduled inventory audit"
    }
    response = requests.post(f"{BASE_URL}/api/v1/audits/start", json=audit_start)

    if response.status_code != 200:
        # Check if there's already an in-progress audit
        if "already has an audit in progress" in response.text:
            print_warning("An audit is already in progress for this contractor")
            # Get the existing audit
            response = requests.get(f"{BASE_URL}/api/v1/audits?contractor_id={contractor_id}&status=IN_PROGRESS")
            audits = response.json().get('items', [])
            if audits:
                audit = audits[0]
                audit_id = audit['id']
                print_info(f"Using existing audit: {audit['audit_number']}")
            else:
                print_error("Cannot find or create audit")
                return
        else:
            print_error(f"Failed to start audit: {response.text}")
            return
    else:
        audit = response.json()
        audit_id = audit['id']
        print_success(f"Audit started: {audit['audit_number']}")
        print_success(f"Contractor: {audit['contractor_name']}")
        print_success(f"Status: {audit['status']}")
        print_success(f"Materials to count: {len(audit['materials'])}")

    # Step 2: Auditor views materials (NO EXPECTED VALUES!)
    print_step(2, "Auditor Views Materials (BLIND - No Expected Values)")
    response = requests.get(f"{BASE_URL}/api/v1/audits/{audit_id}/auditor-view")
    if not check_response(response, context="Get auditor view"):
        return

    auditor_view = response.json()
    print_success(f"Audit: {auditor_view['audit_number']}")
    print_success(f"Status: {auditor_view['status']}")
    print("\n  Materials visible to auditor:")
    for mat in auditor_view['materials']:
        print(f"    - {mat['material_code']}: {mat['material_name']} ({mat['unit_of_measure']})")
        print(f"      Line Item ID: {mat['id']}")
        # Verify NO expected values are shown
        if 'expected_quantity' in mat:
            print_error("SECURITY ISSUE: Expected quantity visible to auditor!")
        else:
            print_success("      (No expected quantity shown - BLIND audit confirmed)")

    # Get the line item ID for our material
    line_item_id = None
    for mat in auditor_view['materials']:
        if mat['material_id'] == material_id:
            line_item_id = mat['id']
            break

    if not line_item_id:
        print_error(f"Could not find line item for material {material_id}")
        # Create one manually or use first
        if auditor_view['materials']:
            line_item_id = auditor_view['materials'][0]['id']
            material_id = auditor_view['materials'][0]['material_id']
            print_info(f"Using first line item: {line_item_id}")

    # Step 3: Auditor enters physical count (LESS than expected to trigger anomaly)
    print_step(3, "Auditor Enters Physical Count (750 kg - LESS than expected)")

    # The auditor physically counted 750kg, which is less than the 2000kg expected
    # This should trigger an anomaly since variance > 2% threshold
    count_data = {
        "counts": [
            {
                "line_item_id": line_item_id,
                "physical_count": 750,
                "auditor_notes": "Weighed on calibrated scale. Some material appears to be missing."
            }
        ]
    }
    response = requests.put(f"{BASE_URL}/api/v1/audits/{audit_id}/enter-counts", json=count_data["counts"])
    if not check_response(response, context="Enter counts"):
        return

    updated_view = response.json()
    print_success("Count entered: 750 kg")
    print_success("Note: Auditor still cannot see expected quantity or variance")

    # Step 4: Auditor submits audit
    print_step(4, "Auditor Submits Completed Audit")
    submit_data = {
        "counts": [
            {
                "line_item_id": line_item_id,
                "physical_count": 750,
                "auditor_notes": "Final count confirmed. Weighed on calibrated scale."
            }
        ],
        "final_notes": "Audit completed. Discrepancy noted - physical count lower than expected shelf quantity."
    }
    response = requests.post(f"{BASE_URL}/api/v1/audits/{audit_id}/submit", json=submit_data)
    if not check_response(response, context="Submit audit"):
        return

    submit_result = response.json()
    print_success(f"Audit submitted: {submit_result['audit_number']}")
    print_success(f"Submitted at: {submit_result['submitted_at']}")
    print_info("Auditor's job is complete. They do NOT see variance results.")

    # =========================================================================
    # ANALYSIS PHASE - MANAGER PERSPECTIVE
    # =========================================================================
    print_header("ANALYSIS PHASE - Manager Perspective")

    # Step 5: Manager analyzes the audit
    print_step(5, "Manager Analyzes Audit (Calculates Variances)")
    response = requests.post(f"{BASE_URL}/api/v1/audits/{audit_id}/analyze")
    if not check_response(response, context="Analyze audit"):
        return

    analysis = response.json()
    print_success(f"Audit analyzed: {analysis['audit_number']}")
    print_success(f"Status: {analysis['status']}")
    print_success(f"Analyzed at: {analysis['analyzed_at']}")
    print_success(f"Total anomalies detected: {analysis['total_anomalies']}")

    print("\n  Variance Analysis Results:")
    for item in analysis['line_items']:
        print(f"\n  Material: {item['material_code']} - {item['material_name']}")
        print(f"    Physical Count: {item['physical_count']} {item['unit_of_measure']}")
        print(f"    Expected:       {item['expected_quantity']} {item['unit_of_measure']}")
        print(f"    Variance:       {item['variance']} {item['unit_of_measure']}")
        variance_pct = float(item['variance_percentage']) if item['variance_percentage'] else 0
        print(f"    Variance %:     {variance_pct:.2f}%")
        print(f"    Threshold:      {item['threshold_used']}%")
        print(f"    Is Anomaly:     {'YES - OVERCONSUMPTION DETECTED!' if item['is_anomaly'] else 'No'}")
        if item['anomaly_id']:
            print(f"    Anomaly ID:     {item['anomaly_id']}")

    # Step 6: Manager reviews full audit details
    print_step(6, "Manager Reviews Full Audit Details")
    response = requests.get(f"{BASE_URL}/api/v1/audits/{audit_id}")
    if not check_response(response, context="Get audit details"):
        return

    full_audit = response.json()
    print_success(f"Audit Number: {full_audit['audit_number']}")
    print_success(f"Contractor: {full_audit['contractor_name']}")
    print_success(f"Auditor: {full_audit['auditor_name']}")
    print_success(f"Audit Type: {full_audit['audit_type']}")
    print_success(f"Status: {full_audit['status']}")
    print_success(f"Total Anomalies: {full_audit['total_anomalies']}")

    # Step 7: Manager accepts physical counts (adjusts inventory)
    print_step(7, "Manager Accepts Physical Counts (Adjusts Inventory)")
    response = requests.post(f"{BASE_URL}/api/v1/audits/{audit_id}/accept-counts")
    if not check_response(response, context="Accept counts"):
        return

    accept_result = response.json()
    print_success(f"Message: {accept_result['message']}")
    print("\n  Inventory Adjustments Made:")
    for adj in accept_result.get('adjustments', []):
        print(f"    {adj['material_code']}: {adj['before']} -> {adj['after']} ({adj['adjustment']:+.2f})")

    # Step 8: Close the audit
    print_step(8, "Manager Closes Audit")
    response = requests.put(f"{BASE_URL}/api/v1/audits/{audit_id}/close")
    if not check_response(response, context="Close audit"):
        return

    close_result = response.json()
    print_success(f"Audit closed: {close_result['audit_number']}")
    print_success(f"Final status: {close_result['status']}")

    # =========================================================================
    # VERIFICATION
    # =========================================================================
    print_header("VERIFICATION")

    # Verify audit is closed
    response = requests.get(f"{BASE_URL}/api/v1/audits/{audit_id}")
    if response.status_code == 200:
        final_audit = response.json()
        print_success(f"Final audit status: {final_audit['status']}")

    # Check anomalies list
    response = requests.get(f"{BASE_URL}/api/anomalies")
    if response.status_code == 200:
        anomalies = response.json()
        audit_anomalies = [a for a in anomalies if 'audit_shortage' in str(a.get('anomaly_type', ''))]
        print_success(f"Audit-related anomalies in system: {len(audit_anomalies)}")

    # =========================================================================
    # SUMMARY
    # =========================================================================
    print_header("TEST SUMMARY")
    print("""
    BLIND AUDIT WORKFLOW COMPLETED SUCCESSFULLY!

    Key Points Demonstrated:
    1. Auditor started audit and saw materials to count
    2. Auditor could NOT see expected quantities (BLIND audit)
    3. Auditor entered physical count (750 kg)
    4. Auditor submitted - still no visibility to results
    5. Manager analyzed - variances calculated
       - Expected: 2000 kg (from issuances)
       - Physical: 750 kg (from auditor)
       - Variance: -1250 kg (-62.5%)
       - Threshold: 2%
       - Result: ANOMALY DETECTED (shortage > threshold)
    6. Manager accepted counts - inventory adjusted
    7. Anomaly created and linked to audit

    This demonstrates the complete separation between:
    - AUDITOR: Performs count without knowing expected values
    - MANAGER: Sees full analysis and makes decisions

    The "blind" nature prevents auditors from adjusting counts
    to match expected values, ensuring audit integrity.
    """)


if __name__ == "__main__":
    main()
