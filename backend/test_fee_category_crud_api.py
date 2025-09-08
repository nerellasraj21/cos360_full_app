#!/usr/bin/env python3
"""
Fee Category CRUD Testing Script
Performs comprehensive CRUD operations testing on Fee Category model
"""

import requests
import json
import sys
from datetime import datetime
from typing import Dict, Any, Optional

class FeeCategoryCRUDTester:
    def __init__(self, base_url: str = "http://127.0.0.1:8003"):
        self.base_url = base_url
        self.admin_token = None
        self.headers = {
            "Content-Type": "application/json",
            "cschema": "test_tenant_schema"  # Multi-tenant header
        }
        self.test_results = []
        self.created_records = []
        self.academic_year_id = None  # Will be set up during testing
        
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
    
    def setup_academic_year(self) -> bool:
        """Create an academic year for fee category testing"""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            data = {
                "title": f"Test Academic Year {timestamp}",
                "start_date": "2024-04-01",
                "end_date": "2025-03-31",
                "is_active": True
            }
            
            response = requests.post(
                f"{self.base_url}/api/v1/masters/academic_years/",
                headers=self.headers,
                json=data
            )
            
            if response.status_code == 201:
                academic_year = response.json()
                self.academic_year_id = academic_year["id"]
                self.log_test("SETUP Academic Year", True, f"Created academic year: {academic_year['id']}", 201)
                return True
            else:
                self.log_test("SETUP Academic Year", False, f"Failed: {response.text}", response.status_code)
                return False
        except Exception as e:
            self.log_test("SETUP Academic Year", False, f"Exception: {str(e)}")
            return False
    
    def create_fee_category(self, category_name: str, category_status: str = "active") -> Optional[Dict[str, Any]]:
        """Create a fee category"""
        try:
            data = {
                "category_name": category_name,
                "category_status": category_status,
                "academic_year_id": self.academic_year_id
            }
            
            response = requests.post(
                f"{self.base_url}/api/v1/fee/categories/",
                headers=self.headers,
                json=data
            )
            
            if response.status_code == 201:
                created_record = response.json()
                self.created_records.append(created_record)
                self.log_test(
                    f"CREATE Fee Category '{category_name}'",
                    True,
                    f"Created with ID: {created_record['id'][:8]}...",
                    201
                )
                return created_record
            else:
                self.log_test(
                    f"CREATE Fee Category '{category_name}'",
                    False,
                    f"Failed: {response.text}",
                    response.status_code
                )
                return None
        except Exception as e:
            self.log_test(f"CREATE Fee Category '{category_name}'", False, f"Exception: {str(e)}")
            return None
    
    def read_fee_category(self, category_id: str) -> Optional[Dict[str, Any]]:
        """Read a fee category by ID"""
        try:
            response = requests.get(
                f"{self.base_url}/api/v1/fee/categories/{category_id}",
                headers=self.headers
            )
            
            if response.status_code == 200:
                record = response.json()
                self.log_test(
                    f"READ Fee Category ID: {category_id[:8]}...",
                    True,
                    f"Retrieved: {record['category_name']}",
                    200
                )
                return record
            else:
                self.log_test(
                    f"READ Fee Category ID: {category_id[:8]}...",
                    False,
                    f"Failed: {response.text}",
                    response.status_code
                )
                return None
        except Exception as e:
            self.log_test(f"READ Fee Category ID: {category_id[:8]}...", False, f"Exception: {str(e)}")
            return None
    
    def update_fee_category(self, category_id: str, updates: Dict[str, Any]) -> bool:
        """Update a fee category"""
        try:
            response = requests.put(
                f"{self.base_url}/api/v1/fee/categories/{category_id}",
                headers=self.headers,
                json=updates
            )
            
            if response.status_code == 200:
                updated_record = response.json()
                self.log_test(
                    f"UPDATE Fee Category ID: {category_id[:8]}...",
                    True,
                    f"Updated name: {updated_record.get('category_name', 'N/A')}",
                    200
                )
                return True
            else:
                self.log_test(
                    f"UPDATE Fee Category ID: {category_id[:8]}...",
                    False,
                    f"Failed: {response.text}",
                    response.status_code
                )
                return False
        except Exception as e:
            self.log_test(f"UPDATE Fee Category ID: {category_id[:8]}...", False, f"Exception: {str(e)}")
            return False
    
    def list_fee_categories(self) -> Optional[list]:
        """List all fee categories"""
        try:
            response = requests.get(
                f"{self.base_url}/api/v1/fee/categories/",
                headers=self.headers
            )
            
            if response.status_code == 200:
                records = response.json()
                count = len(records) if isinstance(records, list) else 0
                self.log_test(
                    "LIST Fee Categories",
                    True,
                    f"Retrieved {count} records",
                    200
                )
                return records
            else:
                self.log_test(
                    "LIST Fee Categories",
                    False,
                    f"Failed: {response.text}",
                    response.status_code
                )
                return None
        except Exception as e:
            self.log_test("LIST Fee Categories", False, f"Exception: {str(e)}")
            return None
    
    def get_fee_categories_dropdown(self) -> Optional[list]:
        """Get fee categories dropdown"""
        try:
            response = requests.get(
                f"{self.base_url}/api/v1/fee/categories/dropdown",
                headers=self.headers
            )
            
            if response.status_code == 200:
                records = response.json()
                count = len(records) if isinstance(records, list) else 0
                self.log_test(
                    "DROPDOWN Fee Categories",
                    True,
                    f"Retrieved {count} dropdown records",
                    200
                )
                return records
            else:
                self.log_test(
                    "DROPDOWN Fee Categories",
                    False,
                    f"Failed: {response.text}",
                    response.status_code
                )
                return None
        except Exception as e:
            self.log_test("DROPDOWN Fee Categories", False, f"Exception: {str(e)}")
            return None
    
    def delete_fee_category(self, category_id: str) -> bool:
        """Delete a fee category"""
        try:
            response = requests.delete(
                f"{self.base_url}/api/v1/fee/categories/{category_id}",
                headers=self.headers
            )
            
            if response.status_code == 200:
                self.log_test(
                    f"DELETE Fee Category ID: {category_id[:8]}...",
                    True,
                    "Successfully deleted",
                    200
                )
                return True
            else:
                self.log_test(
                    f"DELETE Fee Category ID: {category_id[:8]}...",
                    False,
                    f"Failed: {response.text}",
                    response.status_code
                )
                return False
        except Exception as e:
            self.log_test(f"DELETE Fee Category ID: {category_id[:8]}...", False, f"Exception: {str(e)}")
            return False
    
    def test_duplicate_category_prevention(self) -> bool:
        """Test that duplicate category names are prevented within the same academic year"""
        try:
            timestamp = datetime.now().strftime("%H%M%S")
            duplicate_name = f"Duplicate Test Category {timestamp}"
            
            # Create first category
            category1 = self.create_fee_category(duplicate_name)
            if not category1:
                return False
            
            # Try to create duplicate - should fail
            data = {
                "category_name": duplicate_name,
                "category_status": "active",
                "academic_year_id": self.academic_year_id
            }
            
            response = requests.post(
                f"{self.base_url}/api/v1/fee/categories/",
                headers=self.headers,
                json=data
            )
            
            if response.status_code == 400:
                self.log_test(
                    "VALIDATION Duplicate Prevention",
                    True,
                    "Correctly prevented duplicate category name",
                    400
                )
                # Clean up the created category
                self.delete_fee_category(category1["id"])
                return True
            else:
                self.log_test(
                    "VALIDATION Duplicate Prevention",
                    False,
                    f"Should have failed but got: {response.status_code}",
                    response.status_code
                )
                # Clean up the created category
                self.delete_fee_category(category1["id"])
                return False
                
        except Exception as e:
            self.log_test("VALIDATION Duplicate Prevention", False, f"Exception: {str(e)}")
            return False
    
    def run_comprehensive_crud_test(self):
        """Run the complete CRUD test sequence"""
        print("=" * 80)
        print("[TOOL] FEE CATEGORY CRUD TESTING FRAMEWORK")
        print("=" * 80)
        print(f"Base URL: {self.base_url}")
        print(f"Schema: {self.headers['cschema']}")
        print()
        
        # Step 1: Authenticate
        if not self.authenticate_admin():
            print("[ERROR] Authentication failed. Cannot proceed with tests.")
            return False
        
        # Step 2: Setup academic year for testing
        if not self.setup_academic_year():
            print("[ERROR] Failed to setup academic year. Cannot proceed with tests.")
            return False
        
        print("\n[INFO] Starting CRUD Test Sequence...")
        print("-" * 50)
        
        # Step 3: Create first fee category
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        record1 = self.create_fee_category(
            category_name=f"Academic Fee {timestamp}",
            category_status="active"
        )
        
        if not record1:
            print("[ERROR] Failed to create first record. Cannot continue tests.")
            return False
        
        # Step 4: Read the created record
        read_record = self.read_fee_category(record1["id"])
        if not read_record:
            print("[ERROR] Failed to read created record.")
        
        # Step 5: Update the created record
        update_success = self.update_fee_category(
            record1["id"],
            {"category_name": f"Updated Academic Fee {timestamp}", "category_status": "inactive"}
        )
        
        # Step 6: Create second fee category
        record2 = self.create_fee_category(
            category_name=f"Transport Fee {timestamp}",
            category_status="active"
        )
        
        # Step 7: Create third fee category  
        record3 = self.create_fee_category(
            category_name=f"Sports Fee {timestamp}",
            category_status="active"
        )
        
        # Step 8: List all fee categories
        all_records = self.list_fee_categories()
        
        # Step 9: Test dropdown functionality
        dropdown_records = self.get_fee_categories_dropdown()
        
        # Step 10: Test duplicate prevention
        self.test_duplicate_category_prevention()
        
        # Step 11: Delete one record and validate
        if record1:
            delete_success = self.delete_fee_category(record1["id"])
            
            # Verify deletion by trying to read deleted record
            if delete_success:
                verify_delete = self.read_fee_category(record1["id"])
                if not verify_delete:
                    self.log_test("DELETE Verification", True, "Record successfully removed from database")
                else:
                    self.log_test("DELETE Verification", False, "Record still exists after deletion")
        
        # Final results summary
        self.print_test_summary()
        
        # Cleanup remaining records
        print("\n[CLEANUP] Cleaning up remaining test records...")
        if record2:
            self.delete_fee_category(record2["id"])
        if record3:
            self.delete_fee_category(record3["id"])
            
        # Cleanup academic year
        if self.academic_year_id:
            try:
                requests.delete(
                    f"{self.base_url}/api/v1/masters/academic_years/{self.academic_year_id}",
                    headers=self.headers
                )
            except:
                pass  # Best effort cleanup
        
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
    tester = FeeCategoryCRUDTester()
    success = tester.run_comprehensive_crud_test()
    
    if success:
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()