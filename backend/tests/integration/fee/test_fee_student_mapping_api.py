import pytest
import asyncio
from httpx import AsyncClient
from decimal import Decimal
from app.main import app
from tests.conftest import TestingSessionLocal
from app.models.fee.fee_student_mapping_model import FeeStudentMapping
from app.models.fee.fee_student_map_term_amount_model import FeeStudentMapTermAmount
from app.models.student.student_model import Student
from app.models.masters.admission_model import Admission
from app.models.masters.class_model import Class
from app.models.masters.sections_model import Section
from app.models.fee.fee_type_model import FeeType
from app.models.fee.fee_term_model import FeeTerm
from app.models.masters.academic_year_model import AcademicYear
from sqlalchemy.ext.asyncio import AsyncSession

class TestFeeStudentMappingAPI:
    """Integration tests for Fee Student Mapping API endpoints"""

    @pytest.fixture(autouse=True)
    async def setup_test_data(self, db_session: AsyncSession):
        """Set up test data for each test"""
        self.db = db_session
        
        # Create test academic year
        self.academic_year = AcademicYear(
            id=1,
            title="2023-2024",
            is_active=True,
            start_date="2023-04-01",
            end_date="2024-03-31"
        )
        self.db.add(self.academic_year)
        
        # Create test class
        self.test_class = Class(
            id=1,
            name="Class 10",
            description="Tenth Grade",
            is_active=True,
            academic_year_id=1
        )
        self.db.add(self.test_class)
        
        # Create test section
        self.test_section = Section(
            id=1,
            name="Section A",
            description="Morning Section",
            is_active=True,
            class_id=1
        )
        self.db.add(self.test_section)
        
        # Create test student
        self.test_student = Student(
            id=1,
            first_name="John",
            last_name="Doe",
            date_of_birth="2005-01-15",
            gender="M",
            user_id=1
        )
        self.db.add(self.test_student)
        
        # Create test admission
        self.test_admission = Admission(
            id=1,
            student_id=1,
            admission_number="ADM001",
            admission_date="2023-04-01",
            academic_year_id=1,
            current_class_id=1,
            current_section_id=1
        )
        self.db.add(self.test_admission)
        
        # Create test fee term
        self.test_fee_term = FeeTerm(
            id="123e4567-e89b-12d3-a456-426614174000",
            term_name="Annual",
            term_status="active",
            number_of_terms=4,
            academic_year_id=1
        )
        self.db.add(self.test_fee_term)
        
        # Create test fee type
        self.test_fee_type = FeeType(
            id="123e4567-e89b-12d3-a456-426614174001",
            type_name="Tuition Fee",
            fee_category_id="123e4567-e89b-12d3-a456-426614174002",
            fee_status="active",
            fee_term_id="123e4567-e89b-12d3-a456-426614174000",
            academic_year_id=1
        )
        self.db.add(self.test_fee_type)
        
        await self.db.commit()

    @pytest.mark.asyncio
    async def test_create_fee_student_mapping_success(self):
        """Test successful creation of fee student mapping"""
        mapping_data = {
            "student_id": 1,
            "student_admission_num": "ADM001",
            "class_id": 1,
            "section_id": 1,
            "fee_type_id": "123e4567-e89b-12d3-a456-426614174001",
            "total_fee": "10000.00",
            "academic_year_id": 1
        }
        
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.post("/fee/student-mappings/", json=mapping_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data["student_id"] == 1
        assert data["student_admission_num"] == "ADM001"
        assert data["total_fee"] == "10000.00"
        assert "id" in data
        assert "student_details" in data
        assert "student_fee_mapping_terms" in data

    @pytest.mark.asyncio
    async def test_create_fee_student_mapping_invalid_student(self):
        """Test creation with invalid student ID"""
        mapping_data = {
            "student_id": 999,
            "student_admission_num": "ADM001",
            "class_id": 1,
            "section_id": 1,
            "fee_type_id": "123e4567-e89b-12d3-a456-426614174001",
            "total_fee": "10000.00",
            "academic_year_id": 1
        }
        
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.post("/fee/student-mappings/", json=mapping_data)
        
        assert response.status_code == 404
        assert "Student with id 999 not found" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_create_fee_student_mapping_invalid_admission_number(self):
        """Test creation with invalid admission number"""
        mapping_data = {
            "student_id": 1,
            "student_admission_num": "INVALID",
            "class_id": 1,
            "section_id": 1,
            "fee_type_id": "123e4567-e89b-12d3-a456-426614174001",
            "total_fee": "10000.00",
            "academic_year_id": 1
        }
        
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.post("/fee/student-mappings/", json=mapping_data)
        
        assert response.status_code == 404
        assert "Admission with number INVALID not found" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_create_fee_student_mapping_negative_fee(self):
        """Test creation with negative total fee"""
        mapping_data = {
            "student_id": 1,
            "student_admission_num": "ADM001",
            "class_id": 1,
            "section_id": 1,
            "fee_type_id": "123e4567-e89b-12d3-a456-426614174001",
            "total_fee": "-1000.00",
            "academic_year_id": 1
        }
        
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.post("/fee/student-mappings/", json=mapping_data)
        
        assert response.status_code == 422
        assert "total_fee must be non-negative" in str(response.json())

    @pytest.mark.asyncio
    async def test_get_fee_student_mapping_by_id_success(self):
        """Test successful retrieval of fee student mapping by ID"""
        # First create a mapping
        mapping = FeeStudentMapping(
            student_id=1,
            student_admission_num="ADM001",
            class_id=1,
            section_id=1,
            fee_type_id="123e4567-e89b-12d3-a456-426614174001",
            total_fee=Decimal("10000.00"),
            academic_year_id=1
        )
        self.db.add(mapping)
        await self.db.commit()
        await self.db.refresh(mapping)
        
        mapping_id = str(mapping.id)
        
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.get(f"/fee/student-mappings/{mapping_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == mapping_id
        assert data["student_id"] == 1
        assert data["total_fee"] == "10000.00"

    @pytest.mark.asyncio
    async def test_get_fee_student_mapping_by_id_not_found(self):
        """Test retrieval with non-existent ID"""
        fake_id = "123e4567-e89b-12d3-a456-426614174999"
        
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.get(f"/fee/student-mappings/{fake_id}")
        
        assert response.status_code == 404
        assert f"Fee student mapping with id {fake_id} not found" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_get_fee_student_mapping_invalid_id_format(self):
        """Test retrieval with invalid ID format"""
        invalid_id = "not-a-uuid"
        
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.get(f"/fee/student-mappings/{invalid_id}")
        
        assert response.status_code == 400
        assert "Invalid fee student mapping ID format" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_get_all_fee_student_mappings_success(self):
        """Test successful retrieval of all fee student mappings"""
        # Create test mappings
        mapping1 = FeeStudentMapping(
            student_id=1,
            student_admission_num="ADM001",
            class_id=1,
            section_id=1,
            fee_type_id="123e4567-e89b-12d3-a456-426614174001",
            total_fee=Decimal("10000.00"),
            academic_year_id=1
        )
        
        mapping2 = FeeStudentMapping(
            student_id=1,
            student_admission_num="ADM001",
            class_id=1,
            section_id=1,
            fee_type_id="123e4567-e89b-12d3-a456-426614174003",  # Different fee type
            total_fee=Decimal("5000.00"),
            academic_year_id=1
        )
        
        self.db.add_all([mapping1, mapping2])
        await self.db.commit()
        
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.get("/fee/student-mappings/")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2

    @pytest.mark.asyncio
    async def test_get_all_fee_student_mappings_with_filters(self):
        """Test retrieval with query filters"""
        # Create test mappings for different students
        mapping1 = FeeStudentMapping(
            student_id=1,
            student_admission_num="ADM001",
            class_id=1,
            section_id=1,
            fee_type_id="123e4567-e89b-12d3-a456-426614174001",
            total_fee=Decimal("10000.00"),
            academic_year_id=1
        )
        
        # Create another student for testing
        student2 = Student(
            id=2,
            first_name="Jane",
            last_name="Smith",
            date_of_birth="2005-02-15",
            gender="F",
            user_id=2
        )
        self.db.add(student2)
        
        admission2 = Admission(
            id=2,
            student_id=2,
            admission_number="ADM002",
            admission_date="2023-04-01",
            academic_year_id=1,
            current_class_id=1,
            current_section_id=1
        )
        self.db.add(admission2)
        
        mapping2 = FeeStudentMapping(
            student_id=2,
            student_admission_num="ADM002",
            class_id=1,
            section_id=1,
            fee_type_id="123e4567-e89b-12d3-a456-426614174001",
            total_fee=Decimal("15000.00"),
            academic_year_id=1
        )
        
        self.db.add_all([mapping1, mapping2])
        await self.db.commit()
        
        # Test filter by student_id
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.get("/fee/student-mappings/?student_id=1")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["student_id"] == 1

    @pytest.mark.asyncio
    async def test_update_fee_student_mapping_success(self):
        """Test successful update of fee student mapping"""
        # Create initial mapping
        mapping = FeeStudentMapping(
            student_id=1,
            student_admission_num="ADM001",
            class_id=1,
            section_id=1,
            fee_type_id="123e4567-e89b-12d3-a456-426614174001",
            total_fee=Decimal("10000.00"),
            academic_year_id=1
        )
        self.db.add(mapping)
        await self.db.commit()
        await self.db.refresh(mapping)
        
        mapping_id = str(mapping.id)
        update_data = {"total_fee": "15000.00"}
        
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.put(f"/fee/student-mappings/{mapping_id}", json=update_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["total_fee"] == "15000.00"

    @pytest.mark.asyncio
    async def test_update_fee_student_mapping_not_found(self):
        """Test update with non-existent mapping"""
        fake_id = "123e4567-e89b-12d3-a456-426614174999"
        update_data = {"total_fee": "15000.00"}
        
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.put(f"/fee/student-mappings/{fake_id}", json=update_data)
        
        assert response.status_code == 404
        assert f"Fee student mapping with id {fake_id} not found" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_update_fee_student_mapping_invalid_data(self):
        """Test update with invalid data"""
        # Create initial mapping
        mapping = FeeStudentMapping(
            student_id=1,
            student_admission_num="ADM001",
            class_id=1,
            section_id=1,
            fee_type_id="123e4567-e89b-12d3-a456-426614174001",
            total_fee=Decimal("10000.00"),
            academic_year_id=1
        )
        self.db.add(mapping)
        await self.db.commit()
        await self.db.refresh(mapping)
        
        mapping_id = str(mapping.id)
        update_data = {"total_fee": "-5000.00"}  # Negative fee
        
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.put(f"/fee/student-mappings/{mapping_id}", json=update_data)
        
        assert response.status_code == 422
        assert "total_fee must be non-negative" in str(response.json())

    @pytest.mark.asyncio
    async def test_delete_fee_student_mapping_success(self):
        """Test successful deletion of fee student mapping"""
        # Create mapping to delete
        mapping = FeeStudentMapping(
            student_id=1,
            student_admission_num="ADM001",
            class_id=1,
            section_id=1,
            fee_type_id="123e4567-e89b-12d3-a456-426614174001",
            total_fee=Decimal("10000.00"),
            academic_year_id=1
        )
        self.db.add(mapping)
        await self.db.commit()
        await self.db.refresh(mapping)
        
        mapping_id = str(mapping.id)
        
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.delete(f"/fee/student-mappings/{mapping_id}")
        
        assert response.status_code == 200
        assert "Fee student mapping deleted successfully" in response.json()["message"]
        
        # Verify deletion
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.get(f"/fee/student-mappings/{mapping_id}")
        
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_fee_student_mapping_not_found(self):
        """Test deletion with non-existent mapping"""
        fake_id = "123e4567-e89b-12d3-a456-426614174999"
        
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.delete(f"/fee/student-mappings/{fake_id}")
        
        assert response.status_code == 404
        assert f"Fee student mapping with id {fake_id} not found" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_duplicate_mapping_prevention(self):
        """Test prevention of duplicate mappings for same student, fee type, and academic year"""
        # Create first mapping
        mapping_data = {
            "student_id": 1,
            "student_admission_num": "ADM001",
            "class_id": 1,
            "section_id": 1,
            "fee_type_id": "123e4567-e89b-12d3-a456-426614174001",
            "total_fee": "10000.00",
            "academic_year_id": 1
        }
        
        async with AsyncClient(app=app, base_url="http://test") as client:
            response1 = await client.post("/fee/student-mappings/", json=mapping_data)
        
        assert response1.status_code == 201
        
        # Try to create duplicate
        async with AsyncClient(app=app, base_url="http://test") as client:
            response2 = await client.post("/fee/student-mappings/", json=mapping_data)
        
        assert response2.status_code == 400
        assert "already exists" in response2.json()["detail"]

    @pytest.mark.asyncio
    async def test_term_amounts_creation(self):
        """Test that term amounts are automatically created"""
        mapping_data = {
            "student_id": 1,
            "student_admission_num": "ADM001",
            "class_id": 1,
            "section_id": 1,
            "fee_type_id": "123e4567-e89b-12d3-a456-426614174001",
            "total_fee": "10000.00",
            "academic_year_id": 1
        }
        
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.post("/fee/student-mappings/", json=mapping_data)
        
        assert response.status_code == 201
        data = response.json()
        
        # Check that term amounts were created
        assert "student_fee_mapping_terms" in data
        term_amounts = data["student_fee_mapping_terms"]
        
        # Should have term amounts based on the fee term's number_of_terms (4)
        assert len(term_amounts) == 4
        
        # Each term should have 1/4 of total fee (10000/4 = 2500)
        for term_amount in term_amounts:
            assert float(term_amount["term_amount"]) == 2500.00