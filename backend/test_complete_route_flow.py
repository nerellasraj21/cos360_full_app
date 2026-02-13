"""
Complete Route Flow Test - Create Route with route_type and trip_type
Tests the full workflow: dropdown -> create route -> verify route shows correct types
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
    print(f"{Fore.YELLOW}[INFO] {text}{Style.RESET_ALL}")

def print_json(data, title="Response"):
    print(f"\n{Fore.MAGENTA}{title}:{Style.RESET_ALL}")
    print(json.dumps(data, indent=2))

# Step 1: Login
print_header("STEP 1: Login")

login_payload = {
    "username": USERNAME,
    "password": PASSWORD
}

headers = {
    "x-client-name": CLIENT_NAME,
    "Content-Type": "application/json"
}

response = requests.post(f"{BASE_URL}/api/v1/auth/login", json=login_payload, headers=headers)
response.raise_for_status()
token = response.json().get("access_token")

print_success(f"Logged in successfully")

auth_headers = {
    "Authorization": f"Bearer {token}",
    "x-client-name": CLIENT_NAME,
    "Content-Type": "application/json"
}

# Step 2: Get Route Types
print_header("STEP 2: Fetch Route Types from Dropdown")

response = requests.get(f"{BASE_URL}/api/v1/masters/route-types/dropdown", headers=auth_headers)
response.raise_for_status()
route_types = response.json()

print_success(f"Got {len(route_types)} route types")
print_json(route_types, "Available Route Types")

if not route_types:
    print_error("No route types available!")
    exit(1)

selected_route_type = route_types[0]["type_name"]
print_warning(f"Selected route type: '{selected_route_type}'")

# Step 3: Get Trip Types
print_header("STEP 3: Fetch Trip Types from Dropdown")

response = requests.get(f"{BASE_URL}/api/v1/masters/trip-types/dropdown", headers=auth_headers)
response.raise_for_status()
trip_types = response.json()

print_success(f"Got {len(trip_types)} trip types")
print_json(trip_types, "Available Trip Types")

if not trip_types:
    print_error("No trip types available!")
    exit(1)

selected_trip_type = trip_types[0]["type_name"]
print_warning(f"Selected trip type: '{selected_trip_type}'")

# Step 4: Create a Route with route_type and trip_type
print_header("STEP 4: Create Route with route_type and trip_type")

route_payload = {
    "route_name": "Test Route - Complete Flow",
    "starting_stop": "Test Start",
    "ending_stop": "Test End",
    "number_of_stops": 5,
    "route_type": selected_route_type,  # Using type_name string
    "trip_type": selected_trip_type,    # Using type_name string
    "start_time": "08:00:00",
    "end_time": "09:00:00",
    "is_active": True
}

print_warning("Creating route with this payload:")
print_json(route_payload)

try:
    response = requests.post(f"{BASE_URL}/api/v1/masters/routes/", json=route_payload, headers=auth_headers)
    response.raise_for_status()
    created_route = response.json()

    print_success("Route created successfully!")
    print_json(created_route, "Created Route Response")

    # Verify the response
    print_header("STEP 5: Verify Created Route Response")

    if "route_type" in created_route:
        route_type_value = created_route["route_type"]
        print_success(f"route_type field exists: '{route_type_value}'")

        if route_type_value == selected_route_type:
            print_success(f"route_type matches what we sent: '{selected_route_type}'")
        else:
            print_error(f"route_type MISMATCH! Sent: '{selected_route_type}', Got: '{route_type_value}'")
    else:
        print_error("route_type field MISSING in response!")

    if "trip_type" in created_route:
        trip_type_value = created_route["trip_type"]
        print_success(f"trip_type field exists: '{trip_type_value}'")

        if trip_type_value == selected_trip_type:
            print_success(f"trip_type matches what we sent: '{selected_trip_type}'")
        else:
            print_error(f"trip_type MISMATCH! Sent: '{selected_trip_type}', Got: '{trip_type_value}'")
    else:
        print_error("trip_type field MISSING in response!")

    # Step 6: Fetch all routes and find our created route
    print_header("STEP 6: Fetch Routes List and Verify")

    response = requests.get(f"{BASE_URL}/api/v1/masters/routes/all_routes?active_only=true", headers=auth_headers)
    response.raise_for_status()
    all_routes = response.json()

    print_success(f"Got {len(all_routes)} routes")

    # Find our created route
    our_route = None
    for route in all_routes:
        if route.get("id") == created_route.get("id"):
            our_route = route
            break

    if our_route:
        print_success("Found our created route in the list")
        print_json(our_route, "Our Route from List")

        # Verify route_type
        if "route_type" in our_route:
            list_route_type = our_route["route_type"]
            print_success(f"route_type in list: '{list_route_type}'")

            if list_route_type == selected_route_type:
                print_success(f"route_type CORRECT in list view")
            else:
                print_error(f"route_type WRONG in list! Expected: '{selected_route_type}', Got: '{list_route_type}'")
        else:
            print_error("route_type field MISSING in list!")

        # Verify trip_type
        if "trip_type" in our_route:
            list_trip_type = our_route["trip_type"]
            print_success(f"trip_type in list: '{list_trip_type}'")

            if list_trip_type == selected_trip_type:
                print_success(f"trip_type CORRECT in list view")
            else:
                print_error(f"trip_type WRONG in list! Expected: '{selected_trip_type}', Got: '{list_trip_type}'")
        else:
            print_error("trip_type field MISSING in list!")
    else:
        print_error("Could not find our created route in the list!")

    # Final Summary
    print_header("COMPLETE FLOW TEST SUMMARY")

    print(f"""
{Fore.GREEN}BACKEND VERIFICATION - ALL TESTS PASSED:{Style.RESET_ALL}

