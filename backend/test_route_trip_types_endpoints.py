"""
Test script for Route Types and Trip Types endpoints
Tests the complete flow: Login -> Get Dropdowns -> Create New Type -> Verify
"""
import requests
import json
from datetime import datetime

# ============================================================================
# CONFIGURATION - UPDATE THESE VALUES
# ============================================================================
BASE_URL = "http://localhost:8000"
CLIENT_NAME = "test_tenant"  # Your tenant/client name (from .env TENANT_DEFAULT_NAME)
USERNAME = "admin"            # Admin username
PASSWORD = "testpass123"      # Admin password

# ============================================================================
# Test Script
# ============================================================================

def print_section(title):
    print("\n" + "=" * 80)
    print(f" {title}")
    print("=" * 80)

def print_result(success, message):
    status = "[OK]" if success else "[FAIL]"
    print(f"{status} {message}")

def login():
    """Login and get access token"""
    print_section("Step 1: Login")

    login_url = f"{BASE_URL}/api/v1/auth/login"
    payload = {
        "username": USERNAME,
        "password": PASSWORD,
        "client_name": CLIENT_NAME
    }

    headers = {
        "Content-Type": "application/json",
        "x-client-name": CLIENT_NAME
    }

    try:
        response = requests.post(login_url, json=payload, headers=headers)

        if response.status_code == 200:
            data = response.json()
            token = data.get('access_token') or data.get('token')

            if token:
                print_result(True, f"Login successful!")
                print(f"  User: {data.get('user', {}).get('username', USERNAME)}")
                print(f"  Role: {data.get('user', {}).get('role_name', 'N/A')}")
                print(f"  Token: {token[:50]}...")
                return token
            else:
                print_result(False, "Login successful but no token in response")
                print(json.dumps(data, indent=2))
                return None
        else:
            print_result(False, f"Login failed with status {response.status_code}")
            print(response.text)
            return None

    except Exception as e:
        print_result(False, f"Login error: {str(e)}")
        return None

def test_route_types_dropdown(token):
    """Test GET /api/v1/masters/route-types/dropdown"""
    print_section("Step 2: Test Route Types Dropdown")

    url = f"{BASE_URL}/api/v1/masters/route-types/dropdown"
    headers = {
        "Authorization": f"Bearer {token}",
        "x-client-name": CLIENT_NAME
    }

    try:
        response = requests.get(url, headers=headers)

        if response.status_code == 200:
            data = response.json()
            print_result(True, f"Route types dropdown retrieved successfully")
            print(f"  Found {len(data)} route types:")
            for item in data:
                print(f"    - {item.get('type_name', item)}")
            return True
        elif response.status_code == 403:
            print_result(False, "403 Forbidden - Permissions not set correctly!")
            print(f"  Error: {response.json().get('detail', 'No detail')}")
            print("\n  SOLUTION: Run add_route_trip_type_permissions_TENANT.sql in test schema")
            return False
        else:
            print_result(False, f"Failed with status {response.status_code}")
            print(f"  Response: {response.text}")
            return False

    except Exception as e:
        print_result(False, f"Error: {str(e)}")
        return False

def test_trip_types_dropdown(token):
    """Test GET /api/v1/masters/trip-types/dropdown"""
    print_section("Step 3: Test Trip Types Dropdown")

    url = f"{BASE_URL}/api/v1/masters/trip-types/dropdown"
    headers = {
        "Authorization": f"Bearer {token}",
        "x-client-name": CLIENT_NAME
    }

    try:
        response = requests.get(url, headers=headers)

        if response.status_code == 200:
            data = response.json()
            print_result(True, f"Trip types dropdown retrieved successfully")
            print(f"  Found {len(data)} trip types:")
            for item in data:
                print(f"    - {item.get('type_name', item)}")
            return True
        elif response.status_code == 403:
            print_result(False, "403 Forbidden - Permissions not set correctly!")
            print(f"  Error: {response.json().get('detail', 'No detail')}")
            print("\n  SOLUTION: Run add_route_trip_type_permissions_TENANT.sql in test schema")
            return False
        else:
            print_result(False, f"Failed with status {response.status_code}")
            print(f"  Response: {response.text}")
            return False

    except Exception as e:
        print_result(False, f"Error: {str(e)}")
        return False

