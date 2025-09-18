import asyncio
import httpx
import json
from datetime import datetime

class EnrollmentValidationTest:

    def __init__(self, base_url="http://localhost:8003"):
        self.base_url = base_url
        self.headers = {
            "cschema": "test_tenant",
            "Content-Type": "application/json"
        }
        self.token = None
        self.dependencies = {}

    async def authenticate(self):
        """Authenticate and get token"""
        print("[AUTH] Authenticating...")

        credentials = {
            "username": "admin",
            "password": "testpass123"
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/v1/auth/login",
                json=credentials,
                headers=self.headers
            )

            if response.status_code == 200:
                token_data = response.json()
                self.token = token_data.get("access_token")
                self.headers["Authorization"] = f"Bearer {self.token}"
                print("[AUTH] Success")
                return True
            else:
                print(f"[AUTH] Failed: {response.status_code}")
                return False

    async def get_dependencies(self):
        """Get required dependencies for enrollment"""
        print("[DEPS] Getting dependencies...")

        async with httpx.AsyncClient() as client:
            # Get academic years
            ay_response = await client.get(
                f"{self.base_url}/api/v1/masters/academic_years/",
                headers=self.headers
            )

            if ay_response.status_code == 200:
                ay_data = ay_response.json()
                academic_years = ay_data.get("items", [])
                self.dependencies["academic_years"] = academic_years
                print(f"[DEPS] Academic years: {len(academic_years)}")
                if academic_years:
                    print(f"[DEPS] First academic year: {academic_years[0]}")
            else:
                print(f"[DEPS] Academic years failed: {ay_response.status_code}")
                self.dependencies["academic_years"] = []

            # Try to get classes
            try:
                class_response = await client.get(
                    f"{self.base_url}/api/v1/masters/classes/",
                    headers=self.headers
                )
                if class_response.status_code == 200:
                    classes = class_response.json()
                    self.dependencies["classes"] = classes
                    print(f"[DEPS] Classes: {len(classes)}")
                else:
                    print(f"[DEPS] Classes failed: {class_response.status_code}")
            except:
                print("[DEPS] Classes endpoint not available")

            # Try to get sections
            try:
                section_response = await client.get(
                    f"{self.base_url}/api/v1/masters/sections/",
                    headers=self.headers
                )
                if section_response.status_code == 200:
                    sections = section_response.json()
                    self.dependencies["sections"] = sections
                    print(f"[DEPS] Sections: {len(sections)}")
                else:
                    print(f"[DEPS] Sections failed: {section_response.status_code}")
            except:
                print("[DEPS] Sections endpoint not available")

    async def test_student_enrollment(self):
        """Test student enrollment with correct schema"""
        print("\n[STUDENT] Testing student enrollment...")

        if not self.dependencies.get("academic_years") or len(self.dependencies["academic_years"]) == 0:
            print("[STUDENT] No academic years available - skipping")
            return False

        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        academic_year = self.dependencies["academic_years"][0]
        academic_year_id = academic_year["id"]

        # Create dummy IDs for required fields (will need real ones in production)
        student_data = {
            "admission_date": "2024-01-15",
            "academic_year_id": academic_year_id,
            "admitted_academic_year_id": academic_year_id,
            "admitted_class_id": academic_year_id,  # Using academic year ID as placeholder
            "admitted_section_id": academic_year_id,  # Using academic year ID as placeholder
            "current_class_id": academic_year_id,  # Using academic year ID as placeholder
            "current_section_id": academic_year_id,  # Using academic year ID as placeholder
            "address_line1": "123 Test Street",
            "address_line2": "Apt 1",
            "city": "Test City",
            "state": "Test State",
            "previous_school_name": "Previous School",
            "previous_class": "Grade 9",
            "previous_school_remark": "Good student",
            "student": {
                "admission_number": f"TEST{timestamp}",
                "first_name": "Test",
                "last_name": "Student",
                "gender": "Male",
                "date_of_birth": "2010-01-15",
                "email": f"test.student.{timestamp}@test.com",
                "phone": "1234567890"
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

                print(f"[STUDENT] Status: {response.status_code}")

                if response.status_code == 201:
                    result = response.json()
                    student_id = result.get("id")
                    print(f"[STUDENT] SUCCESS! Created student ID: {student_id}")

                    # Test update operation to verify database refresh pattern
                    update_data = {
                        "student": {
                            "first_name": "Updated",
                            "last_name": "Student"
                        }
                    }

                    update_response = await client.put(
                        f"{self.base_url}/api/v1/students/admission/{student_id}",
                        json=update_data,
                        headers=self.headers,
                        timeout=30.0
                    )

                    print(f"[STUDENT] Update status: {update_response.status_code}")
                    if update_response.status_code == 200:
                        print("[STUDENT] Update SUCCESS - Database refresh pattern working!")

                    return True

                else:
                    print(f"[STUDENT] Failed: {response.text[:500]}")
                    return False

            except Exception as e:
                print(f"[STUDENT] Error: {str(e)}")
                return False

    async def test_staff_enrollment(self):
        """Test staff enrollment with correct schema"""
        print("\n[STAFF] Testing staff enrollment...")

        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")

        staff_data = {
            "first_name": "Test",
            "last_name": "Staff",
            "email": f"test.staff.{timestamp}@test.com",
            "phone": "9876543210",
            "gender": "Male",
            "date_of_birth": "1985-05-20",
            "joining_date": "2024-01-15",
            "qualification": "Masters in Education",
            "experience_years": 5,
            "address": "456 Staff Street",
            "department": "Administration",
            "position": "Administrator",
            "salary": 50000.00,
            "employee_id": f"EMP{timestamp}"
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/api/v1/staff/enrollment",
                    json=staff_data,
                    headers=self.headers,
                    timeout=30.0
                )

                print(f"[STAFF] Status: {response.status_code}")

                if response.status_code == 201:
                    result = response.json()
                    staff_id = result.get("id")
                    print(f"[STAFF] SUCCESS! Created staff ID: {staff_id}")

                    # Test update operation to verify database refresh pattern
                    update_data = {
                        "first_name": "Updated",
                        "last_name": "Staff"
                    }

                    update_response = await client.put(
                        f"{self.base_url}/api/v1/staff/enrollment/{staff_id}",
                        json=update_data,
                        headers=self.headers,
                        timeout=30.0
                    )

                    print(f"[STAFF] Update status: {update_response.status_code}")
                    if update_response.status_code == 200:
                        print("[STAFF] Update SUCCESS - Database refresh pattern working!")

                    return True

                else:
                    print(f"[STAFF] Failed: {response.text[:500]}")
                    return False

            except Exception as e:
                print(f"[STAFF] Error: {str(e)}")
                return False

    async def run_tests(self):
        """Run all enrollment validation tests"""
        print("="*70)
        print("ENROLLMENT VALIDATION - LOCAL DATABASE")
        print("="*70)

        if not await self.authenticate():
            return False

        await self.get_dependencies()

        student_result = await self.test_student_enrollment()
        staff_result = await self.test_staff_enrollment()

        print("\n" + "="*70)
        print("RESULTS SUMMARY")
        print("="*70)
        print(f"Student Enrollment: {'PASS' if student_result else 'FAIL'}")
        print(f"Staff Enrollment: {'PASS' if staff_result else 'FAIL'}")
        print(f"Overall Status: {'PASS' if student_result and staff_result else 'NEEDS ATTENTION'}")

        # Test gender enum validation
        await self.test_gender_validation()

        return student_result and staff_result

    async def test_gender_validation(self):
        """Test gender validation to confirm enum issue is resolved"""
        print("\n[GENDER] Testing gender validation...")

        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")

        # Test invalid gender for staff
        invalid_staff_data = {
            "first_name": "Invalid",
            "last_name": "Gender",
            "email": f"invalid.{timestamp}@test.com",
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
            response = await client.post(
                f"{self.base_url}/api/v1/staff/enrollment",
                json=invalid_staff_data,
                headers=self.headers,
                timeout=30.0
            )

            print(f"[GENDER] Invalid gender test: {response.status_code}")
            if response.status_code >= 400:
                print("[GENDER] SUCCESS - Invalid gender properly rejected")
            else:
                print("[GENDER] WARNING - Invalid gender was accepted")

if __name__ == "__main__":
    tester = EnrollmentValidationTest()
    result = asyncio.run(tester.run_tests())