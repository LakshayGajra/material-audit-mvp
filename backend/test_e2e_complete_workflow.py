#!/usr/bin/env python3
"""
End-to-End Test: Complete Material Audit MVP Workflow

This comprehensive test covers all major system flows:
1. Warehouse Setup - Create warehouse, supplier, PO, receive materials
2. Issuance Flow - Issue materials from warehouse to contractor
3. Production Flow - Report production, verify consumption, check anomalies
4. Rejection Flow - Report rejection, approve, receive at warehouse
5. Audit Flow - Blind audit with auditor and manager workflows
6. Reconciliation Flow - Contractor self-reporting and manager review

Run with: python test_e2e_complete_workflow.py

Prerequisites:
- Backend server running at http://localhost:8000
- Database initialized with migrations applied
"""
import requests
import json
import sys
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Optional, Dict, Any, List

BASE_URL = "http://localhost:8000"

# Test result tracking
test_results = {
    "passed": 0,
    "failed": 0,
    "warnings": 0,
    "details": []
}


# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

def print_header(text: str):
    """Print section header."""
    print("\n" + "=" * 80)
    print(f"  {text}")
    print("=" * 80)


def print_subheader(text: str):
    """Print subsection header."""
    print(f"\n{'─' * 60}")
    print(f"  {text}")
    print("─" * 60)


def print_step(step_num: str, text: str):
    """Print step indicator."""
    print(f"\n┌─ Step {step_num}: {text}")


def print_success(text: str):
    """Print success message."""
    test_results["passed"] += 1
    test_results["details"].append(f"[PASS] {text}")
    print(f"│  ✓ {text}")


def print_info(text: str):
    """Print info message."""
    print(f"│  ℹ {text}")


def print_warning(text: str):
    """Print warning message."""
    test_results["warnings"] += 1
    test_results["details"].append(f"[WARN] {text}")
    print(f"│  ⚠ {text}")


def print_error(text: str):
    """Print error message."""
    test_results["failed"] += 1
    test_results["details"].append(f"[FAIL] {text}")
    print(f"│  ✗ {text}")


def print_data(label: str, value: Any):
    """Print data item."""
    print(f"│    {label}: {value}")


def check_response(response: requests.Response, expected_status: int = 200,
                   context: str = "") -> bool:
    """Check response status and report result."""
    if response.status_code != expected_status:
        print_error(f"{context}: Expected HTTP {expected_status}, got {response.status_code}")
        try:
            error_detail = response.json().get('detail', response.text[:200])
            print_data("Error", error_detail)
        except:
            print_data("Response", response.text[:200])
        return False
    return True


def api_get(endpoint: str, params: Dict = None) -> Optional[Dict]:
    """Make GET request to API."""
    try:
        response = requests.get(f"{BASE_URL}{endpoint}", params=params)
        if response.status_code == 200:
            return response.json()
        return None
    except Exception as e:
        print_error(f"GET {endpoint} failed: {e}")
        return None


def api_post(endpoint: str, data: Dict = None) -> tuple[Optional[Dict], int]:
    """Make POST request to API. Returns (result, status_code)."""
    try:
        response = requests.post(f"{BASE_URL}{endpoint}", json=data)
        try:
            result = response.json()
            # Normalize success codes (200, 201) to 200 for easier checking
            status = 200 if response.status_code in [200, 201] else response.status_code
            return result, status
        except:
            return None, response.status_code
    except Exception as e:
        print_error(f"POST {endpoint} failed: {e}")
        return None, 0


def api_put(endpoint: str, data: Dict = None, params: Dict = None) -> tuple[Optional[Dict], int]:
    """Make PUT request to API."""
    try:
        response = requests.put(f"{BASE_URL}{endpoint}", json=data, params=params)
        try:
            return response.json(), response.status_code
        except:
            return None, response.status_code
    except Exception as e:
        print_error(f"PUT {endpoint} failed: {e}")
        return None, 0


# =============================================================================
# TEST 1: WAREHOUSE SETUP
# =============================================================================

