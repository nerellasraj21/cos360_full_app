import asyncio
import httpx
import json
from datetime import datetime

class EnrollmentTester:

    def __init__(self, base_url="http://localhost:8003"):
        self.base_url = base_url
        self.headers = {
            "cschema": "test_tenant",
            "Content-Type": "application/json"
        }
        self.token = None
        self.test_results = {}

    async def authenticate(self):
        """Authenticate and get token"""
        print("\n[AUTH] Testing authentication...")

        login_data = {
            "username": "admin",
            "password": "testpass123"
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/api/v1/auth/login",
                    json=login_data,
                    headers=self.headers
                )

                print(f"[AUTH] Status: {response.status_code}")

                if response.status_code == 200:
                    token_data = response.json()
                    self.token = token_data.get("access_token")
                    if self.token:
                        self.headers["Authorization"] = f"Bearer {self.token}"
                        print("[AUTH] Authentication successful")
                        print(f"[AUTH] User info: {token_data.get('user', {}).get('username', 'Unknown')}")
                        return True
                    else:
                        print("[AUTH] No access token in response")
                        return False
                else:
                    print(f"[AUTH] Authentication failed: {response.text}")
                    return False

            except Exception as e:
                print(f"[AUTH] Error: {str(e)}")
                return False

    async def get_dependencies(self):
        """Get academic years and classes needed for student enrollment"""
        print("\n[DEPS] Getting dependencies...")
        dependencies = {"academic_years": [], "classes": []}

        async with httpx.AsyncClient() as client:
            # Get academic years
            try:
                ay_response = await client.get(
                    f"{self.base_url}/api/v1/masters/academic-years/",
                    headers=self.headers
                )

                if ay_response.status_code == 200:
                    dependencies["academic_years"] = ay_response.json()
                    print(f"[DEPS] Found {len(dependencies['academic_years'])} academic years")
                else:
                    print(f"[DEPS] Academic years failed: {ay_response.status_code}")

            except Exception as e:
                print(f"[DEPS] Academic years error: {str(e)}")

            # Get classes
            try:
                class_response = await client.get(
                    f"{self.base_url}/api/v1/masters/classes/",
                    headers=self.headers
                )

                if class_response.status_code == 200:
                    dependencies["classes"] = class_response.json()
                    print(f"[DEPS] Found {len(dependencies['classes'])} classes")
                else:
                    print(f"[DEPS] Classes failed: {class_response.status_code}")

            except Exception as e:
                print(f"[DEPS] Classes error: {str(e)}")

        return dependencies

    async def test_student_enrollment(self):
        """Test student enrollment workflow"""
        print("\n[STUDENT] Testing student enrollment...")

        dependencies = await self.get_dependencies()
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")

        # Prepare test data
        student_data = {
            "admission_number": f"TEST{timestamp}",
            "first_name": "Test",
            "last_name": "Student",
            "gender": "Male",
            "date_of_birth": "2010-01-15",
            "email": f"test.student.{timestamp}@test.com",
            "phone": "1234567890",
            "address": "123 Test Street",
            "admission_date": "2024-01-15",
            "section": "A"
        }

        # Add dependencies if available
        if dependencies["academic_years"]:
            student_data["academic_year_id"] = dependencies["academic_years"][0]["id"]
            print(f"[STUDENT] Using academic year: {dependencies['academic_years'][0].get('name', 'Unknown')}")

        if dependencies["classes"]:
            student_data["class_id"] = dependencies["classes"][0]["id"]
            print(f"[STUDENT] Using class: {dependencies['classes'][0].get('name', 'Unknown')}")

        async with httpx.AsyncClient() as client:
            try:
                # Test student creation
                create_response = await client.post(
                    f"{self.base_url}/api/v1/students/admission/",
                    json=student_data,
                    headers=self.headers,
                    timeout=30.0
                )

                print(f"[STUDENT] Create status: {create_response.status_code}")

                if create_response.status_code == 201:
                    created_student = create_response.json()
                    student_id = created_student.get("id")
                    print(f"[STUDENT] Created successfully with ID: {student_id}")

                    # Test student update
                    print("[STUDENT] Testing update...")
                    update_data = {
                        "first_name": "Updated",
                        "last_name": "Student",
                        "gender": "Female"
                    }

                    update_response = await client.put(
                        f"{self.base_url}/api/v1/students/admission/{student_id}",
                        json=update_data,
                        headers=self.headers,
                        timeout=30.0
                    )

                    print(f"[STUDENT] Update status: {update_response.status_code}")
                    if update_response.status_code == 200:
                        print("[STUDENT] Update successful - Database refresh pattern working!")

                    # Test invalid gender
                    print("[STUDENT] Testing invalid gender validation...")
                    invalid_data = student_data.copy()
                    invalid_data["admission_number"] = f"INVALID{timestamp}"
                    invalid_data["gender"] = "InvalidGender"

                    invalid_response = await client.post(
                        f"{self.base_url}/api/v1/students/admission/",
                        json=invalid_data,
                        headers=self.headers,
                        timeout=30.0
                    )

                    print(f"[STUDENT] Invalid gender test: {invalid_response.status_code}")

                    self.test_results["student_enrollment"] = {
                        "create": create_response.status_code == 201,
                        "update": update_response.status_code == 200,
                        "validation": invalid_response.status_code >= 400,
                        "student_id": student_id
                    }

                    return True

                else:
                    print(f"[STUDENT] Creation failed: {create_response.text}")
                    self.test_results["student_enrollment"] = {
                        "create": False,
                        "error": create_response.text
                    }
                    return False

            except Exception as e:
                print(f"[STUDENT] Error: {str(e)}")
                self.test_results["student_enrollment"] = {
                    "create": False,
                    "error": str(e)
                }
                return False

    async def test_staff_enrollment(self):
        """Test staff enrollment workflow"""
        print("\n[STAFF] Testing staff enrollment...")

        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")

        # Prepare test data
        staff_data = {
            "employee_id": f"EMP{timestamp}",
            "first_name": "Test",
            "last_name": "Staff",
            "gender": "Male",
            "date_of_birth": "1985-05-20",
            "email": f"test.staff.{timestamp}@test.com",
            "phone": "9876543210",
            "address": "456 Staff Street",
            "hire_date": "2024-01-15",
            "department": "Administration",
            "position": "Administrator",
            "salary": 50000.00
        }

        async with httpx.AsyncClient() as client:
            try:
                # Test staff creation
                create_response = await client.post(
                    f"{self.base_url}/api/v1/staff/enrollment",
                    json=staff_data,
                    headers=self.headers,
                    timeout=30.0
                )

                print(f"[STAFF] Create status: {create_response.status_code}")

                if create_response.status_code == 201:
                    created_staff = create_response.json()
                    staff_id = created_staff.get("id")
                    print(f"[STAFF] Created successfully with ID: {staff_id}")

                    # Test staff update
                    print("[STAFF] Testing update...")
                    update_data = {
                        "first_name": "Updated",
                        "last_name": "Staff",
                        "gender": "Female"
                    }

                    update_response = await client.put(
                        f"{self.base_url}/api/v1/staff/enrollment/{staff_id}",
                        json=update_data,
                        headers=self.headers,
                        timeout=30.0
                    )

                    print(f"[STAFF] Update status: {update_response.status_code}")
                    if update_response.status_code == 200:
                        print("[STAFF] Update successful - Database refresh pattern working!")

                    # Test invalid gender
                    print("[STAFF] Testing invalid gender validation...")
                    invalid_data = staff_data.copy()
                    invalid_data["employee_id"] = f"INVALID{timestamp}"
                    invalid_data["gender"] = "InvalidGender"

                    invalid_response = await client.post(
                        f"{self.base_url}/api/v1/staff/enrollment",
                        json=invalid_data,
                        headers=self.headers,
                        timeout=30.0
                    )

                    print(f"[STAFF] Invalid gender test: {invalid_response.status_code}")

                    self.test_results["staff_enrollment"] = {
                        "create": create_response.status_code == 201,
                        "update": update_response.status_code == 200,
                        "validation": invalid_response.status_code >= 400,
                        "staff_id": staff_id
                    }

                    return True

                else:
                    print(f"[STAFF] Creation failed: {create_response.text}")
                    self.test_results["staff_enrollment"] = {
                        "create": False,
                        "error": create_response.text
                    }
                    return False

            except Exception as e:
                print(f"[STAFF] Error: {str(e)}")
                self.test_results["staff_enrollment"] = {
                    "create": False,
                    "error": str(e)
                }
                return False

    async def run_all_tests(self):
        """Run all enrollment tests"""
        print("="*60)
        print("ENROLLMENT VALIDATION TESTS - LOCAL DATABASE")
        print("="*60)

        # Step 1: Authentication
        if not await self.authenticate():
            print("[FAIL] Authentication failed - cannot proceed")
            return False

        # Step 2: Test student enrollment
        await self.test_student_enrollment()

        # Step 3: Test staff enrollment
        await self.test_staff_enrollment()

        # Print summary
        print("\n" + "="*60)
        print("TEST RESULTS SUMMARY")
        print("="*60)

        for test_name, results in self.test_results.items():
            print(f"\n{test_name.upper()}:")
            if isinstance(results, dict):
                for key, value in results.items():
                    if key != "error":
                        status = "[PASS]" if value else "[FAIL]"
                        print(f"  {key}: {status}")
                    elif value:
                        print(f"  Error: {value}")

        # Overall assessment
        all_passed = all(
            isinstance(result, dict) and result.get("create", False)
            for result in self.test_results.values()
        )

        print(f"\nOVERALL: {'[PASS]' if all_passed else '[NEEDS ATTENTION]'}")

        return all_passed

if __name__ == "__main__":
    tester = EnrollmentTester()
    result = asyncio.run(tester.run_all_tests())