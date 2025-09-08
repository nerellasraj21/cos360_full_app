#!/usr/bin/env python3
"""
Menu CRUD Testing Script
Performs available CRUD operations testing on Menu model
Note: This model has CREATE and LIST endpoints only (no individual READ, UPDATE, DELETE)
WARNING: Schema mismatch detected - database uses UUID but schema expects int
"""

import requests
import json
import sys
from datetime import datetime
from typing import Dict, Any, Optional, List

class MenuCRUDTester:
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
    
    def create_menu(self, name: str, url: str = None, level: str = "L0", parent_id: str = None) -> Optional[Dict[str, Any]]:
        """Create a menu"""
        try:
            data = {
                "name": name,
                "url": url,
                "level": level,
                "parent_id": parent_id
            }
            
            response = requests.post(
                f"{self.base_url}/api/v1/auth/menus/",
                headers=self.headers,
                json=data
            )
            
            if response.status_code == 201:
                created_record = response.json()
                self.created_records.append(created_record)
                self.log_test(
                    f"CREATE Menu '{name}'",
                    True,
                    f"Created with ID: {created_record.get('id', 'N/A')}",
                    201
                )
                return created_record
            else:
                self.log_test(
                    f"CREATE Menu '{name}'",
                    False,
                    f"Failed: {response.text}",
                    response.status_code
                )
                return None
        except Exception as e:
            self.log_test(f"CREATE Menu '{name}'", False, f"Exception: {str(e)}")
            return None
    
    def list_menus(self) -> Optional[List[Dict[str, Any]]]:
        """List all menus"""
        try:
            response = requests.get(
                f"{self.base_url}/api/v1/auth/menus/",
                headers=self.headers
            )
            
            if response.status_code == 200:
                records = response.json()
                count = len(records) if isinstance(records, list) else 0
                self.log_test(
                    "LIST Menus",
                    True,
                    f"Retrieved {count} records",
                    200
                )
                return records
            else:
                self.log_test(
                    "LIST Menus",
                    False,
                    f"Failed: {response.text}",
                    response.status_code
                )
                return None
        except Exception as e:
            self.log_test("LIST Menus", False, f"Exception: {str(e)}")
            return None
    
    def validate_created_record_in_list(self, created_record: Dict[str, Any], list_records: List[Dict[str, Any]]) -> bool:
        """Validate that created record appears in list results"""
        try:
            created_id = created_record.get("id")
            if not created_id:
                self.log_test(
                    "VALIDATE Record in List",
                    False,
                    "Created record has no ID field",
                    None
                )
                return False
            
            found = any(record.get("id") == created_id for record in list_records)
            
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
    
    def validate_menu_properties(self, created_record: Dict[str, Any], expected_name: str, expected_url: str = None, expected_level: str = "L0") -> bool:
        """Validate menu properties match expected values"""
        try:
            success = True
            details = []
            
            # Validate name
            if created_record.get("name") == expected_name:
                details.append(f"Name correct: {expected_name}")
            else:
                details.append(f"Name mismatch: expected '{expected_name}', got '{created_record.get('name')}'")
                success = False
            
            # Validate URL
            if expected_url is None:
                if created_record.get("url") in [None, ""]:
                    details.append("URL correctly empty")
                else:
                    details.append(f"URL should be empty, got '{created_record.get('url')}'")
                    success = False
            else:
                if created_record.get("url") == expected_url:
                    details.append(f"URL correct: {expected_url}")
                else:
                    details.append(f"URL mismatch: expected '{expected_url}', got '{created_record.get('url')}'")
                    success = False
            
            # Validate level
            if created_record.get("level") == expected_level:
                details.append(f"Level correct: {expected_level}")
            else:
                details.append(f"Level mismatch: expected '{expected_level}', got '{created_record.get('level')}'")
                success = False
            
            self.log_test(
                "VALIDATE Menu Properties",
                success,
                "; ".join(details),
                None
            )
            return success
        except Exception as e:
            self.log_test("VALIDATE Menu Properties", False, f"Exception: {str(e)}")
            return False
    
    def run_comprehensive_crud_test(self):
        """Run the available CRUD test sequence for Menu"""
        print("=" * 80)
        print("[TOOL] MENU CRUD TESTING FRAMEWORK")
        print("=" * 80)
        print(f"Base URL: {self.base_url}")
        print(f"Schema: {self.headers['cschema']}")
        print(f"Available Operations: CREATE, LIST")
        print(f"WARNING: Potential schema mismatch (DB: UUID, Schema: int)")
        print()
        
        # Step 1: Authenticate
        if not self.authenticate_admin():
            print("[ERROR] Authentication failed. Cannot proceed with tests.")
            return False
        
        print("\n[INFO] Starting Available CRUD Test Sequence...")
        print("-" * 50)
        
        # Get initial count for baseline
        initial_records = self.list_menus()
        initial_count = len(initial_records) if initial_records else 0
        
        # Step 1: Create first menu (root level)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        record1 = self.create_menu(
            name=f"Dashboard {timestamp}",
            url=f"/dashboard/{timestamp}",
            level="L0"
        )
        
        if not record1:
            print("[ERROR] Failed to create first record. Cannot continue tests.")
            return False
        
        # Validate first record properties
        self.validate_menu_properties(
            record1, 
            f"Dashboard {timestamp}",
            f"/dashboard/{timestamp}",
            "L0"
        )
        
        # Step 2: Create second menu (L1 level, no URL)
        record2 = self.create_menu(
            name=f"Settings {timestamp}",
            level="L1"
        )
        
        if not record2:
            print("[WARNING] Failed to create second record, but continuing with available tests.")
        else:
            # Validate second record properties
            self.validate_menu_properties(record2, f"Settings {timestamp}", None, "L1")
        
        # Step 3: Create third menu (L2 level with URL)
        record3 = self.create_menu(
            name=f"User Management {timestamp}",
            url=f"/users/{timestamp}",
            level="L2"
        )
        
        if record3:
            self.validate_menu_properties(record3, f"User Management {timestamp}", f"/users/{timestamp}", "L2")
        
        # Step 4: List all menus and validate
        all_records = self.list_menus()
        if all_records:
            current_count = len(all_records)
            created_count = len([r for r in [record1, record2, record3] if r])
            expected_minimum = initial_count + created_count
            
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
            for i, record in enumerate([record1, record2, record3], 1):
                if record:
                    self.validate_created_record_in_list(record, all_records)
        
        # Step 5: Test duplicate menu creation (should fail)
        duplicate_menu = self.create_menu(
            name=f"Dashboard {timestamp}",  # Same name as record1
            url="/duplicate",
            level="L0"
        )
        
        if duplicate_menu is None:
            self.log_test(
                "DUPLICATE Name Validation",
                True,
                "Correctly rejected duplicate menu name",
                None
            )
        else:
            self.log_test(
                "DUPLICATE Name Validation",
                False,
                "Should have rejected duplicate menu name",
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
    tester = MenuCRUDTester()
    success = tester.run_comprehensive_crud_test()
    
    if success:
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()