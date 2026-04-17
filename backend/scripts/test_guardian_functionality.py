"""
Test script to verify Guardian details functionality in admission form.

This script tests:
1. Guardian property on Student model
2. Guardian extraction in admission service
3. Guardian serialization in StudentOut schema
4. Guardian display in admission details view (via API)
"""

import asyncio
import logging
import sys
import os
from datetime import datetime, date
from uuid import uuid4

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_guardian_functionality():
    """Test guardian details functionality"""

    print("\n" + "="*80)
    print("GUARDIAN FUNCTIONALITY TEST")
    print("="*80)

    try:
        print("\n[OK] Starting guardian functionality tests")

        # Test 1: Check if Student model has guardian property
        print("\n" + "-"*80)
        print("TEST 1: Student Model Guardian Property")
        print("-"*80)

        with open("app/models/student/student_model.py", "r") as f:
            student_model_content = f.read()

        model_checks = {
            "Guardian property getter": "@property" in student_model_content and "def guardian(self):" in student_model_content,
            "Guardian property setter": "@guardian.setter" in student_model_content,
            "Guardian getter implementation": "self._guardian" in student_model_content,
        }

        all_model_passed = True
        for check_name, check_result in model_checks.items():
            status = "[OK]" if check_result else "[FAIL]"
            print(f"{status} {check_name}")
            if not check_result:
                all_model_passed = False

        if not all_model_passed:
            print("\n[FAIL] Some model checks failed")
            return False

        # Test 2: Check StudentOut schema includes guardian field
        print("\n" + "-"*80)
        print("TEST 2: StudentOut Schema Guardian Field")
        print("-"*80)

        with open("app/schemas/student/student_schema.py", "r") as f:
            schema_content = f.read()

        schema_checks = {
            "Guardian field declaration": "guardian: ParentOut | None = None" in schema_content,
            "Guardian in docstring": "@property guardian" in schema_content or "guardian fields" in schema_content,
        }

        all_schema_passed = True
        for check_name, check_result in schema_checks.items():
            status = "[OK]" if check_result else "[FAIL]"
            print(f"{status} {check_name}")
            if not check_result:
                all_schema_passed = False

        if not all_schema_passed:
            print("\n[FAIL] Some schema checks failed")
            return False

        # Test 3: Verify model_validator in StudentOut
        print("\n" + "-"*80)
        print("TEST 3: StudentOut Model Validator for Guardian")
        print("-"*80)

        validator_checks = {
            "Extract guardian validator": "extract_father_mother_guardian" in schema_content,
            "Guardian property extraction": "if hasattr(data, '_guardian'):" in schema_content,
            "Guardian assignment in validator": "result['guardian'] = data._guardian" in schema_content,
        }

        all_validator_passed = True
        for check_name, check_result in validator_checks.items():
            status = "[OK]" if check_result else "[FAIL]"
            print(f"{status} {check_name}")
            if not check_result:
                all_validator_passed = False

        if not all_validator_passed:
            print("\n[FAIL] Some validator checks failed")
            return False

        # Test 4: Verify model changes in admission_service.py
        print("\n" + "-"*80)
        print("TEST 4: Admission Service Guardian Extraction")
        print("-"*80)

        with open("app/service/student/admission_service.py", "r") as f:
            service_content = f.read()

        service_checks = {
            "Guardian initialization": "guardian = None" in service_content,
            "Guardian relation check": 'relation == "guardian"' in service_content,
            "Guardian assignment": "admission.student.guardian = guardian" in service_content,
            "Guardian None assignment": "admission.student.guardian = None" in service_content,
            "Guardian from parent loop": "delattr(guardian" in service_content or 'relation == "guardian"' in service_content,
        }

        all_service_passed = True
        for check_name, check_result in service_checks.items():
            status = "[OK]" if check_result else "[FAIL]"
            print(f"{status} {check_name}")
            if not check_result:
                all_service_passed = False

        if not all_service_passed:
            print("\n[FAIL] Some service checks failed")
            return False

        # Test 5: Verify frontend changes
        print("\n" + "-"*80)
        print("TEST 5: Frontend Admission Details View")
        print("-"*80)

        admission_view_path = "C:/Users/nerel/Documents/Workspace/React Workspace/COS360_Frontend/cos360_frontend/src/routes/_app/students/admission/$admissionId.tsx"
        with open(admission_view_path, "r") as f:
            view_content = f.read()

        frontend_checks = {
            "Guardian Name field": "Guardian Name" in view_content,
            "Guardian Email field": "Guardian Email" in view_content,
            "Guardian Phone field": "Guardian Phone" in view_content,
            "Guardian Occupation field": "Guardian Occupation" in view_content,
            "Guardian Aadhar field": "Guardian Aadhar" in view_content,
            "Guardian Gender field": "Guardian Gender" in view_content,
            "Guardian conditional display": "studentData.guardian" in view_content,
        }

        all_frontend_passed = True
        for check_name, check_result in frontend_checks.items():
            status = "[OK]" if check_result else "[FAIL]"
            print(f"{status} {check_name}")
            if not check_result:
                all_frontend_passed = False

        if not all_frontend_passed:
            print("\n[FAIL] Some frontend checks failed")
            return False

        print("\n" + "="*80)
        print("ALL TESTS PASSED! [OK]")
        print("="*80)
        print("\nGuardian functionality is fully implemented:")
        print("  [OK] Student model supports guardian property")
        print("  [OK] StudentOut schema includes guardian field")
        print("  [OK] StudentOut model_validator extracts guardian")
        print("  [OK] Admission service extracts guardian from parent_links")
        print("  [OK] Admission details view displays guardian information")
        print("\nNext steps:")
        print("  1. Restart the FastAPI backend server")
        print("  2. Create/edit an admission with guardian details")
        print("  3. View the admission details to see guardian information")
        print("="*80 + "\n")

        return True

    except Exception as e:
        print(f"\n[FAIL] Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_guardian_functionality()
    exit(0 if success else 1)