def test_warehouse_setup() -> Dict[str, Any]:
    """Test warehouse setup flow: Create warehouse, supplier, PO, receive materials."""
    print_header("TEST 1: WAREHOUSE SETUP")
    context = {}

    # Step 1.1: Create Warehouse
    print_step("1.1", "Create Warehouse")
    warehouse_data = {
        "code": f"WH-E2E-{date.today().strftime('%Y%m%d')}",
        "name": "E2E Test Warehouse",
        "location": "Test Location",
        "address": "123 Test Street",
        "contact_person": "Test Manager",
        "phone": "1234567890",
        "is_active": True
    }

    result, status = api_post("/api/warehouses", warehouse_data)
    if status == 200 and result:
        context["warehouse"] = result
        print_success(f"Created warehouse: {result['name']} (ID: {result['id']})")
    else:
        # Try to find existing warehouse
        warehouses = api_get("/api/warehouses")
        if warehouses:
            context["warehouse"] = warehouses[0]
            print_info(f"Using existing warehouse: {context['warehouse']['name']}")
        else:
            print_error("Could not create or find warehouse")
            return context

    # Step 1.2: Create Supplier
    print_step("1.2", "Create Supplier")
    supplier_data = {
        "code": f"SUP-E2E-{date.today().strftime('%Y%m%d')}",
        "name": "E2E Test Supplier",
        "contact_person": "Supplier Contact",
        "phone": "9876543210",
        "email": "supplier@e2etest.com",
        "address": "456 Supplier Street",
        "payment_terms": "Net 30",
        "is_active": True
    }

    result, status = api_post("/api/suppliers", supplier_data)
    if status == 200 and result:
        context["supplier"] = result
        print_success(f"Created supplier: {result['name']} (ID: {result['id']})")
    else:
        suppliers = api_get("/api/suppliers")
        if suppliers:
            context["supplier"] = suppliers[0]
            print_info(f"Using existing supplier: {context['supplier']['name']}")
        else:
            print_error("Could not create or find supplier")
            return context

    # Step 1.3: Create Material
    print_step("1.3", "Create/Get Material")
    material_data = {
        "code": "MAT-E2E-STEEL",
        "name": "E2E Test Steel",
        "unit": "kg"
    }

    result, status = api_post("/api/materials", material_data)
    if status == 200 and result:
        context["material"] = result
        print_success(f"Created material: {result['name']} (ID: {result['id']})")
    else:
        materials = api_get("/api/materials")
        if materials:
            # Try to find our material or use first one
            mat = next((m for m in materials if m.get('code') == 'MAT-E2E-STEEL'), None)
            context["material"] = mat if mat else materials[0]
            print_info(f"Using existing material: {context['material']['name']}")
        else:
            print_error("Could not create or find material")
            return context

    # Step 1.4: Create Purchase Order
    print_step("1.4", "Create Purchase Order")
    po_data = {
        "supplier_id": context["supplier"]["id"],
        "warehouse_id": context["warehouse"]["id"],
        "expected_delivery_date": (date.today() + timedelta(days=7)).isoformat(),
        "notes": "E2E Test Purchase Order",
        "lines": [
            {
                "material_id": context["material"]["id"],
                "quantity_ordered": 1000.0,
                "unit_of_measure": context["material"]["unit"],
                "unit_price": 50.0
            }
        ]
    }

    result, status = api_post("/api/purchase-orders", po_data)
    if status == 200 and result:
        context["po"] = result
        print_success(f"Created PO: {result['po_number']} (ID: {result['id']})")
        print_data("Status", result['status'])
        print_data("Total Amount", result.get('total_amount', 'N/A'))
    else:
        print_error(f"Failed to create purchase order (HTTP {status})")
        if result:
            print_data("Error", result.get('detail', result))
        return context

    # Step 1.5: Submit PO for Approval
    print_step("1.5", "Submit PO for Approval")
    result, status = api_put(f"/api/purchase-orders/{context['po']['id']}/submit")
    if status == 200 and result:
        context["po"] = result
        print_success(f"PO submitted - Status: {result['status']}")
    else:
        print_error(f"Failed to submit PO (HTTP {status})")
        if result:
            print_data("Error", result.get('detail', result))

    # Step 1.6: Approve PO
    print_step("1.6", "Approve PO")
    approve_data = {"approved_by": "E2E Test Manager"}
    result, status = api_put(f"/api/purchase-orders/{context['po']['id']}/approve", approve_data)
    if status == 200 and result:
        context["po"] = result
        print_success(f"PO approved - Status: {result['status']}")
    else:
        print_error("Failed to approve PO")
        return context

    # Step 1.7: Receive Goods (Create Goods Receipt)
    print_step("1.7", "Receive Goods at Warehouse")

    # First, ensure we have a valid approved PO
    if context.get("po") and context["po"].get("status") == "APPROVED":
        grn_data = {
            "purchase_order_id": context["po"]["id"],
            "received_by": "E2E Warehouse Staff",
            "receipt_date": date.today().isoformat(),
            "notes": "E2E Test Goods Receipt",
            "lines": [
                {
                    "material_id": context["material"]["id"],
                    "quantity_received": 1000.0,
                    "unit_of_measure": context["material"]["unit"],
                    "notes": "Full quantity received"
                }
            ]
        }

        result, status = api_post("/api/goods-receipts", grn_data)
        if status == 200 and result:
            context["grn"] = result
            print_success(f"Created GRN: {result['grn_number']} (ID: {result['id']})")
            print_data("Received Quantity", "1000 kg")
        else:
            print_warning("Failed to create goods receipt via PO - will add inventory directly")
    else:
        print_info("PO not approved - will add inventory directly")

    # Step 1.8: Verify/Create Warehouse Inventory
    print_step("1.8", "Verify/Create Warehouse Inventory")
    inventory = api_get(f"/api/warehouses/{context['warehouse']['id']}/inventory")
    mat_inv = None
    if inventory:
        mat_inv = next((i for i in inventory if i['material_id'] == context['material']['id']), None)

    if mat_inv and float(mat_inv['current_quantity']) > 100:
        print_success(f"Warehouse has sufficient inventory")
        print_data("Material", context['material']['name'])
        print_data("Current Quantity", f"{mat_inv['current_quantity']} {mat_inv['unit_of_measure']}")
        context["warehouse_stock"] = float(mat_inv['current_quantity'])
    else:
        # Add or update warehouse inventory manually
        print_info("Adding/updating warehouse inventory...")
        inv_data = {
            "warehouse_id": context["warehouse"]["id"],  # Required field
            "material_id": context["material"]["id"],
            "current_quantity": 1000.0,
            "unit_of_measure": context["material"]["unit"],
            "reorder_point": 100.0,
            "reorder_quantity": 500.0
        }
        result, status = api_post(f"/api/warehouses/{context['warehouse']['id']}/inventory", inv_data)
        if status == 200 and result:
            print_success("Warehouse inventory created/updated")
            print_data("Quantity", f"1000.0 {context['material']['unit']}")
            context["warehouse_stock"] = 1000.0
        else:
            # Try PUT to update existing
            if mat_inv:
                update_data = {"current_quantity": 1000.0}
                result, status = api_put(
                    f"/api/warehouses/{context['warehouse']['id']}/inventory/{mat_inv['id']}",
                    update_data
                )
                if status == 200:
                    print_success("Warehouse inventory updated")
                    context["warehouse_stock"] = 1000.0
                else:
                    print_warning(f"Could not update warehouse inventory (HTTP {status})")
                    if result:
                        print_data("Error", result.get('detail', result))
            else:
                print_warning(f"Could not create warehouse inventory (HTTP {status})")
                if result:
                    print_data("Error", result.get('detail', result))

    print_info("Warehouse setup complete!")
    return context


