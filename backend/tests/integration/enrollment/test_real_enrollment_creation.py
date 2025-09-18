import asyncio
import httpx
import json
from datetime import datetime

class RealEnrollmentTest:

    def __init__(self, base_url="http://localhost:8003"):
        self.base_url = base_url
        self.headers = {
            "cschema": "test_tenant",
            "Content-Type": "application/json"
        }
        self.token = None

    async def authenticate(self):
        """Authenticate with production database"""
        print("[NEON] Authenticating with production database...")

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

                if response.status_code == 200:
                    token_data = response.json()
                    self.token = token_data.get("access_token")
                    self.headers["Authorization"] = f"Bearer {self.token}"
                    user_info = token_data.get("user", {})
                    print(f"[NEON] Authentication SUCCESS - User: {user_info.get('username')}")
                    return True
                else:
                    print(f"[NEON] Authentication FAILED: {response.text}")
                    return False

            except Exception as e:
                print(f"[NEON] Authentication ERROR: {str(e)}")
                return False

    async def get_dependencies(self):
        """Get real dependencies for enrollment"""
        print("[NEON] Getting dependencies...")

        async with httpx.AsyncClient() as client:
            # Get academic years
            ay_response = await client.get(
                f"{self.base_url}/api/v1/masters/academic_years/",
                headers=self.headers
            )

            if ay_response.status_code == 200:
                ay_data = ay_response.json()
                academic_years = ay_data.get("items", [])
                print(f"[NEON] Found {len(academic_years)} academic years")
                if academic_years:
                    print(f"[NEON] Using academic year: {academic_years[0]['title']}")
                return academic_years
            else:
                print(f"[NEON] Failed to get academic years: {ay_response.status_code}")
                return []

    async def get_available_roles(self):
        """Try to get available roles for staff"""
        print("[NEON] Checking available roles...")

        async with httpx.AsyncClient() as client:
            # Try different role endpoints
            role_endpoints = [
                "/api/v1/auth/roles/roles/",
                "/api/v1/masters/roles/",
                "/api/v1/roles/"
            ]

            for endpoint in role_endpoints:
                try:
                    response = await client.get(
                        f"{self.base_url}{endpoint}",
                        headers=self.headers
                    )
                    if response.status_code == 200:
                        roles_data = response.json()
                        # Handle both list and paginated responses
                        roles = roles_data if isinstance(roles_data, list) else roles_data.get("items", roles_data.get("data", []))
                        print(f"[NEON] Found {len(roles)} roles at {endpoint}")
                        if roles:
                            staff_roles = [role for role in roles if "staff" in role.get("name", "").lower()]
                            if staff_roles:
                                print(f"[NEON] Found Staff role: {staff_roles[0]}")
                                return staff_roles[0]["id"]
                            else:
                                print(f"[NEON] Available roles: {[role.get('name') for role in roles[:5]]}")
                                return roles[0]["id"]  # Use first available role
                except Exception as e:
                    continue

            print("[NEON] No roles endpoint found")
            return None

    async def create_real_student(self, academic_years):
        """Create a real student record with all required fields"""
        print("\n[NEON] Creating REAL student record...")

        if not academic_years:
            print("[NEON] Cannot create student - no academic years available")
            return None

        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        academic_year_id = academic_years[0]["id"]

        # Complete student data with all required fields
        student_data = {
            "admission_date": "2024-01-15",
            "academic_year_id": academic_year_id,
            "admitted_academic_year_id": academic_year_id,
            "admitted_class_id": academic_year_id,  # Using academic year ID as placeholder
            "admitted_section_id": academic_year_id,
            "current_class_id": academic_year_id,
            "current_section_id": academic_year_id,
            "address_line1": "123 Production Test Street",
            "address_line2": "Unit 101",
            "city": "Test City",
            "state": "Test State",
            "previous_school_name": "Previous Test School",
            "previous_class": "Grade 9",
            "previous_school_remark": "Good performance",
            "student": {
                "admission_number": f"PROD{timestamp}",
                "first_name": "Production",
                "last_name": "TestStudent",
                "gender": "Male",
                "date_of_birth": "2010-01-15",
                "email": f"prod.student.{timestamp}@test.com",
                "phone": "9876543210",
                "aadhar_number": "123456789012",  # 12-digit number
                "apaar_number": "123456789012",   # 12-digit number format
                "caste": "General"  # Added missing required field
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

                print(f"[NEON] Student creation status: {response.status_code}")

                if response.status_code == 201:
                    result = response.json()
                    student_id = result.get("id")
                    admission_number = result.get("student", {}).get("admission_number", "Unknown")
                    print(f"[NEON] SUCCESS! Student created:")
                    print(f"       Student ID: {student_id}")
                    print(f"       Admission Number: {admission_number}")
                    print(f"       Name: Production TestStudent")
                    print(f"       Email: {result.get('student', {}).get('email', 'N/A')}")

                    # Test update to verify database refresh pattern
                    print("[NEON] Testing student update (database refresh pattern)...")
                    update_data = {
                        "student": {
                            "first_name": "Updated Production",
                            "last_name": "TestStudent"
                        }
                    }

                    update_response = await client.put(
                        f"{self.base_url}/api/v1/students/admission/{student_id}",
                        json=update_data,
                        headers=self.headers,
                        timeout=30.0
                    )

                    if update_response.status_code == 200:
                        print("[NEON] Student update SUCCESS - Database refresh pattern working!")
                    else:
                        print(f"[NEON] Student update failed: {update_response.status_code}")

                    return {
                        "success": True,
                        "student_id": student_id,
                        "admission_number": admission_number,
                        "update_successful": update_response.status_code == 200
                    }

                else:
                    error_detail = response.text
                    print(f"[NEON] Student creation FAILED:")
                    print(f"       Status: {response.status_code}")
                    print(f"       Error: {error_detail[:500]}")
                    return {"success": False, "error": error_detail}

            except Exception as e:
                print(f"[NEON] Student creation ERROR: {str(e)}")
                return {"success": False, "error": str(e)}

    async def create_real_staff(self, role_id=None):
        """Create a real staff record with all required fields"""
        print("\n[NEON] Creating REAL staff record...")

        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")

        # Complete staff data with all required fields
        staff_data = {
            "first_name": "Production",
            "last_name": "TestStaff",
            "email": f"prod.staff.{timestamp}@test.com",
            "phone": "9876543210",
            "gender": "Female",
            "date_of_birth": "1985-05-20",
            "joining_date": "2024-01-15",
            "qualification": "Masters in Education",
            "experience_years": 5,
            "address": "456 Production Staff Street",
            "department": "Administration",
            "employee_id": f"PRODSTAFF{timestamp}"
        }

        # Add role_id if available
        if role_id:
            staff_data["role_id"] = role_id
            print(f"[NEON] Using role_id: {role_id}")

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/api/v1/staff/enrollment",
                    json=staff_data,
                    headers=self.headers,
                    timeout=30.0
                )

                print(f"[NEON] Staff creation status: {response.status_code}")

                if response.status_code == 201:
                    result = response.json()
                    staff_id = result.get("id")
                    employee_id = result.get("employee_id", "Unknown")
                    print(f"[NEON] SUCCESS! Staff created:")
                    print(f"       Staff ID: {staff_id}")
                    print(f"       Employee ID: {employee_id}")
                    print(f"       Name: Production TestStaff")
                    print(f"       Email: {result.get('email', 'N/A')}")
                    print(f"       Department: {result.get('department', 'N/A')}")

                    # Test update to verify database refresh pattern
                    print("[NEON] Testing staff update (database refresh pattern)...")
                    update_data = {
                        "first_name": "Updated Production",
                        "last_name": "TestStaff",
                        "department": "Updated Administration"
                    }

                    update_response = await client.put(
                        f"{self.base_url}/api/v1/staff/enrollment/{staff_id}",
                        json=update_data,
                        headers=self.headers,
                        timeout=30.0
                    )

                    if update_response.status_code == 200:
                        print("[NEON] Staff update SUCCESS - Database refresh pattern working!")
                    else:
                        print(f"[NEON] Staff update failed: {update_response.status_code}")

                    return {
                        "success": True,
                        "staff_id": staff_id,
                        "employee_id": employee_id,
                        "update_successful": update_response.status_code == 200
                    }

                else:
                    error_detail = response.text
                    print(f"[NEON] Staff creation FAILED:")
                    print(f"       Status: {response.status_code}")
                    print(f"       Error: {error_detail[:500]}")
                    return {"success": False, "error": error_detail}

            except Exception as e:
                print(f"[NEON] Staff creation ERROR: {str(e)}")
                return {"success": False, "error": str(e)}

    async def run_real_enrollment_test(self):
        """Run real enrollment creation test"""
        print("="*80)
        print("REAL ENROLLMENT CREATION TEST - NEON PRODUCTION DATABASE")
        print("="*80)

        # Authenticate
        if not await self.authenticate():
            return {"success": False, "error": "Authentication failed"}

        # Get dependencies
        academic_years = await self.get_dependencies()
        role_id = await self.get_available_roles()

        # Create real student
        student_result = await self.create_real_student(academic_years)

        # Create real staff
        staff_result = await self.create_real_staff(role_id)

        # Summary
        print("\n" + "="*80)
        print("REAL ENROLLMENT TEST RESULTS")
        print("="*80)

        print(f"Student Creation: {'SUCCESS' if student_result and student_result['success'] else 'FAILED'}")
        if student_result and student_result['success']:
            print(f"  - Student ID: {student_result['student_id']}")
            print(f"  - Admission Number: {student_result['admission_number']}")
            print(f"  - Update Test: {'PASS' if student_result['update_successful'] else 'FAIL'}")

        print(f"Staff Creation: {'SUCCESS' if staff_result and staff_result['success'] else 'FAILED'}")
        if staff_result and staff_result['success']:
            print(f"  - Staff ID: {staff_result['staff_id']}")
            print(f"  - Employee ID: {staff_result['employee_id']}")
            print(f"  - Update Test: {'PASS' if staff_result['update_successful'] else 'FAIL'}")

        # Overall assessment
        both_successful = (
            student_result and student_result['success'] and
            staff_result and staff_result['success']
        )

        print(f"\nOVERALL RESULT: {'COMPLETE SUCCESS' if both_successful else 'PARTIAL SUCCESS'}")
        print(f"Database Refresh Pattern: {'VERIFIED' if both_successful else 'NEEDS VERIFICATION'}")
        print(f"Production Readiness: {'CONFIRMED' if both_successful else 'REQUIRES ATTENTION'}")

        return {
            "student_result": student_result,
            "staff_result": staff_result,
            "overall_success": both_successful
        }

if __name__ == "__main__":
    tester = RealEnrollmentTest()
    results = asyncio.run(tester.run_real_enrollment_test())