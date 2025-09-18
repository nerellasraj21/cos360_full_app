import asyncio
import httpx
import json

async def debug_authentication():
    """Debug authentication issues"""
    base_url = "http://localhost:8003"

    # Try different header combinations
    test_cases = [
        {
            "name": "Standard tenant header",
            "headers": {
                "cschema": "test_tenant_schema",
                "Content-Type": "application/json"
            }
        },
        {
            "name": "Alternative tenant header",
            "headers": {
                "X-Client-Name": "test_tenant_schema",
                "Content-Type": "application/json"
            }
        },
        {
            "name": "No tenant header",
            "headers": {
                "Content-Type": "application/json"
            }
        }
    ]

    # Try different credential combinations
    credentials = [
        {"username": "admin", "password": "testpass123"},
        {"email": "admin", "password": "testpass123"},
        {"username": "admin@test.com", "password": "testpass123"}
    ]

    # Try different endpoints
    endpoints = [
        "/api/v1/auth/login",
        "/api/v1/auth/token",
        "/auth/login",
        "/login"
    ]

    async with httpx.AsyncClient() as client:
        print("Testing authentication combinations...")

        for endpoint in endpoints:
            print(f"\n--- Testing endpoint: {endpoint} ---")

            for test_case in test_cases:
                print(f"\nUsing {test_case['name']}:")

                for creds in credentials:
                    try:
                        response = await client.post(
                            f"{base_url}{endpoint}",
                            json=creds,
                            headers=test_case["headers"],
                            timeout=10.0
                        )

                        print(f"  {creds}: Status {response.status_code}")

                        if response.status_code == 200:
                            result = response.json()
                            print(f"    SUCCESS! Token: {result.get('access_token', 'No token')[:20]}...")
                            return endpoint, test_case["headers"], creds
                        elif response.status_code != 404:
                            print(f"    Response: {response.text[:100]}")

                    except Exception as e:
                        print(f"  {creds}: Error - {str(e)}")

        print("\n--- Testing form data instead of JSON ---")

        # Try form data for login
        for endpoint in ["/api/v1/auth/login", "/api/v1/auth/token"]:
            try:
                form_data = {
                    "username": "admin",
                    "password": "testpass123"
                }

                headers = {
                    "cschema": "test_tenant_schema",
                    "Content-Type": "application/x-www-form-urlencoded"
                }

                response = await client.post(
                    f"{base_url}{endpoint}",
                    data=form_data,
                    headers=headers,
                    timeout=10.0
                )

                print(f"{endpoint} (form): Status {response.status_code}")
                if response.status_code == 200:
                    result = response.json()
                    print(f"  SUCCESS! Token: {result.get('access_token', 'No token')[:20]}...")
                    return endpoint, headers, form_data
                elif response.status_code != 404:
                    print(f"  Response: {response.text[:100]}")

            except Exception as e:
                print(f"{endpoint} (form): Error - {str(e)}")

if __name__ == "__main__":
    result = asyncio.run(debug_authentication())