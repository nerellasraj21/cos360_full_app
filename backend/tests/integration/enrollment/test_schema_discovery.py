import asyncio
import httpx
import json

async def discover_schemas():
    """Discover the actual API schemas for enrollment endpoints"""
    base_url = "http://localhost:8003"

    # Authenticate first
    headers = {
        "cschema": "test_tenant",
        "Content-Type": "application/json"
    }

    credentials = {
        "username": "admin",
        "password": "testpass123"
    }

    async with httpx.AsyncClient() as client:
        # Get auth token
        auth_response = await client.post(
            f"{base_url}/api/v1/auth/login",
            json=credentials,
            headers=headers
        )

        if auth_response.status_code != 200:
            print("Authentication failed")
            return

        token = auth_response.json().get("access_token")
        headers["Authorization"] = f"Bearer {token}"

        # Get OpenAPI spec
        openapi_response = await client.get(f"{base_url}/openapi.json")
        if openapi_response.status_code == 200:
            openapi_data = openapi_response.json()

            # Look for student admission schema
            print("=== STUDENT ADMISSION SCHEMA ===")
            student_paths = [path for path in openapi_data.get("paths", {}) if "students/admission" in path]
            for path in student_paths:
                path_data = openapi_data["paths"][path]
                if "post" in path_data:
                    post_data = path_data["post"]
                    if "requestBody" in post_data:
                        schema_ref = post_data["requestBody"]["content"]["application/json"]["schema"]["$ref"]
                        schema_name = schema_ref.split("/")[-1]
                        if schema_name in openapi_data.get("components", {}).get("schemas", {}):
                            schema = openapi_data["components"]["schemas"][schema_name]
                            print(f"Schema: {schema_name}")
                            print("Required fields:")
                            for field in schema.get("required", []):
                                field_type = schema["properties"].get(field, {}).get("type", "unknown")
                                print(f"  - {field}: {field_type}")

            # Look for staff enrollment schema
            print("\n=== STAFF ENROLLMENT SCHEMA ===")
            staff_paths = [path for path in openapi_data.get("paths", {}) if "staff/enrollment" in path]
            for path in staff_paths:
                path_data = openapi_data["paths"][path]
                if "post" in path_data:
                    post_data = path_data["post"]
                    if "requestBody" in post_data:
                        schema_ref = post_data["requestBody"]["content"]["application/json"]["schema"]["$ref"]
                        schema_name = schema_ref.split("/")[-1]
                        if schema_name in openapi_data.get("components", {}).get("schemas", {}):
                            schema = openapi_data["components"]["schemas"][schema_name]
                            print(f"Schema: {schema_name}")
                            print("Required fields:")
                            for field in schema.get("required", []):
                                field_type = schema["properties"].get(field, {}).get("type", "unknown")
                                print(f"  - {field}: {field_type}")

        # Test getting dependencies that exist
        print("\n=== TESTING DEPENDENCIES ===")

        # Try different endpoint patterns for academic years
        ay_endpoints = [
            "/api/v1/masters/academic-years/",
            "/api/v1/masters/academic_years/",
            "/api/v1/academic-years/",
            "/api/v1/academic_years/"
        ]

        for endpoint in ay_endpoints:
            try:
                response = await client.get(f"{base_url}{endpoint}", headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    print(f"Academic Years ({endpoint}): {len(data)} found")
                    if data:
                        print(f"  Sample: {data[0]}")
                    break
                elif response.status_code != 404:
                    print(f"Academic Years ({endpoint}): {response.status_code}")
            except:
                pass

        # Try different endpoint patterns for classes
        class_endpoints = [
            "/api/v1/masters/classes/",
            "/api/v1/classes/",
            "/api/v1/masters/class/",
            "/api/v1/class/"
        ]

        for endpoint in class_endpoints:
            try:
                response = await client.get(f"{base_url}{endpoint}", headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    print(f"Classes ({endpoint}): {len(data)} found")
                    if data:
                        print(f"  Sample: {data[0]}")
                    break
                elif response.status_code != 404:
                    print(f"Classes ({endpoint}): {response.status_code}")
            except:
                pass

if __name__ == "__main__":
    asyncio.run(discover_schemas())