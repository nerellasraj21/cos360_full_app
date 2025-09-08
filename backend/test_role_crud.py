#!/usr/bin/env python3
"""
Role CRUD Testing Script
Performs available CRUD operations testing on Role model
Note: This model has CREATE and LIST endpoints only (no individual READ, UPDATE, DELETE)
"""

import requests
import json
import sys
from datetime import datetime
from typing import Dict, Any, Optional, List

class RoleCRUDTester:
    def __init__(self, base_url: str = "http://127.0.0.1:8003"):
        self.base_url = base_url
        self.admin_token = None
        self.headers = {
            "Content-Type": "application/json",
            "cschema": "test_tenant_schema"  # Multi-tenant header
        }
        self.test_results = []
        self.created_records = []
        
    def log_test(self, test_name: str, success: bool, details: str, response_code: int = None):
        """Log test results"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        result = {
            "timestamp": timestamp,
            "test": test_name,
            "success": success,
            "details": details,
            "response_code": response_code
        }
        self.test_results.append(result)
        status = "[PASS]" if success else "[FAIL]"
        print(f"[{timestamp}] {status}: {test_name} - {details}")
        
    def authenticate_admin(self) -> bool:
        """Get admin JWT token"""
        try:
            response = requests.get(f"{self.base_url}/api/v1/auth/test-jwt/admin-token")
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data["access_token"]
                self.headers["Authorization"] = f"Bearer {self.admin_token}"
                self.log_test("Admin Authentication", True, "Successfully obtained admin token", 200)
                return True
            else:
                self.log_test("Admin Authentication", False, f"Failed to get token: {response.text}", response.status_code)
                return False
        except Exception as e:
            self.log_test("Admin Authentication", False, f"Exception: {str(e)}")
            return False
    
    def create_role(self, name: str, description: str = None) -> Optional[Dict[str, Any]]:
        """Create a role"""
        try:
            data = {
                "name": name,
                "description": description
            }
            
            response = requests.post(
                f"{self.base_url}/api/v1/auth/roles/roles/",
                headers=self.headers,
                json=data
            )
            
            if response.status_code == 201:
                created_record = response.json()
                self.created_records.append(created_record)
                self.log_test(
                    f"CREATE Role '{name}'",
                    True,
                    f"Created with ID: {created_record['id']}",
                    201
                )
                return created_record
            else:
                self.log_test(
                    f"CREATE Role '{name}'",
                    False,
                    f"Failed: {response.text}",
                    response.status_code
                )
                return None
        except Exception as e:
            self.log_test(f"CREATE Role '{name}'", False, f"Exception: {str(e)}")
            return None
    
    def list_roles(self) -> Optional[List[Dict[str, Any]]]:
        """List all roles"""
        try:
            response = requests.get(
                f"{self.base_url}/api/v1/auth/roles/roles/",
                headers=self.headers
            )
            
            if response.status_code == 200:
                records = response.json()
                count = len(records) if isinstance(records, list) else 0
                self.log_test(
                    "LIST Roles",
                    True,
                    f"Retrieved {count} records",
                    200
                )
                return records
            else:
                self.log_test(
                    "LIST Roles",
                    False,
                    f"Failed: {response.text}",
                    response.status_code
                )
                return None
        except Exception as e:
            self.log_test("LIST Roles", False, f"Exception: {str(e)}")
            return None
    
    def validate_created_record_in_list(self, created_record: Dict[str, Any], list_records: List[Dict[str, Any]]) -> bool:
        """Validate that created record appears in list results"""
        try:
            created_id = created_record["id"]
            found = any(record["id"] == created_id for record in list_records)
            
            if found:
                self.log_test(
                    "VALIDATE Record in List",
                    True,
                    f"Created record found in list results",
                    None
                )
                return True
            else:
                self.log_test(
                    "VALIDATE Record in List",
                    False,
                    f"Created record NOT found in list results",
                    None
                )
                return False
        except Exception as e:
            self.log_test("VALIDATE Record in List", False, f"Exception: {str(e)}")
            return False
    
    def validate_role_properties(self, created_record: Dict[str, Any], expected_name: str, expected_description: str = None) -> bool:
        """Validate role properties match expected values"""
        try:
            success = True
            details = []
            
            # Validate name
            if created_record.get("name") == expected_name:
                details.append(f"Name correct: {expected_name}")
            else:
                details.append(f"Name mismatch: expected '{expected_name}', got '{created_record.get('name')}'")
                success = False
            
            # Validate description
            if expected_description is None:
                if created_record.get("description") in [None, ""]:
                    details.append("Description correctly empty")
                else:
                    details.append(f"Description should be empty, got '{created_record.get('description')}'")
                    success = False
            else:
                if created_record.get("description") == expected_description:
                    details.append(f"Description correct: {expected_description}")
                else:
                    details.append(f"Description mismatch: expected '{expected_description}', got '{created_record.get('description')}'")
                    success = False
            
            self.log_test(
                "VALIDATE Role Properties",
                success,
                "; ".join(details),
                None
            )
            return success
        except Exception as e:
            self.log_test("VALIDATE Role Properties", False, f"Exception: {str(e)}")
            return False
    
    def run_comprehensive_crud_test(self):
        """Run the available CRUD test sequence for Role"""
        print("=" * 80)
        print("[TOOL] ROLE CRUD TESTING FRAMEWORK")
        print("=" * 80)
        print(f"Base URL: {self.base_url}")
        print(f"Schema: {self.headers['cschema']}")
        print(f"Available Operations: CREATE, LIST")
        print()
        
        # Step 1: Authenticate
        if not self.authenticate_admin():
            print("[ERROR] Authentication failed. Cannot proceed with tests.")
            return False
        
        print("\n[INFO] Starting Available CRUD Test Sequence...")
        print("-" * 50)
        
        # Get initial count for baseline
        initial_records = self.list_roles()
        initial_count = len(initial_records) if initial_records else 0
        
        # Step 1: Create first role
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        record1 = self.create_role(
            name=f"Test Role {timestamp}",
            description=f"Test role created for CRUD testing at {timestamp}"
        )
        
        if not record1:
            print("[ERROR] Failed to create first record. Cannot continue tests.")
            return False
        
        # Validate first record properties
        self.validate_role_properties(
            record1, 
            f"Test Role {timestamp}",
            f"Test role created for CRUD testing at {timestamp}"
        )
        
        # Step 2: Create second role (without description)
        record2 = self.create_role(f"Manager Role {timestamp}")
        
        if not record2:
            print("[WARNING] Failed to create second record, but continuing with available tests.")
        else:
            # Validate second record properties
            self.validate_role_properties(record2, f"Manager Role {timestamp}", None)
        
        # Step 3: List all roles and validate
        all_records = self.list_roles()
        if all_records:
            current_count = len(all_records)
            expected_minimum = initial_count + (2 if record2 else 1)
            
            if current_count >= expected_minimum:
                self.log_test(
                    "LIST Count Validation",
                    True,
                    f"Found {current_count} records (expected >= {expected_minimum})",
                    None
                )
            else:
                self.log_test(
                    "LIST Count Validation",
                    False,
                    f"Found {current_count} records (expected >= {expected_minimum})",
                    None
                )
            
            # Validate created records appear in list
            self.validate_created_record_in_list(record1, all_records)
            if record2:
                self.validate_created_record_in_list(record2, all_records)
        
        # Step 4: Test duplicate role creation (should fail)
        duplicate_role = self.create_role(
            name=f"Test Role {timestamp}",  # Same name as record1
            description="This should fail due to unique constraint"
        )
        
        if duplicate_role is None:
            self.log_test(
                "DUPLICATE Name Validation",
                True,
                "Correctly rejected duplicate role name",
                None
            )
        else:
            self.log_test(
                "DUPLICATE Name Validation",
                False,
                "Should have rejected duplicate role name",
                None
            )
        
        # Final results summary
        self.print_test_summary()
        
        # Note about cleanup limitation
        print("\n[INFO] Note: This model does not have DELETE endpoints.")
        print("[INFO] Created test records will remain in the database.")
        print("[INFO] Test record names include timestamps to avoid conflicts.")
        
        return True
    
    def print_test_summary(self):
        """Print comprehensive test results summary"""
        print("\n" + "=" * 80)
        print("[SUMMARY] TEST RESULTS SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for r in self.test_results if r["success"])
        failed_tests = total_tests - passed_tests
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"Total Tests: {total_tests}")
        print(f"[PASS] Passed: {passed_tests}")
        print(f"[FAIL] Failed: {failed_tests}")
        print(f"[RATE] Success Rate: {success_rate:.1f}%")
        print()
        
        # Print failed tests details
        if failed_tests > 0:
            print("[FAILED] FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test']}: {result['details']}")
        else:
            print("[SUCCESS] ALL TESTS PASSED!")
        
        print("\n" + "=" * 80)


def main():
    """Main test execution"""
    tester = RoleCRUDTester()
    success = tester.run_comprehensive_crud_test()
    
    if success:
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()