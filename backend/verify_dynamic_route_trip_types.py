"""
Verification Script for Dynamic Route and Trip Types Implementation
This script verifies:
1. Backend seeded data
2. Dropdown endpoints
3. Route creation with new UUID structure
"""

import asyncio
import httpx
from datetime import time
import sys

# Configuration
BASE_URL = "http://localhost:8000"  # Update with your actual API URL
AUTH_TOKEN = None  # Will be set after login

# Colors for output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'

def print_success(message):
    print(f"{Colors.GREEN}✓ {message}{Colors.RESET}")

def print_error(message):
    print(f"{Colors.RED}✗ {message}{Colors.RESET}")

def print_info(message):
    print(f"{Colors.BLUE}ℹ {message}{Colors.RESET}")

def print_warning(message):
    print(f"{Colors.YELLOW}⚠ {message}{Colors.RESET}")

async def login(client):
    """Login to get authentication token"""
    print_info("Logging in...")
    try:
        response = await client.post(
            f"{BASE_URL}/auth/login",
            json={
                "username": "admin",  # Update with your credentials
                "password": "admin123"
            }
        )
        if response.status_code == 200:
            data = response.json()
            print_success("Login successful")
            return data.get("access_token")
        else:
            print_error(f"Login failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print_error(f"Login error: {str(e)}")
        return None

async def verify_seeded_data(client, headers):
    """Verify that route types and trip types have seeded data"""
    print_info("\n=== STEP 1: Verifying Seeded Data ===")

    # Check Route Types
    print_info("Checking route types...")
    try:
        response = await client.get(f"{BASE_URL}/masters/route-types/all", headers=headers)
        if response.status_code == 200:
            route_types = response.json()
            print_success(f"Found {len(route_types)} route types")
            for rt in route_types:
                print(f"  - {rt['type_name']} (ID: {rt['id']})")

            # Verify default types exist
            type_names = [rt['type_name'] for rt in route_types]
            if "Upward" in type_names and "Downward" in type_names:
                print_success("Default route types (Upward, Downward) are seeded")
            else:
                print_warning("Default route types may be missing")
        else:
            print_error(f"Failed to fetch route types: {response.status_code}")
            print(response.text)
    except Exception as e:
        print_error(f"Error fetching route types: {str(e)}")

    # Check Trip Types
    print_info("\nChecking trip types...")
    try:
        response = await client.get(f"{BASE_URL}/masters/trip-types/all", headers=headers)
        if response.status_code == 200:
            trip_types = response.json()
            print_success(f"Found {len(trip_types)} trip types")
            for tt in trip_types:
                print(f"  - {tt['type_name']} (ID: {tt['id']})")

            # Verify default types exist
            type_names = [tt['type_name'] for tt in trip_types]
            if "First Trip" in type_names and "Second Trip" in type_names:
                print_success("Default trip types (First Trip, Second Trip) are seeded")
            else:
                print_warning("Default trip types may be missing")
        else:
            print_error(f"Failed to fetch trip types: {response.status_code}")
            print(response.text)
    except Exception as e:
        print_error(f"Error fetching trip types: {str(e)}")

async def test_dropdown_endpoints(client, headers):
    """Test dropdown endpoints for route types and trip types"""
    print_info("\n=== STEP 2: Testing Dropdown Endpoints ===")

    # Test Route Types Dropdown
    print_info("Testing route types dropdown...")
    try:
        response = await client.get(
            f"{BASE_URL}/masters/route-types/dropdown",
            headers=headers,
            params={"active_only": True}
        )
        if response.status_code == 200:
            dropdown_data = response.json()
            print_success(f"Route types dropdown returned {len(dropdown_data)} items")
            print("  Structure check:")
            if dropdown_data:
                item = dropdown_data[0]
                if 'id' in item and 'type_name' in item:
                    print_success("  ✓ Correct structure: {id, type_name}")
                    print(f"  Example: {item}")
                else:
                    print_error("  ✗ Incorrect structure")
        else:
            print_error(f"Route types dropdown failed: {response.status_code}")
            print(response.text)
    except Exception as e:
        print_error(f"Error testing route types dropdown: {str(e)}")

    # Test Trip Types Dropdown
    print_info("\nTesting trip types dropdown...")
    try:
        response = await client.get(
            f"{BASE_URL}/masters/trip-types/dropdown",
            headers=headers,
            params={"active_only": True}
        )
        if response.status_code == 200:
            dropdown_data = response.json()
            print_success(f"Trip types dropdown returned {len(dropdown_data)} items")
            print("  Structure check:")
            if dropdown_data:
                item = dropdown_data[0]
                if 'id' in item and 'type_name' in item:
                    print_success("  ✓ Correct structure: {id, type_name}")
                    print(f"  Example: {item}")
                else:
                    print_error("  ✗ Incorrect structure")
        else:
            print_error(f"Trip types dropdown failed: {response.status_code}")
            print(response.text)
    except Exception as e:
        print_error(f"Error testing trip types dropdown: {str(e)}")

async def test_route_creation(client, headers):
    """Test route creation with new UUID structure"""
    print_info("\n=== STEP 3: Testing Route Creation with UUID Structure ===")

    # First, get route and trip type IDs
    print_info("Fetching type IDs for route creation...")
    route_type_id = None
    trip_type_id = None

    try:
        # Get route type ID
        response = await client.get(f"{BASE_URL}/masters/route-types/dropdown", headers=headers)
        if response.status_code == 200:
            route_types = response.json()
            if route_types:
                route_type_id = route_types[0]['id']
                print_success(f"Using route_type_id: {route_type_id}")

        # Get trip type ID
        response = await client.get(f"{BASE_URL}/masters/trip-types/dropdown", headers=headers)
        if response.status_code == 200:
            trip_types = response.json()
            if trip_types:
                trip_type_id = trip_types[0]['id']
                print_success(f"Using trip_type_id: {trip_type_id}")

        if not route_type_id or not trip_type_id:
            print_error("Could not get type IDs. Cannot test route creation.")
            return

        # Create a test route
        print_info("\nAttempting to create test route...")
        test_route = {
            "route_name": "Test Dynamic Route",
            "starting_stop": "Test Start Point",
            "ending_stop": "Test End Point",
            "number_of_stops": 5,
            "route_type_id": route_type_id,
            "trip_type_id": trip_type_id,
            "start_time": "08:00:00",
            "end_time": "09:00:00",
            "is_active": True
        }

        response = await client.post(
            f"{BASE_URL}/masters/routes/",
            json=test_route,
            headers=headers
        )

        if response.status_code in [200, 201]:
            created_route = response.json()
            print_success("Route created successfully!")
            print(f"  Route ID: {created_route['id']}")
            print(f"  Route Name: {created_route['route_name']}")

            # Verify nested relationships
            if 'route_type_rel' in created_route and created_route['route_type_rel']:
                print_success(f"  ✓ route_type_rel populated: {created_route['route_type_rel']['type_name']}")
            else:
                print_warning("  ⚠ route_type_rel not populated in response")

            if 'trip_type_rel' in created_route and created_route['trip_type_rel']:
                print_success(f"  ✓ trip_type_rel populated: {created_route['trip_type_rel']['type_name']}")
            else:
                print_warning("  ⚠ trip_type_rel not populated in response")

            # Clean up - delete the test route
            print_info(f"\nCleaning up test route...")
            delete_response = await client.delete(
                f"{BASE_URL}/masters/routes/{created_route['id']}",
                headers=headers
            )
            if delete_response.status_code == 200:
                print_success("Test route cleaned up successfully")
        else:
            print_error(f"Route creation failed: {response.status_code}")
            print(f"Error details: {response.text}")

    except Exception as e:
        print_error(f"Error during route creation test: {str(e)}")

async def create_custom_types(client, headers):
    """Bonus: Create custom route and trip types"""
    print_info("\n=== BONUS: Testing Custom Type Creation ===")

    # Create custom route type
    print_info("Creating custom route type...")
    try:
        custom_route_type = {
            "type_name": "Express Route",
            "description": "High-speed routes with minimal stops",
            "is_active": True
        }
        response = await client.post(
            f"{BASE_URL}/masters/route-types/",
            json=custom_route_type,
            headers=headers
        )
        if response.status_code in [200, 201]:
            created = response.json()
            print_success(f"Custom route type created: {created['type_name']} (ID: {created['id']})")
        elif response.status_code == 400 and "already exists" in response.text:
            print_warning("Custom route type already exists (this is OK)")
        else:
            print_error(f"Failed to create custom route type: {response.status_code}")
    except Exception as e:
        print_error(f"Error creating custom route type: {str(e)}")

    # Create custom trip type
    print_info("\nCreating custom trip type...")
    try:
        custom_trip_type = {
            "type_name": "Evening Extra",
            "description": "Additional evening trips for activities",
            "is_active": True
        }
        response = await client.post(
            f"{BASE_URL}/masters/trip-types/",
            json=custom_trip_type,
            headers=headers
        )
        if response.status_code in [200, 201]:
            created = response.json()
            print_success(f"Custom trip type created: {created['type_name']} (ID: {created['id']})")
        elif response.status_code == 400 and "already exists" in response.text:
            print_warning("Custom trip type already exists (this is OK)")
        else:
            print_error(f"Failed to create custom trip type: {response.status_code}")
    except Exception as e:
        print_error(f"Error creating custom trip type: {str(e)}")

async def main():
    """Main verification function"""
    print_info("=" * 60)
    print_info("Dynamic Route and Trip Types Verification Script")
    print_info("=" * 60)

    async with httpx.AsyncClient(timeout=30.0) as client:
        # Login
        global AUTH_TOKEN
        AUTH_TOKEN = await login(client)
        if not AUTH_TOKEN:
            print_error("Cannot proceed without authentication")
            return

        headers = {"Authorization": f"Bearer {AUTH_TOKEN}"}

        # Run verification steps
        await verify_seeded_data(client, headers)
        await test_dropdown_endpoints(client, headers)
        await test_route_creation(client, headers)
        await create_custom_types(client, headers)

        print_info("\n" + "=" * 60)
        print_success("Verification complete!")
        print_info("=" * 60)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print_warning("\nVerification interrupted by user")
        sys.exit(0)
    except Exception as e:
        print_error(f"Unexpected error: {str(e)}")
        sys.exit(1)
