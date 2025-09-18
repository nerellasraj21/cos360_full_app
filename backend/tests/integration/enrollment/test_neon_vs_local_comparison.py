import asyncio
import httpx
import json
from datetime import datetime

class DatabaseComparisonTest:

    def __init__(self, base_url="http://localhost:8003"):
        self.base_url = base_url
        self.headers = {
            "cschema": "test_tenant",
            "Content-Type": "application/json"
        }
        self.token = None

    async def authenticate(self, db_name="Unknown"):
        """Authenticate and get token"""
        print(f"[{db_name}] Authenticating...")

        credentials = {
            "username": "admin",
            "password": "testpass123"
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/api/v1/auth/login",
                    json=credentials,
                    headers=self.headers,
                    timeout=15.0
                )

                print(f"[{db_name}] Auth Status: {response.status_code}")

                if response.status_code == 200:
                    token_data = response.json()
                    self.token = token_data.get("access_token")
                    self.headers["Authorization"] = f"Bearer {self.token}"
                    user_info = token_data.get("user", {})
                    permissions_count = len(token_data.get("permissions", {}))
                    print(f"[{db_name}] SUCCESS - User: {user_info.get('username')} - Permissions: {permissions_count}")
                    return True, token_data
                else:
                    error_detail = response.text[:200]
                    print(f"[{db_name}] FAILED: {error_detail}")
                    return False, None

            except Exception as e:
                print(f"[{db_name}] ERROR: {str(e)}")
                return False, None

    async def test_database_connectivity(self, db_name="Unknown"):
        """Test basic database connectivity and schema"""
        print(f"\n[{db_name}] Testing database connectivity...")

        async with httpx.AsyncClient() as client:
            try:
                # Test academic years endpoint
                ay_response = await client.get(
                    f"{self.base_url}/api/v1/masters/academic_years/",
                    headers=self.headers,
                    timeout=15.0
                )

                print(f"[{db_name}] Academic Years: {ay_response.status_code}")

                if ay_response.status_code == 200:
                    ay_data = ay_response.json()
                    academic_years = ay_data.get("items", [])
                    print(f"[{db_name}] Found {len(academic_years)} academic years")
                    return {"academic_years": academic_years, "status": "success"}
                else:
                    print(f"[{db_name}] Academic years failed: {ay_response.text[:200]}")
                    return {"academic_years": [], "status": "failed", "error": ay_response.text}

            except Exception as e:
                print(f"[{db_name}] Connectivity error: {str(e)}")
                return {"academic_years": [], "status": "error", "error": str(e)}

    async def test_student_enrollment(self, db_name="Unknown"):
        """Test student enrollment workflow"""
        print(f"\n[{db_name}] Testing student enrollment...")

        # Get dependencies first
        deps = await self.test_database_connectivity(db_name)
        if not deps.get("academic_years"):
            print(f"[{db_name}] No academic years - cannot test student enrollment")
            return {"status": "skipped", "reason": "no_academic_years"}

        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        academic_year_id = deps["academic_years"][0]["id"]

        # Minimal student data to test basic functionality
        student_data = {
            "admission_date": "2024-01-15",
            "academic_year_id": academic_year_id,
            "admitted_academic_year_id": academic_year_id,
            "admitted_class_id": academic_year_id,  # Using academic year ID as placeholder
            "admitted_section_id": academic_year_id,
            "current_class_id": academic_year_id,
            "current_section_id": academic_year_id,
            "address_line1": "123 Test Street",
            "address_line2": "Apt 1",
            "city": "Test City",
            "state": "Test State",
            "previous_school_name": "Previous School",
            "previous_class": "Grade 9",
            "previous_school_remark": "Good student",
            "student": {
                "admission_number": f"NEON{timestamp}",
                "first_name": "Test",
                "last_name": "Student",
                "gender": "Male",
                "date_of_birth": "2010-01-15",
                "email": f"test.{db_name.lower()}.{timestamp}@test.com",
                "phone": "1234567890",
                "aadhar_number": "123456789012",
                "apaar_number": "APAAR123456"
            }
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/api/v1/students/admission/",
                    json=student_data,
                    headers=self.headers,
                    timeout=30.0
                )

                print(f"[{db_name}] Student creation: {response.status_code}")

                if response.status_code == 201:
                    result = response.json()
                    student_id = result.get("id")
                    print(f"[{db_name}] SUCCESS! Student ID: {student_id}")
                    return {
                        "status": "success",
                        "student_id": student_id,
                        "response": result
                    }
                else:
                    error_detail = response.text[:300]
                    print(f"[{db_name}] FAILED: {error_detail}")
                    return {
                        "status": "failed",
                        "error": error_detail,
                        "status_code": response.status_code
                    }

            except Exception as e:
                print(f"[{db_name}] ERROR: {str(e)}")
                return {"status": "error", "error": str(e)}

    async def test_staff_enrollment(self, db_name="Unknown"):
        """Test staff enrollment workflow"""
        print(f"\n[{db_name}] Testing staff enrollment...")

        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")

        staff_data = {
            "first_name": "Test",
            "last_name": "Staff",
            "email": f"staff.{db_name.lower()}.{timestamp}@test.com",
            "phone": "9876543210",
            "gender": "Male",
            "date_of_birth": "1985-05-20",
            "joining_date": "2024-01-15",
            "qualification": "Masters in Education",
            "experience_years": 5,
            "address": "456 Staff Street",
            "department": "Administration",
            "employee_id": f"STAFF{timestamp}"
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/api/v1/staff/enrollment",
                    json=staff_data,
                    headers=self.headers,
                    timeout=30.0
                )

                print(f"[{db_name}] Staff creation: {response.status_code}")

                if response.status_code == 201:
                    result = response.json()
                    staff_id = result.get("id")
                    print(f"[{db_name}] SUCCESS! Staff ID: {staff_id}")
                    return {
                        "status": "success",
                        "staff_id": staff_id,
                        "response": result
                    }
                else:
                    error_detail = response.text[:300]
                    print(f"[{db_name}] FAILED: {error_detail}")
                    return {
                        "status": "failed",
                        "error": error_detail,
                        "status_code": response.status_code
                    }

            except Exception as e:
                print(f"[{db_name}] ERROR: {str(e)}")
                return {"status": "error", "error": str(e)}

    async def test_gender_validation(self, db_name="Unknown"):
        """Test gender validation to confirm enum issue resolution"""
        print(f"\n[{db_name}] Testing gender validation...")

        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")

        # Test invalid gender for staff
        invalid_staff_data = {
            "first_name": "Invalid",
            "last_name": "Gender",
            "email": f"invalid.{db_name.lower()}.{timestamp}@test.com",
            "phone": "1111111111",
            "gender": "InvalidGender",
            "date_of_birth": "1990-01-01",
            "joining_date": "2024-01-15",
            "qualification": "Test",
            "experience_years": 1,
            "address": "Test Address",
            "department": "Test",
            "employee_id": f"INVALID{timestamp}"
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/api/v1/staff/enrollment",
                    json=invalid_staff_data,
                    headers=self.headers,
                    timeout=15.0
                )

                print(f"[{db_name}] Invalid gender test: {response.status_code}")

                if response.status_code >= 400:
                    print(f"[{db_name}] SUCCESS - Invalid gender properly rejected")
                    return {"status": "success", "validation_working": True}
                else:
                    print(f"[{db_name}] WARNING - Invalid gender was accepted")
                    return {"status": "warning", "validation_working": False}

            except Exception as e:
                print(f"[{db_name}] ERROR: {str(e)}")
                return {"status": "error", "error": str(e)}

    async def run_neon_comparison(self):
        """Run comprehensive comparison test on current database (should be Neon)"""
        print("="*80)
        print("NEON DATABASE ENROLLMENT VALIDATION")
        print("="*80)

        db_name = "NEON"
        results = {}

        # Authentication test
        auth_success, auth_data = await self.authenticate(db_name)
        results["authentication"] = {"success": auth_success, "data": auth_data}

        if not auth_success:
            print(f"[{db_name}] Authentication failed - cannot proceed")
            return results

        # Database connectivity test
        connectivity = await self.test_database_connectivity(db_name)
        results["connectivity"] = connectivity

        # Student enrollment test
        student_result = await self.test_student_enrollment(db_name)
        results["student_enrollment"] = student_result

        # Staff enrollment test
        staff_result = await self.test_staff_enrollment(db_name)
        results["staff_enrollment"] = staff_result

        # Gender validation test
        gender_result = await self.test_gender_validation(db_name)
        results["gender_validation"] = gender_result

        # Print summary
        print("\n" + "="*80)
        print("NEON DATABASE TEST SUMMARY")
        print("="*80)

        print(f"Authentication: {'PASS' if results['authentication']['success'] else 'FAIL'}")
        print(f"Database Connectivity: {'PASS' if results['connectivity']['status'] == 'success' else 'FAIL'}")
        print(f"Student Enrollment: {'PASS' if results['student_enrollment']['status'] == 'success' else 'FAIL'}")
        print(f"Staff Enrollment: {'PASS' if results['staff_enrollment']['status'] == 'success' else 'FAIL'}")
        print(f"Gender Validation: {'PASS' if results['gender_validation']['status'] == 'success' else 'FAIL'}")

        # Overall assessment
        critical_tests = ['authentication', 'connectivity']
        critical_passed = all(
            results[test]['success'] if test == 'authentication'
            else results[test]['status'] == 'success'
            for test in critical_tests
        )

        enrollment_tests = ['student_enrollment', 'staff_enrollment']
        enrollment_results = [results[test]['status'] for test in enrollment_tests]

        print(f"\nCritical Infrastructure: {'PASS' if critical_passed else 'FAIL'}")
        print(f"Enrollment Functionality: {enrollment_results}")
        print(f"Overall Status: {'HEALTHY' if critical_passed else 'NEEDS ATTENTION'}")

        return results

if __name__ == "__main__":
    tester = DatabaseComparisonTest()
    results = asyncio.run(tester.run_neon_comparison())