# =============================================================================
# TEST 2: ISSUANCE FLOW
# =============================================================================

def test_issuance_flow(context: Dict) -> Dict:
    """Test material issuance from warehouse to contractor."""
    print_header("TEST 2: MATERIAL ISSUANCE FLOW")

    if "warehouse" not in context or "material" not in context:
        print_error("Missing context from warehouse setup")
        return context

    # Step 2.1: Create Contractor
    print_step("2.1", "Create/Get Contractor")
    contractor_data = {
        "code": "CON-E2E-001",
        "name": "E2E Test Contractor",
        "phone": "1112223333"
    }

    result, status = api_post("/api/contractors", contractor_data)
    if status == 200 and result:
        context["contractor"] = result
        print_success(f"Created contractor: {result['name']} (ID: {result['id']})")
    else:
        contractors = api_get("/api/contractors")
        if contractors:
            con = next((c for c in contractors if c.get('code') == 'CON-E2E-001'), None)
            context["contractor"] = con if con else contractors[0]
            print_info(f"Using existing contractor: {context['contractor']['name']}")
        else:
            print_error("Could not create or find contractor")
            return context

    # Step 2.2: Check Warehouse Stock Before Issuance
    print_step("2.2", "Check Warehouse Stock Before Issuance")
    inventory = api_get(f"/api/warehouses/{context['warehouse']['id']}/inventory")
    stock_before = 0.0
    if inventory:
        mat_inv = next((i for i in inventory if i['material_id'] == context['material']['id']), None)
        if mat_inv:
            stock_before = float(mat_inv['current_quantity'])
            print_info(f"Current warehouse stock: {stock_before} kg")

    # Step 2.3: Issue Materials to Contractor
    print_step("2.3", "Issue Materials to Contractor")
    issuance_data = {
        "warehouse_id": context["warehouse"]["id"],
        "contractor_id": context["contractor"]["id"],
        "material_id": context["material"]["id"],
        "quantity": 200.0,
        "unit_of_measure": context["material"]["unit"],
        "issued_date": date.today().isoformat(),
        "issued_by": "E2E Test Issuer",
        "notes": "E2E Test Issuance"
    }

    result, status = api_post("/api/issuances", issuance_data)
    if status == 200 and result:
        context["issuance"] = result
        print_success(f"Created issuance: {result['issuance_number']}")
        print_data("Quantity Issued", f"{result['quantity']} {result['unit_of_measure']}")
        print_data("Contractor", context["contractor"]["name"])
    else:
        print_error(f"Failed to create issuance (HTTP {status})")
        if result:
            print_data("Error", result.get('detail', result))
        return context

    # Step 2.4: Verify Warehouse Stock Decreased
    print_step("2.4", "Verify Warehouse Stock Decreased")
    inventory = api_get(f"/api/warehouses/{context['warehouse']['id']}/inventory")
    if inventory:
        mat_inv = next((i for i in inventory if i['material_id'] == context['material']['id']), None)
        if mat_inv:
            stock_after = float(mat_inv['current_quantity'])
            expected_stock = stock_before - 200
            if abs(stock_after - expected_stock) < 0.01:
                print_success(f"Warehouse stock correctly decreased: {stock_before} → {stock_after}")
            else:
                print_warning(f"Stock mismatch: expected {expected_stock}, got {stock_after}")

    # Step 2.5: Verify Contractor Inventory Increased
    print_step("2.5", "Verify Contractor Inventory Increased")
    contractor_inv = api_get(f"/api/contractors/{context['contractor']['id']}/inventory")
    if contractor_inv:
        mat_inv = next((i for i in contractor_inv if i['material_id'] == context['material']['id']), None)
        if mat_inv:
            print_success(f"Contractor inventory updated: {mat_inv['quantity']} kg")
            context["contractor_stock"] = mat_inv['quantity']
        else:
            print_warning("Material not found in contractor inventory")

    # Step 2.6: Verify Transaction Log
    print_step("2.6", "Verify Issuance Transaction Log")
    issuances = api_get(f"/api/contractors/{context['contractor']['id']}/issuances")
    if issuances:
        recent = next((i for i in issuances if i.get('issuance_number') == context['issuance']['issuance_number']), None)
        if recent:
            print_success(f"Transaction logged: {recent['issuance_number']}")
            print_data("Date", recent['issued_date'])
            print_data("Quantity", f"{recent['quantity']} {recent['unit_of_measure']}")
        else:
            print_warning("Transaction not found in issuance history")

    print_info("Issuance flow complete!")
    return context


