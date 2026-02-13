"""
Verify Backend API Responses - Field Name Checker
Tests that API responses contain the expected 'type_name' field
"""

import requests
import json
from colorama import init, Fore, Style

init(autoreset=True)

# Configuration
BASE_URL = "http://localhost:8000"
CLIENT_NAME = "test_tenant"
USERNAME = "admin"
PASSWORD = "testpass123"

def print_header(text):
    print(f"\n{'='*80}")
    print(f"{Fore.CYAN}{Style.BRIGHT}{text}{Style.RESET_ALL}")
    print(f"{'='*80}")

def print_success(text):
    print(f"{Fore.GREEN}[OK] {text}{Style.RESET_ALL}")

def print_error(text):
    print(f"{Fore.RED}[FAIL] {text}{Style.RESET_ALL}")

def print_warning(text):
    print(f"{Fore.YELLOW}[WARNING] {text}{Style.RESET_ALL}")

def print_json(data, title="Response"):
    print(f"\n{Fore.MAGENTA}{title}:{Style.RESET_ALL}")
    print(json.dumps(data, indent=2))

# Step 1: Login
print_header("STEP 1: Login and Get Token")

login_payload = {
    "username": USERNAME,
    "password": PASSWORD
}

headers = {
    "x-client-name": CLIENT_NAME,
    "Content-Type": "application/json"
}

try:
    response = requests.post(f"{BASE_URL}/api/v1/auth/login", json=login_payload, headers=headers)
    response.raise_for_status()
    login_data = response.json()
    token = login_data.get("access_token")

    if token:
        print_success(f"Login successful! Token: {token[:50]}...")
    else:
        print_error("No token in response!")
        print_json(login_data)
        exit(1)

except Exception as e:
    print_error(f"Login failed: {str(e)}")
    if hasattr(e, 'response') and e.response is not None:
        print_json(e.response.json() if e.response.text else {}, "Error Details")
    exit(1)

# Update headers with auth token
auth_headers = {
    "Authorization": f"Bearer {token}",
    "x-client-name": CLIENT_NAME,
    "Content-Type": "application/json"
}

# Step 2: Test Route Types Dropdown
print_header("STEP 2: Test Route Types Dropdown API")

try:
    response = requests.get(f"{BASE_URL}/api/v1/masters/route-types/dropdown", headers=auth_headers)
    response.raise_for_status()
    route_types = response.json()

    print_success(f"Got {len(route_types)} route types")

    if route_types:
        first_item = route_types[0]
        print_json(first_item, "First Route Type")

        # Check for type_name field
        if "type_name" in first_item:
            print_success(f"'type_name' field EXISTS: '{first_item['type_name']}'")
        else:
            print_error("'type_name' field MISSING!")
            print_warning(f"Available fields: {list(first_item.keys())}")

        # Check for wrong field names
        if "name" in first_item:
            print_error("Wrong field 'name' found (should be 'type_name')")

        # Verify structure
        expected_fields = ["id", "type_name"]
        actual_fields = list(first_item.keys())

        print(f"\nExpected fields: {expected_fields}")
        print(f"Actual fields: {actual_fields}")

        if set(expected_fields).issubset(set(actual_fields)):
            print_success("All expected fields present!")
        else:
            missing = set(expected_fields) - set(actual_fields)
            print_error(f"Missing fields: {missing}")
    else:
        print_warning("No route types found in database")

except Exception as e:
    print_error(f"Route types dropdown failed: {str(e)}")
    if hasattr(e, 'response') and e.response is not None:
        print_json(e.response.json() if e.response.text else {}, "Error Details")

# Step 3: Test Trip Types Dropdown
print_header("STEP 3: Test Trip Types Dropdown API")

try:
    response = requests.get(f"{BASE_URL}/api/v1/masters/trip-types/dropdown", headers=auth_headers)
    response.raise_for_status()
    trip_types = response.json()

    print_success(f"Got {len(trip_types)} trip types")

    if trip_types:
        first_item = trip_types[0]
        print_json(first_item, "First Trip Type")

        # Check for type_name field
        if "type_name" in first_item:
            print_success(f"'type_name' field EXISTS: '{first_item['type_name']}'")
        else:
            print_error("'type_name' field MISSING!")
            print_warning(f"Available fields: {list(first_item.keys())}")

        # Check for wrong field names
        if "name" in first_item:
            print_error("Wrong field 'name' found (should be 'type_name')")

        # Verify structure
        expected_fields = ["id", "type_name"]
        actual_fields = list(first_item.keys())

        print(f"\nExpected fields: {expected_fields}")
        print(f"Actual fields: {actual_fields}")

        if set(expected_fields).issubset(set(actual_fields)):
            print_success("All expected fields present!")
        else:
            missing = set(expected_fields) - set(actual_fields)
            print_error(f"Missing fields: {missing}")
    else:
        print_warning("No trip types found in database")

except Exception as e:
    print_error(f"Trip types dropdown failed: {str(e)}")
    if hasattr(e, 'response') and e.response is not None:
        print_json(e.response.json() if e.response.text else {}, "Error Details")

# Step 4: Test Route Types /all endpoint
print_header("STEP 4: Test Route Types /all API")

