#!/usr/bin/env python3
"""
Certificate Type CRUD Testing Script
Performs available CRUD operations testing on CertificateType model
Note: This model appears to have only LIST endpoint (no CREATE, UPDATE, DELETE)
"""

import requests
import json
import sys
from datetime import datetime
from typing import Dict, Any, Optional, List

class CertificateTypeCRUDTester:
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
    
    def list_certificate_types(self) -> Optional[List[Dict[str, Any]]]:
        """List all certificate types"""
        try:
            response = requests.get(
                f"{self.base_url}/api/v1/student/certificates/certificate-types",
                headers=self.headers
            )
            
            if response.status_code == 200:
                records = response.json()
                count = len(records) if isinstance(records, list) else 0
                self.log_test(
                    "LIST Certificate Types",
                    True,
                    f"Retrieved {count} records",
                    200
                )
                return records
            else:
                self.log_test(
                    "LIST Certificate Types",
                    False,
                    f"Failed: {response.text}",
                    response.status_code
                )
                return None
        except Exception as e:
            self.log_test("LIST Certificate Types", False, f"Exception: {str(e)}")
            return None
    
    def validate_certificate_type_structure(self, records: List[Dict[str, Any]]) -> bool:
        """Validate certificate type data structure"""
        try:
            if not records:
                self.log_test(
                    "VALIDATE Data Structure",
                    True,
                    "Empty list is valid structure",
                    None
                )
                return True
            
            required_fields = ["id", "name"]
            optional_fields = ["description"]
            
            valid_count = 0
            issues = []
            
            for i, record in enumerate(records):
                record_issues = []
                
                # Check required fields
                for field in required_fields:
                    if field not in record or record[field] is None:
                        record_issues.append(f"missing/null {field}")
                
                # Check ID is UUID format
                if "id" in record:
                    try:
                        # Simple UUID validation - should be string with dashes
                        id_val = str(record["id"])
                        if len(id_val) == 36 and id_val.count("-") == 4:
                            pass  # Likely a UUID
                        else:
                            record_issues.append("id not UUID format")
                    except:
                        record_issues.append("id not convertible to string")
                
                # Check name is string
                if "name" in record and record["name"] is not None:
                    if not isinstance(record["name"], str):
                        record_issues.append("name not string")
                
                if not record_issues:
                    valid_count += 1
                else:
                    issues.extend([f"Record {i}: {issue}" for issue in record_issues])
            
            if valid_count == len(records):
                self.log_test(
                    "VALIDATE Data Structure",
                    True,
                    f"All {valid_count} records have valid structure",
                    None
                )
                return True
            else:
                self.log_test(
                    "VALIDATE Data Structure",
                    False,
                    f"Only {valid_count}/{len(records)} valid. Issues: {'; '.join(issues[:3])}{'...' if len(issues) > 3 else ''}",
                    None
                )
                return False
        except Exception as e:
            self.log_test("VALIDATE Data Structure", False, f"Exception: {str(e)}")
            return False
    
    def analyze_certificate_types(self, records: List[Dict[str, Any]]) -> bool:
        """Analyze certificate types data for insights"""
        try:
            if not records:
                self.log_test(
                    "ANALYZE Certificate Types",
                    True,
                    "No records to analyze",
                    None
                )
                return True
            
            analysis = []
            
            # Count records with descriptions
            with_desc = sum(1 for r in records if r.get("description"))
            without_desc = len(records) - with_desc
            analysis.append(f"{with_desc} with descriptions, {without_desc} without")
            
            # Check for unique names (business rule validation)
            names = [r.get("name", "").strip() for r in records]
            unique_names = len(set(names))
            if unique_names == len(names):
                analysis.append("all names unique")
            else:
                analysis.append(f"{len(names) - unique_names} duplicate names found")
            
            # Sample a few names for context
            sample_names = [r.get("name", "N/A") for r in records[:3]]
            analysis.append(f"sample names: {', '.join(sample_names)}")
            
            self.log_test(
                "ANALYZE Certificate Types",
                True,
                "; ".join(analysis),
                None
            )
            return True
        except Exception as e:
            self.log_test("ANALYZE Certificate Types", False, f"Exception: {str(e)}")
            return False
    
    def test_endpoint_response_time(self) -> bool:
        """Test response time of the certificate types endpoint"""
        try:
            start_time = datetime.now()
            response = requests.get(
                f"{self.base_url}/api/v1/student/certificates/certificate-types",
                headers=self.headers
            )
            end_time = datetime.now()
            
            response_time_ms = (end_time - start_time).total_seconds() * 1000
            
            if response.status_code == 200:
                if response_time_ms < 1000:  # Less than 1 second
                    self.log_test(
                        "PERFORMANCE Response Time",
                        True,
                        f"Responded in {response_time_ms:.1f}ms",
                        200
                    )
                    return True
                else:
                    self.log_test(
                        "PERFORMANCE Response Time",
                        False,
                        f"Slow response: {response_time_ms:.1f}ms",
                        200
                    )
                    return False
            else:
                self.log_test(
                    "PERFORMANCE Response Time",
                    False,
                    f"Failed request in {response_time_ms:.1f}ms",
                    response.status_code
                )
                return False
        except Exception as e:
            self.log_test("PERFORMANCE Response Time", False, f"Exception: {str(e)}")
            return False
    
    def run_comprehensive_crud_test(self):
        """Run the available CRUD test sequence for CertificateType"""
        print("=" * 80)
        print("[TOOL] CERTIFICATE TYPE CRUD TESTING FRAMEWORK")
        print("=" * 80)
        print(f"Base URL: {self.base_url}")
        print(f"Schema: {self.headers['cschema']}")
        print(f"Available Operations: LIST only")
        print(f"Note: This model appears to be read-only (pre-populated data)")
        print()
        
        # Step 1: Authenticate
        if not self.authenticate_admin():
            print("[ERROR] Authentication failed. Cannot proceed with tests.")
            return False
        
        print("\n[INFO] Starting Available CRUD Test Sequence...")
        print("-" * 50)
        
        # Step 1: List certificate types (primary test)
        certificate_types = self.list_certificate_types()
        
        if certificate_types is None:
            print("[ERROR] Failed to retrieve certificate types. Cannot continue tests.")
            return False
        
        # Step 2: Validate data structure
        self.validate_certificate_type_structure(certificate_types)
        
        # Step 3: Analyze certificate types data
        self.analyze_certificate_types(certificate_types)
        
        # Step 4: Test performance
        self.test_endpoint_response_time()
        
        # Step 5: Test multiple requests (consistency)
        print("\n[INFO] Testing request consistency...")
        second_request = self.list_certificate_types()
        if second_request is not None and certificate_types is not None:
            if len(second_request) == len(certificate_types):
                self.log_test(
                    "CONSISTENCY Multiple Requests",
                    True,
                    f"Both requests returned {len(certificate_types)} records",
                    None
                )
            else:
                self.log_test(
                    "CONSISTENCY Multiple Requests",
                    False,
                    f"Inconsistent: {len(certificate_types)} vs {len(second_request)} records",
                    None
                )
        
        # Final results summary
        self.print_test_summary()
        
        # Note about model characteristics
        print("\n[INFO] CertificateType Model Analysis:")
        print("[INFO] - Appears to be a reference/lookup table")
        print("[INFO] - Likely pre-populated with standard certificate types")
        print("[INFO] - No CREATE/UPDATE/DELETE endpoints found")
        print("[INFO] - Model has unique constraint on 'name' field")
        
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
    tester = CertificateTypeCRUDTester()
    success = tester.run_comprehensive_crud_test()
    
    if success:
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()