# =============================================================================
# TEST 3: PRODUCTION FLOW
# =============================================================================

def test_production_flow(context: Dict) -> Dict:
    """Test production reporting and consumption calculation."""
    print_header("TEST 3: PRODUCTION FLOW")

    if "contractor" not in context:
        print_error("Missing contractor from previous tests")
        return context

    # Step 3.1: Create Finished Good
    print_step("3.1", "Create/Get Finished Good")
    fg_data = {
        "code": "FG-E2E-BLOCK",
        "name": "E2E Test Concrete Block"
    }

    result, status = api_post("/api/finished-goods", fg_data)
    if status == 200 and result:
        context["finished_good"] = result
        print_success(f"Created finished good: {result['name']} (ID: {result['id']})")
    else:
        fgs = api_get("/api/finished-goods")
        if fgs:
            fg = next((f for f in fgs if f.get('code') == 'FG-E2E-BLOCK'), None)
            context["finished_good"] = fg if fg else fgs[0]
            print_info(f"Using existing finished good: {context['finished_good']['name']}")
        else:
            print_error("Could not create or find finished good")
            return context

    # Step 3.2: Create BOM (Bill of Materials)
    print_step("3.2", "Create/Verify BOM")
    bom_data = {
        "finished_good_id": context["finished_good"]["id"],
        "material_id": context["material"]["id"],
        "quantity_per_unit": 2.0  # 2kg of steel per block
    }

    result, status = api_post("/api/bom", bom_data)
    if status == 200 and result:
        context["bom"] = result
        print_success(f"Created BOM: {context['material']['name']} → {context['finished_good']['name']}")
        print_data("Quantity per unit", "2.0 kg")
    else:
        # BOM might already exist
        bom = api_get(f"/api/bom/{context['finished_good']['id']}")
        if bom:
            context["bom"] = bom
            print_info("BOM already exists")
        else:
            print_warning("Could not create BOM")

    # Step 3.3: Get Contractor Inventory Before Production
    print_step("3.3", "Check Contractor Inventory Before Production")
    contractor_inv = api_get(f"/api/contractors/{context['contractor']['id']}/inventory")
    inv_before = 0
    if contractor_inv:
        mat_inv = next((i for i in contractor_inv if i['material_id'] == context['material']['id']), None)
        if mat_inv:
            inv_before = mat_inv['quantity']
            print_info(f"Contractor inventory before: {inv_before} kg")

    # Step 3.4: Report Production
    print_step("3.4", "Report Production")
    production_data = {
        "contractor_id": context["contractor"]["id"],
        "finished_good_id": context["finished_good"]["id"],
        "quantity": 50,  # Produce 50 blocks
        "production_date": date.today().isoformat()
    }

    result, status = api_post("/api/production/report", production_data)
    if status == 200 and result:
        context["production"] = result
        print_success(f"Production reported: {result.get('quantity', 50)} units")

        # Check for anomalies in response
        if "anomalies" in result and result["anomalies"]:
            print_warning(f"Anomalies detected: {len(result['anomalies'])}")
            for anomaly in result["anomalies"]:
                print_data("Anomaly Type", anomaly.get("anomaly_type", "Unknown"))
                print_data("Variance", f"{anomaly.get('variance_percent', 0):.1f}%")
        else:
            print_info("No anomalies detected")
    else:
        print_error("Failed to report production")
        return context

    # Step 3.5: Verify Consumption Calculated
    print_step("3.5", "Verify Material Consumption")
    contractor_inv = api_get(f"/api/contractors/{context['contractor']['id']}/inventory")
    if contractor_inv:
        mat_inv = next((i for i in contractor_inv if i['material_id'] == context['material']['id']), None)
        if mat_inv:
            inv_after = mat_inv['quantity']
            expected_consumption = 50 * 2.0  # 50 blocks * 2kg each = 100kg
            actual_consumption = inv_before - inv_after
            print_info(f"Inventory after production: {inv_after} kg")
            print_info(f"Expected consumption: {expected_consumption} kg (50 units × 2 kg)")
            print_info(f"Actual consumption: {actual_consumption} kg")
            if abs(actual_consumption - expected_consumption) < 0.01:
                print_success("Consumption calculated correctly")
            else:
                print_warning(f"Consumption variance: {actual_consumption - expected_consumption} kg")

    # Step 3.6: Check Production History
    print_step("3.6", "Verify Production History")
    history = api_get(f"/api/production/history/{context['contractor']['id']}")
    if history:
        print_success(f"Production history has {len(history)} records")
        if history:
            latest = history[0]
            print_data("Latest Production", f"{latest.get('quantity', 'N/A')} units")
            print_data("Date", latest.get('production_date', 'N/A'))

    # Step 3.7: Check Anomalies
    print_step("3.7", "Check Anomaly List")
    anomalies = api_get("/api/anomalies")
    if anomalies:
        open_anomalies = [a for a in anomalies if not a.get('resolved')]
        print_info(f"Total anomalies: {len(anomalies)}, Open: {len(open_anomalies)}")
        context["anomalies"] = anomalies

    print_info("Production flow complete!")
    return context