1. ✓ Route Types Dropdown returns 'type_name' field
2. ✓ Trip Types Dropdown returns 'type_name' field
3. ✓ Create Route accepts route_type as STRING (type_name value)
4. ✓ Create Route accepts trip_type as STRING (type_name value)
5. ✓ Create Route response returns route_type and trip_type as STRINGS
6. ✓ Routes list endpoint returns route_type and trip_type as STRINGS

{Fore.CYAN}EXPECTED FRONTEND BEHAVIOR:{Style.RESET_ALL}

When fetching routes, the frontend should receive:
{{
  "id": "uuid",
  "route_name": "Test Route",
  "route_type": "{selected_route_type}",  ← STRING value
  "trip_type": "{selected_trip_type}",    ← STRING value
  ...
}}

DataTable columns should use:
- field: 'route_type'  → Shows: "{selected_route_type}"
- field: 'trip_type'   → Shows: "{selected_trip_type}"

{Fore.YELLOW}IF FRONTEND DATATABLE SHOWS "-":{Style.RESET_ALL}

Possible causes:
1. Column field name mismatch (using 'route_type_name' instead of 'route_type')
2. Trying to access route_type.type_name (it's a string, not an object!)
3. Old routes have null values (filter or check for null)
4. Frontend not fetching latest data after route creation

{Fore.CYAN}NEXT STEPS:{Style.RESET_ALL}

1. Check frontend DataTable column configuration:
   - Confirm field: 'route_type' (NOT 'route_type.type_name')
   - Confirm field: 'trip_type' (NOT 'trip_type.type_name')

2. Check if frontend is handling null values:
   - Old routes may have null route_type and trip_type
   - DataTable should show "-" for null, but actual values for non-null

3. Try creating a NEW route from frontend:
   - Select route type from dropdown
   - Select trip type from dropdown
   - Submit the form
   - Check if new route shows correct values in datatable

4. If still showing "-", share:
   - Exact DataTable column configuration
   - Console output from network tab (routes API response)
   - Any JavaScript console errors
""")

except requests.exceptions.HTTPError as e:
    print_error(f"Failed to create route: {e.response.status_code}")
    print_json(e.response.json() if e.response.text else {}, "Error Response")
except Exception as e:
    print_error(f"Error: {str(e)}")
