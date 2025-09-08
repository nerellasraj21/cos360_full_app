#!/usr/bin/env python3
"""
Debug script to isolate the fee category update issue
"""

import requests
import json
from datetime import datetime

def test_fee_category_update():
    base_url = "http://127.0.0.1:8003"
    
    # Get admin token
    print("Getting admin token...")
    response = requests.get(f"{base_url}/api/v1/auth/test-jwt/admin-token")
    if response.status_code != 200:
        print(f"Failed to get token: {response.text}")
        return
    
    token = response.json()["access_token"]
    headers = {
        "Content-Type": "application/json",
        "cschema": "test_tenant_schema",
        "Authorization": f"Bearer {token}"
    }
    
    # Create academic year first
    print("Creating academic year...")
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    ay_data = {
        "title": f"Debug Academic Year {timestamp}",
        "start_date": "2024-04-01", 
        "end_date": "2025-03-31",
        "is_active": True
    }
    
    response = requests.post(f"{base_url}/api/v1/masters/academic_years/", headers=headers, json=ay_data)
    if response.status_code != 201:
        print(f"Failed to create academic year: {response.text}")
        return
    
    academic_year_id = response.json()["id"]
    print(f"Created academic year: {academic_year_id}")
    
    # Create fee category
    print("Creating fee category...")
    category_data = {
        "category_name": f"Debug Category {timestamp}",
        "category_status": "active",
        "academic_year_id": academic_year_id
    }
    
    response = requests.post(f"{base_url}/api/v1/fee/categories/", headers=headers, json=category_data)
    if response.status_code != 201:
        print(f"Failed to create fee category: {response.text}")
        return
        
    category = response.json()
    category_id = category["id"]
    print(f"Created fee category: {category_id}")
    print(f"Category data: {json.dumps(category, indent=2)}")
    
    # Try to update the fee category
    print("Attempting to update fee category...")
    update_data = {
        "category_name": f"Updated Debug Category {timestamp}",
        "category_status": "inactive"
    }
    
    print(f"Update payload: {json.dumps(update_data, indent=2)}")
    
    response = requests.put(f"{base_url}/api/v1/fee/categories/{category_id}", headers=headers, json=update_data)
    
    print(f"Update response status: {response.status_code}")
    print(f"Update response headers: {dict(response.headers)}")
    print(f"Update response text: {response.text}")
    
    if response.status_code == 200:
        print("UPDATE SUCCESSFUL!")
        updated_category = response.json()
        print(f"Updated category data: {json.dumps(updated_category, indent=2)}")
    else:
        print("UPDATE FAILED!")
        print("Error details:", response.text)
    
    # Cleanup
    print("Cleaning up...")
    requests.delete(f"{base_url}/api/v1/fee/categories/{category_id}", headers=headers)
    requests.delete(f"{base_url}/api/v1/masters/academic_years/{academic_year_id}", headers=headers)

if __name__ == "__main__":
    test_fee_category_update()