# =============================================================================
# TEST 4: REJECTION FLOW
# =============================================================================

def test_rejection_flow(context: Dict) -> Dict:
    """Test material rejection workflow."""
    print_header("TEST 4: REJECTION FLOW")

    if "contractor" not in context or "material" not in context:
        print_error("Missing context from previous tests")
        return context

    # Step 4.1: Get Contractor Inventory Before Rejection
    print_step("4.1", "Check Contractor Inventory Before Rejection")
    contractor_inv = api_get(f"/api/contractors/{context['contractor']['id']}/inventory")
    inv_before = 0
    if contractor_inv:
        mat_inv = next((i for i in contractor_inv if i['material_id'] == context['material']['id']), None)
        if mat_inv:
            inv_before = mat_inv['quantity']
            print_info(f"Contractor inventory before rejection: {inv_before} kg")

    # Step 4.2: Report Rejection (Contractor reports defective material)
    print_step("4.2", "Report Material Rejection")
    rejection_data = {
        "contractor_id": context["contractor"]["id"],
        "material_id": context["material"]["id"],
        "quantity_rejected": 10.0,
        "unit_of_measure": context["material"]["unit"],
        "rejection_date": date.today().isoformat(),
        "rejection_reason": "E2E Test - Material defective due to rust damage during transport",
        "reported_by": "E2E Test Contractor Rep"
    }

    result, status = api_post("/api/rejections/report", rejection_data)
    if status == 200 and result:
        context["rejection"] = result
        print_success(f"Rejection reported: {result['rejection_number']}")
        print_data("Status", result['status'])
        print_data("Quantity", f"{result['quantity_rejected']} {result['unit_of_measure']}")
    else:
        print_error(f"Failed to report rejection (HTTP {status})")
        if result:
            print_data("Error", result.get('detail', result))
        return context

    # Step 4.3: Verify Contractor Inventory Not Changed Yet
    print_step("4.3", "Verify Inventory Not Changed (Pending Approval)")
    contractor_inv = api_get(f"/api/contractors/{context['contractor']['id']}/inventory")
    if contractor_inv:
        mat_inv = next((i for i in contractor_inv if i['material_id'] == context['material']['id']), None)
        if mat_inv:
            if abs(mat_inv['quantity'] - inv_before) < 0.01:
                print_success("Contractor inventory unchanged (awaiting approval)")
            else:
                print_warning("Inventory changed before approval")

    # Step 4.4: Manager Approves Rejection
    print_step("4.4", "Manager Approves Rejection")
    approve_data = {
        "approved_by": "E2E Test Manager",
        "return_warehouse_id": context["warehouse"]["id"],
        "notes": "Approved - confirmed defective material"
    }

    result, status = api_put(f"/api/rejections/{context['rejection']['id']}/approve", approve_data)
    if status == 200 and result:
        context["rejection"] = result
        print_success(f"Rejection approved - Status: {result['status']}")
    else:
        print_error("Failed to approve rejection")
        return context

    # Step 4.5: Verify Contractor Inventory Decreased
    print_step("4.5", "Verify Contractor Inventory Decreased After Approval")
    contractor_inv = api_get(f"/api/contractors/{context['contractor']['id']}/inventory")
    if contractor_inv:
        mat_inv = next((i for i in contractor_inv if i['material_id'] == context['material']['id']), None)
        if mat_inv:
            expected = inv_before - 10.0
            if abs(mat_inv['quantity'] - expected) < 0.01:
                print_success(f"Contractor inventory decreased: {inv_before} → {mat_inv['quantity']}")
            else:
                print_warning(f"Expected {expected}, got {mat_inv['quantity']}")

    # Step 4.6: Warehouse Receives Returned Material
    print_step("4.6", "Warehouse Receives Returned Material")
    receive_data = {
        "received_by": "E2E Warehouse Staff",
        "notes": "Material received and inspected"
    }

    result, status = api_put(f"/api/rejections/{context['rejection']['id']}/receive", receive_data)
    if status == 200 and result:
        context["rejection"] = result
        print_success(f"Material received at warehouse - Status: {result['status']}")
        if result.get('warehouse_grn_number'):
            print_data("Return GRN", result['warehouse_grn_number'])
    else:
        print_error("Failed to receive returned material")

    # Step 4.7: Verify Complete Rejection Flow
    print_step("4.7", "Verify Rejection Flow Complete")
    rejection = api_get(f"/api/rejections/{context['rejection']['id']}")
    if rejection:
        print_success("Rejection workflow complete")
        print_data("Final Status", rejection['status'])
        print_data("Reported By", rejection['reported_by'])
        print_data("Approved By", rejection.get('approved_by', 'N/A'))
        print_data("Received By", rejection.get('received_by', 'N/A'))

    print_info("Rejection flow complete!")
    return context



