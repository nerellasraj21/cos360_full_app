import requests
import json

BASE_URL = "http://localhost:8000"
TENANT = "test_tenant"

# Login
print("Logging in...")
login_response = requests.post(
    f"{BASE_URL}/api/v1/auth/login",
    headers={"tenant": TENANT},
    json={"username": "superadmin", "password": "12345"}
)

if login_response.status_code != 200:
    print(f"Login failed: {login_response.status_code}")
    print(login_response.text)
    exit(1)

TOKEN = login_response.json()["access_token"]
headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {TOKEN}",
    "tenant": TENANT
}

print("SUCCESS - Logged in\n")

# Get Classes
print("Getting classes...")
classes_response = requests.get(f"{BASE_URL}/api/v1/classes/", headers=headers)
classes = classes_response.json()
print(f"Found {len(classes)} classes")

# Get Fee Types
print("Getting fee types...")
fee_types_response = requests.get(f"{BASE_URL}/api/v1/fee/types/", headers=headers)
fee_types = fee_types_response.json()
print(f"Found {len(fee_types)} fee types")

# Get Academic Years
print("Getting academic years...")
years_response = requests.get(f"{BASE_URL}/api/v1/academics/academic-years/", headers=headers)
academic_years = years_response.json()
print(f"Found {len(academic_years)} academic years\n")

if not classes or not fee_types or not academic_years:
    print("ERROR: Missing reference data")
    exit(1)

# Test data
class_id = classes[0]["id"]
fee_type_id = fee_types[0]["id"]
academic_year_id = academic_years[0]["id"]

print(f"Test Data:")
print(f"  Class: {classes[0]['name']} ({class_id})")
print(f"  Fee Type: {fee_types[0]['type_name']} ({fee_type_id})")
print(f"  Academic Year: {academic_years[0]['title']} ({academic_year_id})\n")

# Test 1: Create Single Mapping
print("=" * 60)
print("TEST 1: Create Single Fee Class Mapping")
print("=" * 60)

single_payload = {
    "class_id": class_id,
    "fee_type_id": fee_type_id,
    "total_fee": 5000.00,
    "academic_year_id": academic_year_id,
    "all_by_default": True
}

print(f"Payload: {json.dumps(single_payload, indent=2)}")

single_response = requests.post(
    f"{BASE_URL}/api/v1/fee/class-mappings/",
    headers=headers,
    json=single_payload
)

print(f"\nStatus Code: {single_response.status_code}")
if single_response.status_code == 201:
    result = single_response.json()
    print("SUCCESS - Mapping created!")
    print(f"  Mapping ID: {result['id']}")
    print(f"  Class: {result['class_name']}")
    print(f"  Fee Type: {result['fee_type_name']}")
    print(f"  Total: {result['total_fee']}")
elif single_response.status_code == 400:
    error = single_response.json()
    print(f"Expected Error (duplicate): {error.get('detail')}")
else:
    print(f"FAILED: {single_response.text}")

# Test 2: Create Bulk Mappings
if len(classes) >= 3:
    print("\n" + "=" * 60)
    print("TEST 2: Create Bulk Fee Class Mappings")
    print("=" * 60)

    bulk_class_ids = [classes[i]["id"] for i in range(1, 4)]
    bulk_payload = {
        "class_ids": bulk_class_ids,
        "fee_type_id": fee_type_id,
        "total_fee": 3000.00,
        "academic_year_id": academic_year_id,
        "all_by_default": False
    }

    print(f"Payload: Creating for {len(bulk_class_ids)} classes")

    bulk_response = requests.post(
        f"{BASE_URL}/api/v1/fee/class-mappings/bulk",
        headers=headers,
        json=bulk_payload
    )

    print(f"\nStatus Code: {bulk_response.status_code}")
    if bulk_response.status_code == 201:
        result = bulk_response.json()
        print(f"Bulk Result: {result['success_count']}/{result['total_count']} created")
        print(f"Message: {result['message']}")

        if result['errors']:
            print("\nErrors:")
            for error in result['errors']:
                print(f"  - {error.get('class_name', 'Unknown')}: {error['error']}")
    else:
        print(f"FAILED: {bulk_response.text}")

# Test 3: Get All Mappings
print("\n" + "=" * 60)
print("TEST 3: Get All Fee Class Mappings")
print("=" * 60)

get_response = requests.get(f"{BASE_URL}/api/v1/fee/class-mappings/", headers=headers)
print(f"Status Code: {get_response.status_code}")

if get_response.status_code == 200:
    mappings = get_response.json()
    print(f"Found {len(mappings)} total mappings")

    if mappings:
        print("\nFirst 5 mappings:")
        for mapping in mappings[:5]:
            print(f"  - {mapping['class_name']} -> {mapping['fee_type_name']}: ${mapping['total_fee']}")
else:
    print(f"FAILED: {get_response.text}")

print("\n" + "=" * 60)
print("TESTS COMPLETE")
print("=" * 60)
