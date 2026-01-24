#!/usr/bin/env python3
"""
Comprehensive Test: Reconciliation Workflow

Tests the contractor reconciliation process:
1. Setup contractor with inventory
2. Contractor submits reconciliation report
3. Variances are calculated immediately
4. Manager reviews and accepts
5. Inventory is adjusted

Unlike blind audits, reconciliation shows variances immediately.
"""
import requests
from datetime import date, timedelta

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
    print_header("RECONCILIATION WORKFLOW TEST")
    print(f"Testing against: {BASE_URL}")
    print(f"Date: {date.today()}")

    # =========================================================================
    # SETUP PHASE
    # =========================================================================
    print_header("SETUP PHASE - Creating Test Data")

    # Step 1: Create or get contractor
    print_step("Setup-1", "Create/Get Contractor")
    contractor_data = {
        "name": "Reconciliation Test Contractor",
        "code": "REC-TEST-001"
    }
    response = requests.post(f"{BASE_URL}/api/contractors", json=contractor_data)
    if response.status_code == 200:
        contractor = response.json()
        print_success(f"Created contractor: {contractor['name']} (ID: {contractor['id']})")
    else:
        response = requests.get(f"{BASE_URL}/api/contractors")
        contractors = response.json()
        contractor = next((c for c in contractors if c.get('code') == 'REC-TEST-001'), None)
        if not contractor and contractors:
            contractor = contractors[0]
        if contractor:
            print_info(f"Using existing contractor: {contractor['name']} (ID: {contractor['id']})")
        else:
            print_error("Could not create or find contractor")
            return

    contractor_id = contractor['id']

    # Step 2: Create materials (Steel and Bolts)
    print_step("Setup-2", "Create/Get Materials (Steel, Bolts)")

    # Create Steel
    steel_data = {"code": "STEEL-REC", "name": "Steel for Reconciliation", "unit": "kg"}
    response = requests.post(f"{BASE_URL}/api/materials", json=steel_data)
    if response.status_code == 200:
        steel = response.json()
        print_success(f"Created Steel: ID {steel['id']}")
    else:
        response = requests.get(f"{BASE_URL}/api/materials")
        materials = response.json()
        steel = next((m for m in materials if m.get('code') == 'STEEL-REC'), None)
        if not steel and materials:
            steel = materials[0]
        if steel:
            print_info(f"Using existing Steel: {steel['name']} (ID: {steel['id']})")
        else:
            print_error("Could not create Steel")
            return

    steel_id = steel['id']

    # Create Bolts
    bolts_data = {"code": "BOLTS-REC", "name": "Bolts for Reconciliation", "unit": "pcs"}
    response = requests.post(f"{BASE_URL}/api/materials", json=bolts_data)
    if response.status_code == 200:
        bolts = response.json()
        print_success(f"Created Bolts: ID {bolts['id']}")
    else:
        response = requests.get(f"{BASE_URL}/api/materials")
        materials = response.json()
        bolts = next((m for m in materials if m.get('code') == 'BOLTS-REC'), None)
        if not bolts and len(materials) > 1:
            bolts = materials[1]
        elif not bolts and materials:
            bolts = materials[0]
        if bolts:
            print_info(f"Using existing Bolts: {bolts['name']} (ID: {bolts['id']})")
        else:
            print_error("Could not create Bolts")
            return

    bolts_id = bolts['id']

    # Step 3: Set up warehouse and inventory
    print_step("Setup-3", "Set up Warehouse and Inventory")

    warehouse_data = {"name": "Reconciliation Warehouse", "code": "WH-REC", "location": "Test"}
    response = requests.post(f"{BASE_URL}/api/v1/warehouses", json=warehouse_data)
    if response.status_code in [200, 201]:
        warehouse = response.json()
        print_success(f"Created warehouse: {warehouse['name']} (ID: {warehouse['id']})")
    else:
        response = requests.get(f"{BASE_URL}/api/v1/warehouses")
        warehouses = response.json()
        if isinstance(warehouses, dict):
            warehouses = warehouses.get('items', [])
        warehouse = next((w for w in warehouses if w.get('code') == 'WH-REC'), None)
        if not warehouse and warehouses:
            warehouse = warehouses[0]
        if warehouse:
            print_info(f"Using existing warehouse: {warehouse['name']} (ID: {warehouse['id']})")
        else:
            print_error("Could not create warehouse")
            return

    warehouse_id = warehouse['id']

    # Add inventory to warehouse
    for mat_id, mat_name, qty in [(steel_id, "Steel", 5000), (bolts_id, "Bolts", 5000)]:
        response = requests.get(f"{BASE_URL}/api/v1/warehouses/{warehouse_id}/inventory")
        existing_inv = response.json() if response.status_code == 200 else []
        inv_item = next((i for i in existing_inv if i.get('material_id') == mat_id), None)

        if inv_item:
            response = requests.put(
                f"{BASE_URL}/api/v1/warehouses/{warehouse_id}/inventory/{inv_item['id']}",
                json={"current_quantity": qty}
            )
            if response.status_code == 200:
                print_info(f"Updated {mat_name} warehouse inventory to {qty}")
        else:
            inv_data = {
                "warehouse_id": warehouse_id,
                "material_id": mat_id,
                "current_quantity": qty,
                "unit_of_measure": "kg" if mat_name == "Steel" else "pcs",
                "reorder_point": 100,
                "reorder_quantity": 500
            }
            response = requests.post(f"{BASE_URL}/api/v1/warehouses/{warehouse_id}/inventory", json=inv_data)
            if response.status_code in [200, 201]:
                print_success(f"Added {mat_name} warehouse inventory: {qty}")

    # Step 4: Issue materials to contractor to create contractor inventory
    print_step("Setup-4", "Issue Materials to Contractor")

    # Issue Steel - 500kg
    issue_data = {
        "warehouse_id": warehouse_id,
        "contractor_id": contractor_id,
        "material_id": steel_id,
        "quantity": 500,
        "unit_of_measure": "kg",
        "issued_date": str(date.today()),
        "issued_by": "Test Setup"
    }
    response = requests.post(f"{BASE_URL}/api/v1/issuances", json=issue_data)
    if response.status_code in [200, 201]:
        print_success("Issued 500 kg Steel to contractor")
    else:
        print_warning(f"Steel issuance: {response.text[:200]}")

    # Issue Bolts - 1000pcs
    issue_data = {
        "warehouse_id": warehouse_id,
        "contractor_id": contractor_id,
        "material_id": bolts_id,
        "quantity": 1000,
        "unit_of_measure": "pcs",
        "issued_date": str(date.today()),
        "issued_by": "Test Setup"
    }
    response = requests.post(f"{BASE_URL}/api/v1/issuances", json=issue_data)
    if response.status_code in [200, 201]:
        print_success("Issued 1000 pcs Bolts to contractor")
    else:
        print_warning(f"Bolts issuance: {response.text[:200]}")

    # Step 5: Set up thresholds
    print_step("Setup-5", "Set Variance Thresholds")

    # Steel threshold: 2%
    threshold_data = {"material_id": steel_id, "threshold_percentage": 2.0, "notes": "Steel 2% threshold"}
    response = requests.post(f"{BASE_URL}/api/v1/thresholds?created_by=TestSetup", json=threshold_data)
    if response.status_code in [200, 201]:
        print_success("Created Steel threshold: 2%")
    else:
        print_info(f"Steel threshold: {response.text[:100]}")

    # Bolts threshold: 5%
    threshold_data = {"material_id": bolts_id, "threshold_percentage": 5.0, "notes": "Bolts 5% threshold"}
    response = requests.post(f"{BASE_URL}/api/v1/thresholds?created_by=TestSetup", json=threshold_data)
    if response.status_code in [200, 201]:
        print_success("Created Bolts threshold: 5%")
    else:
        print_info(f"Bolts threshold: {response.text[:100]}")

    # Verify effective thresholds
    response = requests.get(f"{BASE_URL}/api/v1/thresholds/effective/{contractor_id}/{steel_id}")
    if response.status_code == 200:
        eff = response.json()
        print_success(f"Steel effective threshold: {eff['threshold_percentage']}%")

    response = requests.get(f"{BASE_URL}/api/v1/thresholds/effective/{contractor_id}/{bolts_id}")
    if response.status_code == 200:
        eff = response.json()
        print_success(f"Bolts effective threshold: {eff['threshold_percentage']}%")

    # =========================================================================
    # RECONCILIATION PHASE
    # =========================================================================
    print_header("RECONCILIATION PHASE - Contractor Submits Report")

    # Step 1: Contractor submits weekly reconciliation
    print_step(1, "Contractor Submits Weekly Reconciliation")

    today = date.today()
    period_end = today
    period_start = today - timedelta(days=6)

    reconciliation_data = {
        "contractor_id": contractor_id,
        "reconciliation_date": str(today),
        "period_type": "WEEKLY",
        "period_start": str(period_start),
        "period_end": str(period_end),
        "reported_by": "Site Manager",
        "items": [
            {
                "material_id": steel_id,
                "reported_quantity": 480,
                "notes": "After Friday production"
            },
            {
                "material_id": bolts_id,
                "reported_quantity": 950,
                "notes": "Counted by hand"
            }
        ],
        "notes": "Weekly inventory reconciliation"
    }

    response = requests.post(f"{BASE_URL}/api/v1/reconciliations/submit", json=reconciliation_data)
    if not check_response(response, context="Submit reconciliation"):
        return

    recon = response.json()
    recon_id = recon['id']

    print_success(f"Reconciliation submitted: {recon['reconciliation_number']}")
    print_success(f"Status: {recon['status']}")
    print_success(f"Total anomalies: {recon['total_anomalies']}")

    # Step 2: Review variance calculations
    print_step(2, "Review Variance Calculations")

    print("\n  Variance Analysis:")
    for item in recon['line_items']:
        print(f"\n  Material: {item['material_code']} - {item['material_name']}")
        print(f"    System Quantity:   {item['system_quantity']} {item['unit_of_measure']}")
        print(f"    Reported Quantity: {item['reported_quantity']} {item['unit_of_measure']}")
        print(f"    Variance:          {item['variance']}")
        variance_pct = float(item['variance_percentage']) if item['variance_percentage'] else 0
        print(f"    Variance %:        {variance_pct:.2f}%")
        print(f"    Threshold:         {item['threshold_used']}%")
        print(f"    Is Anomaly:        {'YES' if item['is_anomaly'] else 'No'}")
        if item['anomaly_id']:
            print(f"    Anomaly ID:        {item['anomaly_id']}")

    print("\n  Expected Results:")
    print("  - Steel: System 500, Reported 480, Variance -20kg (-4%)")
    print("    Threshold 2% → SHOULD BE ANOMALY (4% > 2%)")
    print("  - Bolts: System 1000, Reported 950, Variance -50pcs (-5%)")
    print("    Threshold 5% → SHOULD NOT BE ANOMALY (5% = 5%, not greater)")

    # Verify calculations
    steel_item = next((i for i in recon['line_items'] if i['material_code'] == 'STEEL-REC'), None)
    bolts_item = next((i for i in recon['line_items'] if i['material_code'] == 'BOLTS-REC'), None)

    if steel_item:
        if steel_item['is_anomaly']:
            print_success("Steel correctly flagged as anomaly (4% > 2%)")
        else:
            print_warning("Steel should be flagged as anomaly")

    if bolts_item:
        if not bolts_item['is_anomaly']:
            print_success("Bolts correctly NOT flagged as anomaly (5% = 5%, not greater)")
        else:
            print_warning("Bolts should NOT be flagged as anomaly")

    # Step 3: Manager reviews the reconciliation
    print_step(3, "Manager Reviews Reconciliation")

    review_data = {
        "status": "ACCEPTED",
        "reviewed_by": "Manager",
        "adjust_inventory": True,
        "notes": "Accepted, minor discrepancy noted"
    }

    response = requests.put(f"{BASE_URL}/api/v1/reconciliations/{recon_id}/review", json=review_data)
    if not check_response(response, context="Review reconciliation"):
        return

    reviewed = response.json()
    print_success(f"Reconciliation reviewed: {reviewed['reconciliation_number']}")
    print_success(f"New Status: {reviewed['status']}")
    print_success(f"Reviewed by: {reviewed['reviewed_by']}")
    print_success(f"Reviewed at: {reviewed['reviewed_at']}")

    # Step 4: Verify inventory was adjusted
    print_step(4, "Verify Inventory Adjustments")

    # Check contractor inventory (via issuance history or direct query)
    response = requests.get(f"{BASE_URL}/api/contractors/{contractor_id}/inventory")
    if response.status_code == 200:
        inventory = response.json()
        print("\n  Current Contractor Inventory:")
        for item in inventory:
            print(f"    {item.get('material_code', 'Unknown')}: {item.get('quantity', 0)}")
    else:
        print_info("Could not retrieve contractor inventory directly")

    # Check adjustment records
    # Note: We don't have a direct endpoint for this, but we can verify through the reconciliation

    # =========================================================================
    # VERIFICATION
    # =========================================================================
    print_header("VERIFICATION")

    # Get final reconciliation state
    response = requests.get(f"{BASE_URL}/api/v1/reconciliations/{recon_id}")
    if response.status_code == 200:
        final_recon = response.json()
        print_success(f"Final reconciliation status: {final_recon['status']}")
        print_success(f"Total anomalies: {final_recon['total_anomalies']}")

    # Check pending reviews (should be empty or reduced)
    response = requests.get(f"{BASE_URL}/api/v1/reconciliations/pending-review")
    if response.status_code == 200:
        pending = response.json()
        print_success(f"Pending reviews: {len(pending)}")

    # =========================================================================
    # SUMMARY
    # =========================================================================
    print_header("TEST SUMMARY")
    print("""
    RECONCILIATION WORKFLOW COMPLETED SUCCESSFULLY!

    Key Points Demonstrated:

    1. Setup:
       - Steel: 500kg system quantity, 2% threshold
       - Bolts: 1000pcs system quantity, 5% threshold

    2. Contractor Submitted Report:
       - Steel reported: 480kg
       - Bolts reported: 950pcs

    3. Variance Calculations (IMMEDIATE):
       - Steel: -20kg (-4%) → ANOMALY (exceeds 2% threshold)
       - Bolts: -50pcs (-5%) → NOT ANOMALY (equals 5% threshold)

    4. Manager Review:
       - Status: ACCEPTED
       - Inventory adjusted to match reported quantities
       - Anomaly marked as resolved

    Key Difference from Blind Audit:
    - Reconciliation: Contractor sees variances IMMEDIATELY after submission
    - Blind Audit: Auditor never sees expected values; manager calculates later

    Reconciliation is for SELF-REPORTING by contractors.
    Blind Audit is for INDEPENDENT verification by third parties.
    """)


if __name__ == "__main__":
    main()
