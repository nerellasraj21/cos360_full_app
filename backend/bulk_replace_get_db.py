#!/usr/bin/env python3
"""
Bulk replace get_db with get_tenant_db in API endpoint files
"""

import os
import re
from pathlib import Path

# Files that should use get_tenant_db (tenant-specific data)
TENANT_ENDPOINTS = [
    # Fee endpoints
    "app/api/v1/fee/fee_category_endpoints.py",
    "app/api/v1/fee/fee_category_endpoints_protected.py", 
    "app/api/v1/fee/fee_type_endpoints.py",
    "app/api/v1/fee/fee_term_endpoints.py",
    "app/api/v1/fee/fee_class_mapping_endpoints.py",
    "app/api/v1/fee/fee_student_mapping_endpoints.py",
    "app/api/v1/fee/fee_class_map_term_amount_endpoints.py",
    
    # Masters endpoints  
    "app/api/v1/masters/class_endpoints.py",
    "app/api/v1/masters/holiday_endpoints.py",
    "app/api/v1/masters/parent_endpoints.py",
    "app/api/v1/masters/staff_endpoints.py",
    "app/api/v1/masters/subject_routes.py", 
    "app/api/v1/masters/subject_category_endpoints.py",
    "app/api/v1/masters/timetable_routes.py",
    
    # Transport endpoints
    "app/api/v1/masters/transport/routes_endpoints.py",
    "app/api/v1/masters/transport/vehicle_endpoints.py",
    "app/api/v1/masters/transport/trip_endpoints.py",
    "app/api/v1/masters/transport/route_stop_endpoints.py", 
    "app/api/v1/masters/transport/student_trip_endpoints.py",
    
    # Student endpoints
    "app/api/v1/student/admission_endpoints.py",
    "app/api/v1/student/attendance_endpoints.py",
    "app/api/v1/student/certificate_endpoints.py",
    "app/api/v1/student/student_document_endpoints.py",
    "app/api/v1/student/student_transport_endpoints.py",
    
    # Auth endpoints (tenant-specific data)
    "app/api/v1/auth/role_endpoints.py",
    "app/api/v1/auth/menu_endpoints.py", 
    "app/api/v1/auth/permissions_endpoints.py",
    "app/api/v1/auth/resource_permission_endpoints.py",
]

def replace_get_db_in_file(file_path):
    """Replace get_db with get_tenant_db in a single file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Replace import statement
        content = re.sub(
            r'from app\.db\.session import get_db',
            'from app.db.tenant_session import get_tenant_db',
            content
        )
        
        # Replace dependency usage
        content = re.sub(
            r'Depends\(get_db\)',
            'Depends(get_tenant_db)',
            content
        )
        
        # Replace any other get_db references
        content = re.sub(
            r'\bget_db\b',
            'get_tenant_db',
            content
        )
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
            
        return True
        
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return False

def main():
    """Main function to replace get_db in tenant endpoint files"""
    print("=" * 60)
    print("BULK REPLACING get_db with get_tenant_db")
    print("=" * 60)
    
    base_path = Path(".")
    updated_files = []
    failed_files = []
    
    for file_path in TENANT_ENDPOINTS:
        full_path = base_path / file_path
        
        if full_path.exists():
            print(f"Processing: {file_path}")
            if replace_get_db_in_file(full_path):
                updated_files.append(file_path)
                print(f"  + Updated successfully")
            else:
                failed_files.append(file_path)
                print(f"  - Failed to update")
        else:
            print(f"File not found: {file_path}")
            failed_files.append(file_path)
    
    print(f"\n--- SUMMARY ---")
    print(f"Files updated: {len(updated_files)}")
    print(f"Files failed: {len(failed_files)}")
    
    if failed_files:
        print(f"\nFailed files:")
        for f in failed_files:
            print(f"  - {f}")

if __name__ == "__main__":
    main()