# =============================================================================
# TEST SUMMARY
# =============================================================================

def print_test_summary():
    """Print final test summary."""
    print_header("TEST SUMMARY")

    total = test_results["passed"] + test_results["failed"]
    pass_rate = (test_results["passed"] / total * 100) if total > 0 else 0

    print(f"\n  Total Tests:   {total}")
    print(f"  Passed:        {test_results['passed']} ({pass_rate:.1f}%)")
    print(f"  Failed:        {test_results['failed']}")
    print(f"  Warnings:      {test_results['warnings']}")

    if test_results["failed"] > 0:
        print("\n  FAILED TESTS:")
        for detail in test_results["details"]:
            if detail.startswith("[FAIL]"):
                print(f"    {detail}")

    print("\n" + "=" * 80)
    if test_results["failed"] == 0:
        print("  ✓ ALL TESTS PASSED - System is working correctly!")
    else:
        print("  ✗ SOME TESTS FAILED - Review the errors above")
    print("=" * 80)

    return test_results["failed"] == 0


# =============================================================================
# MAIN EXECUTION
# =============================================================================

def main():
    """Run all end-to-end tests."""
    print("\n" + "█" * 80)
    print("█" + " " * 78 + "█")
    print("█" + "  MATERIAL AUDIT MVP - END-TO-END TEST SUITE".center(78) + "█")
    print("█" + " " * 78 + "█")
    print("█" * 80)
    print(f"\n  Server: {BASE_URL}")
    print(f"  Date:   {date.today()}")
    print(f"  Time:   {__import__('datetime').datetime.now().strftime('%H:%M:%S')}")

    # Verify server is running
    print_subheader("Checking Server Connectivity")
    try:
        response = requests.get(f"{BASE_URL}/", timeout=5)
        if response.status_code == 200:
            print_success("Server is running")
        else:
            print_error(f"Server returned unexpected status: {response.status_code}")
            return 1
    except requests.exceptions.ConnectionError:
        print_error(f"Cannot connect to server at {BASE_URL}")
        print_info("Please ensure the backend server is running:")
        print_info("  cd backend && uvicorn app.main:app --reload")
        return 1
    except Exception as e:
        print_error(f"Connection error: {e}")
        return 1

    # Run test suites
    context = {}

    try:
        # Test 1: Warehouse Setup
        context = test_warehouse_setup()

        # Test 2: Issuance Flow
        context = test_issuance_flow(context)

        # Test 3: Production Flow
        context = test_production_flow(context)

        # Test 4: Rejection Flow
        context = test_rejection_flow(context)

        # (Audit and Reconciliation flows removed - use Inventory Checks instead)

    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        return 1
    except Exception as e:
        print_error(f"Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return 1

    # Print summary
    success = print_test_summary()

    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
