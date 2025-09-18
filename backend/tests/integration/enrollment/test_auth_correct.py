import asyncio
import httpx
import json

async def test_correct_authentication():
    """Test authentication with correct tenant name from context guide"""
    base_url = "http://localhost:8003"

    # From context_guide.json - correct tenant header
    headers = {
        "cschema": "test_tenant",  # Not test_tenant_schema!
        "Content-Type": "application/json"
    }

    # From context_guide.json - test tenant credentials
    credentials = {
        "username": "admin",
        "password": "testpass123"
    }

    print("Testing with correct tenant configuration...")
    print(f"Headers: {headers}")
    print(f"Credentials: {credentials}")

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{base_url}/api/v1/auth/login",
                json=credentials,
                headers=headers,
                timeout=10.0
            )

            print(f"\nAuth Status: {response.status_code}")

            if response.status_code == 200:
                result = response.json()
                print("[SUCCESS] Authentication successful!")
                print(f"Access Token: {result.get('access_token', 'No token')[:30]}...")
                print(f"User: {result.get('user', {})}")
                print(f"Permissions: {len(result.get('permissions', {}))} resources")
                return result.get('access_token'), headers
            else:
                print(f"[FAILED] Response: {response.text}")
                return None, None

        except Exception as e:
            print(f"[ERROR] Exception: {str(e)}")
            return None, None

if __name__ == "__main__":
    token, headers = asyncio.run(test_correct_authentication())