def test_create_route_type(token):
    """Test POST /api/v1/masters/route-types/"""
    print_section("Step 4: Test Create New Route Type")

    url = f"{BASE_URL}/api/v1/masters/route-types/"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "x-client-name": CLIENT_NAME
    }

    # Create a test route type with timestamp to avoid duplicates
    test_type_name = f"Test Route {datetime.now().strftime('%H%M%S')}"
    payload = {
        "type_name": test_type_name,
        "description": "Created by automated test script",
        "is_active": True
    }

    try:
        response = requests.post(url, json=payload, headers=headers)

        if response.status_code == 201 or response.status_code == 200:
            data = response.json()
            print_result(True, f"Route type created successfully")
            print(f"  Name: {data.get('type_name')}")
            print(f"  ID: {data.get('id')}")
            return data.get('id')
        elif response.status_code == 403:
            print_result(False, "403 Forbidden - No permission to create route types!")
            print(f"  Error: {response.json().get('detail', 'No detail')}")
            return None
        else:
            print_result(False, f"Failed with status {response.status_code}")
            print(f"  Response: {response.text}")
            return None

    except Exception as e:
        print_result(False, f"Error: {str(e)}")
        return None

def test_get_all_route_types(token):
    """Test GET /api/v1/masters/route-types/all"""
    print_section("Step 5: Test Get All Route Types")

    url = f"{BASE_URL}/api/v1/masters/route-types/all"
    headers = {
        "Authorization": f"Bearer {token}",
        "x-client-name": CLIENT_NAME
    }

    try:
        response = requests.get(url, headers=headers)

        if response.status_code == 200:
            data = response.json()
            print_result(True, f"All route types retrieved successfully")
            print(f"  Total count: {len(data)}")
            print(f"  Route types:")
            for item in data[:10]:  # Show first 10
                active = "+" if item.get('is_active') else "✗"
                print(f"    [{active}] {item.get('type_name')} - {item.get('description', 'No description')}")
            if len(data) > 10:
                print(f"    ... and {len(data) - 10} more")
            return True
        elif response.status_code == 403:
            print_result(False, "403 Forbidden - No permission to list route types!")
            return False
        else:
            print_result(False, f"Failed with status {response.status_code}")
            print(f"  Response: {response.text}")
            return False

    except Exception as e:
        print_result(False, f"Error: {str(e)}")
        return False

def main():
    print("\n" + "=" * 80)
    print(" Route Types & Trip Types Endpoint Test Suite".center(80))
    print("=" * 80)
    print(f"\nBase URL: {BASE_URL}")
    print(f"Client: {CLIENT_NAME}")
    print(f"User: {USERNAME}")

    # Step 1: Login
    token = login()
    if not token:
        print("\n" + "!" * 80)
        print("FAILED: Could not login. Please check credentials and try again.")
        print("!" * 80)
        return

    # Step 2: Test route types dropdown
    route_dropdown_ok = test_route_types_dropdown(token)

    # Step 3: Test trip types dropdown
    trip_dropdown_ok = test_trip_types_dropdown(token)

    # Step 4: Test create route type
    new_route_id = test_create_route_type(token)

    # Step 5: Test get all route types
    get_all_ok = test_get_all_route_types(token)

    # Summary
    print_section("Test Summary")
    print_result(True, "Login")
    print_result(route_dropdown_ok, "Route Types Dropdown")
    print_result(trip_dropdown_ok, "Trip Types Dropdown")
    print_result(new_route_id is not None, "Create Route Type")
    print_result(get_all_ok, "Get All Route Types")

    if route_dropdown_ok and trip_dropdown_ok and new_route_id and get_all_ok:
        print("\n" + "+" * 80)
        print("SUCCESS: All tests passed! +")
        print("The route types and trip types endpoints are working correctly!")
        print("+" * 80)
    else:
        print("\n" + "!" * 80)
        print("FAILED: Some tests failed. See details above.")
        if not (route_dropdown_ok and trip_dropdown_ok):
            print("\nMost likely cause: Permissions not added to test schema")
            print("Solution: Run add_route_trip_type_permissions_TENANT.sql")
        print("!" * 80)

if __name__ == "__main__":
    main()
