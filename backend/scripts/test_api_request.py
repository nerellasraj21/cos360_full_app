"""
Simple HTTP request to test the designation endpoint
"""

import requests
import json

# API endpoint
url = "http://localhost:8000/api/v1/staff/designations/"

# Query parameters
params = {"skip": 0, "limit": 10}

# Headers - you'll need to add your auth token
headers = {
    "Content-Type": "application/json",
    # "Authorization": "Bearer YOUR_TOKEN_HERE",  # Uncomment and add your token
    # "x-client-name": "YOUR_CLIENT_NAME"  # Uncomment and add your client name
}

print("=" * 80)
print("Making GET request to:", url)
print("Parameters:", params)
print("=" * 80)
print()

try:
    response = requests.get(url, params=params, headers=headers)

    print(f"Status Code: {response.status_code}")
    print()

    if response.status_code == 200:
        data = response.json()
        print("Response Data:")
        print(json.dumps(data, indent=2))
        print()
        print("=" * 80)
        print(f"Total items: {data.get('total_count', 0)}")
        print(f"Items in this page: {len(data.get('items', []))}")
        print(f"Has next page: {data.get('has_next', False)}")
        print("=" * 80)

        # Show sample item structure
        if data.get("items"):
            print()
            print("Sample Item Structure:")
            print(json.dumps(data["items"][0], indent=2))
    else:
        print("Error Response:")
        print(json.dumps(response.json(), indent=2))

except requests.exceptions.ConnectionError:
    print("Error: Could not connect to the API server.")
    print("Make sure the server is running on http://localhost:8000")
except Exception as e:
    print(f"Error: {e}")
