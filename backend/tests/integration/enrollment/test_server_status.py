import asyncio
import httpx
import json

async def check_server_status():
    """Check if server is running and what endpoints are available"""
    base_url = "http://localhost:8003"

    try:
        async with httpx.AsyncClient() as client:
            # Check basic server health
            health_response = await client.get(f"{base_url}/")
            print(f"[OK] Server health check: {health_response.status_code}")

            # Check docs endpoint
            docs_response = await client.get(f"{base_url}/docs")
            print(f"[OK] API docs available: {docs_response.status_code == 200}")

            # Check openapi.json for endpoint discovery
            openapi_response = await client.get(f"{base_url}/openapi.json")
            if openapi_response.status_code == 200:
                openapi_data = openapi_response.json()
                paths = list(openapi_data.get("paths", {}).keys())

                print(f"\nAvailable API endpoints ({len(paths)}):")

                auth_endpoints = [path for path in paths if "auth" in path.lower()]
                student_endpoints = [path for path in paths if "student" in path.lower()]
                staff_endpoints = [path for path in paths if "staff" in path.lower()]

                if auth_endpoints:
                    print("Auth endpoints:")
                    for endpoint in auth_endpoints:
                        print(f"  - {endpoint}")

                if student_endpoints:
                    print("Student endpoints:")
                    for endpoint in student_endpoints:
                        print(f"  - {endpoint}")

                if staff_endpoints:
                    print("Staff endpoints:")
                    for endpoint in staff_endpoints:
                        print(f"  - {endpoint}")

                return paths
            else:
                print("[ERROR] Could not retrieve API documentation")
                return []

    except Exception as e:
        print(f"[ERROR] Server connection failed: {str(e)}")
        return []

if __name__ == "__main__":
    paths = asyncio.run(check_server_status())