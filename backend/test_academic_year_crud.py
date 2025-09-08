#!/usr/bin/env python3
"""
Academic Year CRUD Testing Script
Performs comprehensive CRUD operations testing on Academic Year model
"""

import requests
import json
import sys
from datetime import datetime
from typing import Dict, Any, Optional

class AcademicYearCRUDTester:
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
    
    def create_academic_year(self, title: str, start_date: str, end_date: str, is_active: bool = True) -> Optional[Dict[str, Any]]:
        """Create an academic year"""
        try:
            data = {
                "title": title,
                "start_date": start_date,
                "end_date": end_date,
                "is_active": is_active
            }
            
            response = requests.post(
                f"{self.base_url}/api/v1/masters/academic_years/",
                headers=self.headers,
                json=data
            )
            
            if response.status_code == 201:
                created_record = response.json()
                self.created_records.append(created_record)
                self.log_test(
                    f"CREATE Academic Year '{title}'",
                    True,
                    f"Created with ID: {created_record['id']}",
                    201
                )
                return created_record
            else:
                self.log_test(
                    f"CREATE Academic Year '{title}'",
                    False,
                    f"Failed: {response.text}",
                    response.status_code
                )
                return None
        except Exception as e:
            self.log_test(f"CREATE Academic Year '{title}'", False, f"Exception: {str(e)}")
            return None
    
    def read_academic_year(self, academic_year_id: str) -> Optional[Dict[str, Any]]:
        """Read an academic year by ID"""
        try:
            response = requests.get(
                f"{self.base_url}/api/v1/masters/academic_years/{academic_year_id}",
                headers=self.headers
            )
            
            if response.status_code == 200:
                record = response.json()
                self.log_test(
                    f"READ Academic Year ID: {academic_year_id[:8]}...",
                    True,
                    f"Retrieved: {record['title']}",
                    200
                )
                return record
            else:
                self.log_test(
                    f"READ Academic Year ID: {academic_year_id[:8]}...",
                    False,
                    f"Failed: {response.text}",
                    response.status_code
                )
                return None
        except Exception as e:
            self.log_test(f"READ Academic Year ID: {academic_year_id[:8]}...", False, f"Exception: {str(e)}")
            return None
    
    def update_academic_year(self, academic_year_id: str, updates: Dict[str, Any]) -> bool:
        """Update an academic year"""
        try:
            response = requests.put(
                f"{self.base_url}/api/v1/masters/academic_years/{academic_year_id}",
                headers=self.headers,
                json=updates
            )
            
            if response.status_code == 200:
                updated_record = response.json()
                self.log_test(
                    f"UPDATE Academic Year ID: {academic_year_id[:8]}...",
                    True,
                    f"Updated title: {updated_record.get('title', 'N/A')}",
                    200
                )
                return True
            else:
                self.log_test(
                    f"UPDATE Academic Year ID: {academic_year_id[:8]}...",
                    False,
                    f"Failed: {response.text}",
                    response.status_code
                )
                return False
        except Exception as e:
            self.log_test(f"UPDATE Academic Year ID: {academic_year_id[:8]}...", False, f"Exception: {str(e)}")
            return False
    
    def list_academic_years(self) -> Optional[list]:
        """List all academic years"""
        try:
            response = requests.get(
                f"{self.base_url}/api/v1/masters/academic_years/",
                headers=self.headers
            )
            
            if response.status_code == 200:
                records = response.json()
                count = len(records) if isinstance(records, list) else 0
                self.log_test(
                    "LIST Academic Years",
                    True,
                    f"Retrieved {count} records",
                    200
                )
                return records
            else:
                self.log_test(
                    "LIST Academic Years",
                    False,
                    f"Failed: {response.text}",
                    response.status_code
                )
                return None
        except Exception as e:
            self.log_test("LIST Academic Years", False, f"Exception: {str(e)}")
            return None
    
    def delete_academic_year(self, academic_year_id: str) -> bool:
        """Delete an academic year"""
        try:
            response = requests.delete(
                f"{self.base_url}/api/v1/masters/academic_years/{academic_year_id}",
                headers=self.headers
            )
            
            if response.status_code == 200:
                self.log_test(
                    f"DELETE Academic Year ID: {academic_year_id[:8]}...",
                    True,
                    "Successfully deleted",
                    200
                )
                return True
            else:
                self.log_test(
                    f"DELETE Academic Year ID: {academic_year_id[:8]}...",
                    False,
                    f"Failed: {response.text}",
                    response.status_code
                )
                return False
        except Exception as e:
            self.log_test(f"DELETE Academic Year ID: {academic_year_id[:8]}...", False, f"Exception: {str(e)}")
            return False
    
    def run_comprehensive_crud_test(self):
        """Run the complete CRUD test sequence"""
        print("=" * 80)
        print("[TOOL] ACADEMIC YEAR CRUD TESTING FRAMEWORK")
        print("=" * 80)
        print(f"Base URL: {self.base_url}")
        print(f"Schema: {self.headers['cschema']}")
        print()
        
        # Step 1: Authenticate
        if not self.authenticate_admin():
            print("[ERROR] Authentication failed. Cannot proceed with tests.")
            return False
        
        print("\n[INFO] Starting CRUD Test Sequence...")
        print("-" * 50)
        
        # Step 1: Create first academic year
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        record1 = self.create_academic_year(
            title=f"Test Academic Year 2024-25 {timestamp}",
            start_date="2024-04-01",
            end_date="2025-03-31",
            is_active=True
        )
        
        if not record1:
            print("[ERROR] Failed to create first record. Cannot continue tests.")
            return False
        
        # Step 2: Read the created record
        read_record = self.read_academic_year(record1["id"])
        if not read_record:
            print("[ERROR] Failed to read created record.")
        
        # Step 3: Update the created record
        update_success = self.update_academic_year(
            record1["id"],
            {"title": f"Updated Test Academic Year 2024-25 {timestamp}", "is_active": False}
        )
        
        # Step 4: Create second academic year
        record2 = self.create_academic_year(
            title=f"Test Academic Year 2025-26 {timestamp}",
            start_date="2025-04-01",
            end_date="2026-03-31",
            is_active=True
        )
        
        # Step 5: List all academic years
        all_records = self.list_academic_years()
        
        # Step 6: Delete one record and validate
        if record1:
            delete_success = self.delete_academic_year(record1["id"])
            
            # Verify soft deletion by checking is_active status
            if delete_success:
                verify_delete = self.read_academic_year(record1["id"])
                if verify_delete and not verify_delete.get("is_active", True):
                    self.log_test("DELETE Verification", True, "Record soft-deleted (is_active=False)")
                elif verify_delete and verify_delete.get("is_active", True):
                    self.log_test("DELETE Verification", False, "Record still active after deletion")
                else:
                    self.log_test("DELETE Verification", True, "Record removed from database")
        
        # Final results summary
        self.print_test_summary()
        
        # Cleanup remaining records
        print("\n[CLEANUP] Cleaning up remaining test records...")
        if record2:
            self.delete_academic_year(record2["id"])
        
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
    tester = AcademicYearCRUDTester()
    success = tester.run_comprehensive_crud_test()
    
    if success:
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()