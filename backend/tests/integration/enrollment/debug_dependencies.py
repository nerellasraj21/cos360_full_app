import asyncio
import httpx
import json

async def debug_dependencies():
    """Debug what the API actually returns"""
    base_url = "http://localhost:8003"

    headers = {
        "cschema": "test_tenant",
        "Content-Type": "application/json"
    }

    credentials = {
        "username": "admin",
        "password": "testpass123"
    }

    async with httpx.AsyncClient() as client:
        # Authenticate
        auth_response = await client.post(
            f"{base_url}/api/v1/auth/login",
            json=credentials,
            headers=headers
        )

        if auth_response.status_code != 200:
            print("Auth failed")
            return

        token = auth_response.json().get("access_token")
        headers["Authorization"] = f"Bearer {token}"

        # Get academic years
        print("=== ACADEMIC YEARS RESPONSE ===")
        ay_response = await client.get(
            f"{base_url}/api/v1/masters/academic_years/",
            headers=headers
        )

        print(f"Status: {ay_response.status_code}")
        print(f"Response: {ay_response.text}")

        if ay_response.status_code == 200:
            data = ay_response.json()
            print(f"Type: {type(data)}")
            print(f"Length: {len(data) if hasattr(data, '__len__') else 'No length'}")
            print(f"Keys: {data.keys() if isinstance(data, dict) else 'Not a dict'}")

if __name__ == "__main__":
    asyncio.run(debug_dependencies())