try:
    response = requests.get(f"{BASE_URL}/api/v1/masters/route-types/all", headers=auth_headers)
    response.raise_for_status()
    all_route_types = response.json()

    print_success(f"Got {len(all_route_types)} route types")

    if all_route_types:
        first_item = all_route_types[0]
        print_json(first_item, "First Route Type (Full)")

        # Check for type_name field
        if "type_name" in first_item:
            print_success(f"'type_name' field EXISTS: '{first_item['type_name']}'")
        else:
            print_error("'type_name' field MISSING!")
            print_warning(f"Available fields: {list(first_item.keys())}")

        # Verify full structure
        expected_fields = ["id", "type_name", "description", "is_active", "created_at", "updated_at"]
        actual_fields = list(first_item.keys())

        print(f"\nExpected fields: {expected_fields}")
        print(f"Actual fields: {actual_fields}")

        if set(expected_fields).issubset(set(actual_fields)):
            print_success("All expected fields present!")
        else:
            missing = set(expected_fields) - set(actual_fields)
            print_error(f"Missing fields: {missing}")
    else:
        print_warning("No route types found")

except Exception as e:
    print_error(f"Route types /all failed: {str(e)}")
    if hasattr(e, 'response') and e.response is not None:
        print_json(e.response.json() if e.response.text else {}, "Error Details")

# Step 5: Test Creating a Route Type
print_header("STEP 5: Test Create Route Type API")

test_route_type = {
    "type_name": "API Test Route Type",
    "description": "Created by verification script",
    "is_active": True
}

print(f"Payload being sent:")
print_json(test_route_type)

try:
    response = requests.post(f"{BASE_URL}/api/v1/masters/route-types/", json=test_route_type, headers=auth_headers)
    response.raise_for_status()
    created = response.json()

    print_success("Route type created successfully!")
    print_json(created, "Created Route Type")

    # Check response has type_name
    if "type_name" in created:
        print_success(f"Response contains 'type_name': '{created['type_name']}'")
    else:
        print_error("Response missing 'type_name' field!")
        print_warning(f"Available fields: {list(created.keys())}")

except requests.exceptions.HTTPError as e:
    if e.response.status_code == 422:
        print_error("422 Validation Error - Backend rejected the payload!")
        error_detail = e.response.json()
        print_json(error_detail, "Validation Error Details")

        # Check what field was expected
        if "detail" in error_detail:
            for err in error_detail["detail"]:
                if err.get("type") == "missing":
                    missing_field = err["loc"][-1]
                    print_error(f"Backend expects field: '{missing_field}' (we sent 'type_name')")
    else:
        print_error(f"Create failed: {str(e)}")
        print_json(e.response.json() if e.response.text else {}, "Error Details")
except Exception as e:
    print_error(f"Create failed: {str(e)}")

# Step 6: Test Routes API (to see how route_type and trip_type are returned)
print_header("STEP 6: Test Routes API (Check route_type and trip_type fields)")

try:
    response = requests.get(f"{BASE_URL}/api/v1/masters/routes/all_routes?active_only=true", headers=auth_headers)
    response.raise_for_status()
    routes = response.json()

    print_success(f"Got {len(routes)} routes")

    if routes:
        first_route = routes[0]
        print_json(first_route, "First Route")

        # Check route_type field
        if "route_type" in first_route:
            route_type_value = first_route["route_type"]
            print_success(f"'route_type' field EXISTS")
            print(f"  Type: {type(route_type_value).__name__}")
            print(f"  Value: {route_type_value}")

            if isinstance(route_type_value, str):
                print_success("route_type is a STRING (correct)")
            elif isinstance(route_type_value, dict):
                print_warning("route_type is an OBJECT - check if it has 'type_name' field")
                if "type_name" in route_type_value:
                    print_success(f"  Object has 'type_name': {route_type_value['type_name']}")
                else:
                    print_error(f"  Object missing 'type_name': {list(route_type_value.keys())}")
            else:
                print_warning(f"route_type is {type(route_type_value).__name__}")
        else:
            print_error("'route_type' field MISSING!")

        # Check trip_type field
        if "trip_type" in first_route:
            trip_type_value = first_route["trip_type"]
            print_success(f"'trip_type' field EXISTS")
            print(f"  Type: {type(trip_type_value).__name__}")
            print(f"  Value: {trip_type_value}")

            if isinstance(trip_type_value, str):
                print_success("trip_type is a STRING (correct)")
            elif isinstance(trip_type_value, dict):
                print_warning("trip_type is an OBJECT - check if it has 'type_name' field")
                if "type_name" in trip_type_value:
                    print_success(f"  Object has 'type_name': {trip_type_value['type_name']}")
                else:
                    print_error(f"  Object missing 'type_name': {list(trip_type_value.keys())}")
            else:
                print_warning(f"trip_type is {type(trip_type_value).__name__}")
        else:
            print_error("'trip_type' field MISSING!")

    else:
        print_warning("No routes found in database")

except Exception as e:
    print_error(f"Routes API failed: {str(e)}")
    if hasattr(e, 'response') and e.response is not None:
        try:
            print_json(e.response.json(), "Error Details")
        except:
            print(f"Response text: {e.response.text}")

# Final Summary
print_header("VERIFICATION SUMMARY")

print(f"""
{Fore.CYAN}Expected API Behavior:{Style.RESET_ALL}
1. Route Types Dropdown: Should return [{{ "id": "uuid", "type_name": "Upward" }}]
2. Trip Types Dropdown: Should return [{{ "id": "uuid", "type_name": "First Trip" }}]
3. Route Types /all: Should include "type_name" field in response
4. Create Route Type: Should accept {{ "type_name": "value" }} payload
5. Routes API: Should return route_type and trip_type as STRING values

{Fore.YELLOW}If any tests failed:{Style.RESET_ALL}
- 422 errors: Backend expects different field name (check Pydantic schema)
- Missing 'type_name': Database column might be named 'name' instead
- Wrong type: Check if serialization is converting strings to objects

{Fore.GREEN}Next Steps:{Style.RESET_ALL}
1. Review any [FAIL] messages above
2. Check if database columns match Pydantic schemas
3. Verify frontend is accessing correct field names
4. Confirm frontend datatable columns match API response structure
""")
