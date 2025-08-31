"""
Integration tests for Fee Class Mapping API endpoints
"""
import pytest
from datetime import date
from decimal import Decimal

from app.models.masters.academic_year_model import AcademicYear
from app.models.masters.class_model import Class
from app.models.fee.fee_category_model import FeeCategory
from app.models.fee.fee_term_model import FeeTerm
from app.models.fee.fee_type_model import FeeType
from app.models.fee.fee_class_mapping_model import FeeClassMapping

class TestFeeClassMappingAPI:
    """Test Fee Class Mapping API endpoints"""

    @pytest.fixture
    async def setup_academic_year(self, test_db_session):
        """Create an academic year for testing"""
        academic_year = AcademicYear(
            title="2024-2025",
            is_active=True,
            start_date=date(2024, 4, 1),
            end_date=date(2025, 3, 31)
        )
        test_db_session.add(academic_year)
        await test_db_session.commit()
        await test_db_session.refresh(academic_year)
        return academic_year

    @pytest.fixture
    async def setup_class(self, test_db_session, setup_academic_year):
        """Create a class for testing"""
        academic_year = setup_academic_year
        class_obj = Class(
            name="Grade 1",
            description="First grade class",
            is_active=True,
            short_code="G1",
            academic_year_id=academic_year.id
        )
        test_db_session.add(class_obj)
        await test_db_session.commit()
        await test_db_session.refresh(class_obj)
        return class_obj

    @pytest.fixture
    async def setup_second_class(self, test_db_session, setup_academic_year):
        """Create a second class for testing"""
        academic_year = setup_academic_year
        class_obj = Class(
            name="Grade 2",
            description="Second grade class",
            is_active=True,
            short_code="G2",
            academic_year_id=academic_year.id
        )
        test_db_session.add(class_obj)
        await test_db_session.commit()
        await test_db_session.refresh(class_obj)
        return class_obj

    @pytest.fixture
    async def setup_fee_category(self, test_db_session, setup_academic_year):
        """Create a fee category for testing"""
        academic_year = setup_academic_year
        fee_category = FeeCategory(
            category_name="Academic Fee",
            category_status="active",
            academic_year_id=academic_year.id
        )
        test_db_session.add(fee_category)
        await test_db_session.commit()
        await test_db_session.refresh(fee_category)
        return fee_category

    @pytest.fixture
    async def setup_fee_term(self, test_db_session, setup_academic_year):
        """Create a fee term for testing"""
        academic_year = setup_academic_year
        fee_term = FeeTerm(
            term_name="Quarterly",
            term_status="active",
            number_of_terms=4,
            academic_year_id=academic_year.id
        )
        test_db_session.add(fee_term)
        await test_db_session.commit()
        await test_db_session.refresh(fee_term)
        return fee_term

    @pytest.fixture
    async def setup_fee_type(self, test_db_session, setup_academic_year, setup_fee_category, setup_fee_term):
        """Create a fee type for testing"""
        academic_year = setup_academic_year
        fee_category = setup_fee_category
        fee_term = setup_fee_term
        
        fee_type = FeeType(
            type_name="Tuition Fee",
            fee_category_id=fee_category.id,
            fee_status="active",
            fee_term_id=fee_term.id,
            academic_year_id=academic_year.id
        )
        test_db_session.add(fee_type)
        await test_db_session.commit()
        await test_db_session.refresh(fee_type)
        return fee_type

    @pytest.fixture
    async def setup_second_fee_type(self, test_db_session, setup_academic_year, setup_fee_category, setup_fee_term):
        """Create a second fee type for testing"""
        academic_year = setup_academic_year
        fee_category = setup_fee_category
        fee_term = setup_fee_term
        
        fee_type = FeeType(
            type_name="Library Fee",
            fee_category_id=fee_category.id,
            fee_status="active",
            fee_term_id=fee_term.id,
            academic_year_id=academic_year.id
        )
        test_db_session.add(fee_type)
        await test_db_session.commit()
        await test_db_session.refresh(fee_type)
        return fee_type

    @pytest.fixture
    async def create_test_mapping(self, test_db_session, setup_class, setup_fee_type, setup_academic_year):
        """Create a test fee class mapping"""
        class_obj = setup_class
        fee_type = setup_fee_type
        academic_year = setup_academic_year
        
        mapping = FeeClassMapping(
            class_id=class_obj.id,
            fee_type_id=fee_type.id,
            total_fee=Decimal("5000.00"),
            academic_year_id=academic_year.id,
            all_by_default=True
        )
        test_db_session.add(mapping)
        await test_db_session.commit()
        await test_db_session.refresh(mapping)
        return mapping

    async def test_create_fee_class_mapping_success(
        self, test_client, setup_class, setup_fee_type, setup_academic_year
    ):
        """Test successful fee class mapping creation"""
        class_obj = setup_class
        fee_type = setup_fee_type
        academic_year = setup_academic_year
        
        payload = {
            "class_id": class_obj.id,
            "fee_type_id": str(fee_type.id),
            "total_fee": "5000.00",
            "academic_year_id": academic_year.id,
            "all_by_default": True
        }
        
        response = await test_client.post("/fee/class-mappings/", json=payload)
        
        assert response.status_code == 201
        data = response.json()
        assert data["class_id"] == class_obj.id
        assert data["fee_type_id"] == str(fee_type.id)
        assert data["total_fee"] == "5000.00"
        assert data["academic_year_id"] == academic_year.id
        assert data["all_by_default"] == True
        assert data["class_name"] == "Grade 1"
        assert data["fee_type_name"] == "Tuition Fee"
        assert data["academic_year_name"] == "2024-2025"

    async def test_create_fee_class_mapping_duplicate_error(
        self, test_client, create_test_mapping, setup_class, setup_fee_type, setup_academic_year
    ):
        """Test duplicate fee class mapping creation error"""
        class_obj = setup_class
        fee_type = setup_fee_type
        academic_year = setup_academic_year
        
        payload = {
            "class_id": class_obj.id,
            "fee_type_id": str(fee_type.id),
            "total_fee": "3000.00",
            "academic_year_id": academic_year.id,
            "all_by_default": False
        }
        
        response = await test_client.post("/fee/class-mappings/", json=payload)
        
        assert response.status_code == 400
        assert "already exists" in response.json()["detail"]

    async def test_create_fee_class_mapping_invalid_class(
        self, test_client, setup_fee_type, setup_academic_year
    ):
        """Test fee class mapping creation with invalid class"""
        fee_type = setup_fee_type
        academic_year = setup_academic_year
        
        payload = {
            "class_id": 9999,  # Non-existent class
            "fee_type_id": str(fee_type.id),
            "total_fee": "5000.00",
            "academic_year_id": academic_year.id,
            "all_by_default": True
        }
        
        response = await test_client.post("/fee/class-mappings/", json=payload)
        
        assert response.status_code == 404
        assert "Class with id 9999 not found" in response.json()["detail"]

    async def test_create_fee_class_mapping_negative_total_fee(
        self, test_client, setup_class, setup_fee_type, setup_academic_year
    ):
        """Test fee class mapping creation with negative total fee"""
        class_obj = setup_class
        fee_type = setup_fee_type
        academic_year = setup_academic_year
        
        payload = {
            "class_id": class_obj.id,
            "fee_type_id": str(fee_type.id),
            "total_fee": "-100.00",
            "academic_year_id": academic_year.id,
            "all_by_default": True
        }
        
        response = await test_client.post("/fee/class-mappings/", json=payload)
        
        assert response.status_code == 422
        assert "total_fee must be non-negative" in str(response.json())

    async def test_get_fee_class_mapping_success(self, test_client, create_test_mapping):
        """Test successful fee class mapping retrieval"""
        mapping = create_test_mapping
        
        response = await test_client.get(f"/fee/class-mappings/{mapping.id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(mapping.id)
        assert data["class_id"] == mapping.class_id
        assert data["fee_type_id"] == str(mapping.fee_type_id)
        assert data["total_fee"] == "5000.00"
        assert data["academic_year_id"] == mapping.academic_year_id
        assert data["all_by_default"] == True
        assert data["class_name"] == "Grade 1"
        assert data["fee_type_name"] == "Tuition Fee"
        assert data["academic_year_name"] == "2024-2025"

    async def test_get_fee_class_mapping_not_found(self, test_client):
        """Test fee class mapping retrieval with non-existent ID"""
        response = await test_client.get("/fee/class-mappings/123e4567-e89b-12d3-a456-426614174000")
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]

    async def test_get_fee_class_mapping_invalid_id(self, test_client):
        """Test fee class mapping retrieval with invalid ID"""
        response = await test_client.get("/fee/class-mappings/invalid-id")
        
        assert response.status_code == 400
        assert "Invalid fee class mapping ID format" in response.json()["detail"]

    async def test_get_all_fee_class_mappings_no_filter(self, test_client, create_test_mapping):
        """Test get all fee class mappings without filters"""
        response = await test_client.get("/fee/class-mappings/")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert any(item["id"] == str(create_test_mapping.id) for item in data)

    async def test_get_all_fee_class_mappings_with_class_filter(
        self, test_client, create_test_mapping, setup_class
    ):
        """Test get all fee class mappings with class filter"""
        class_obj = setup_class
        
        response = await test_client.get(f"/fee/class-mappings/?class_id={class_obj.id}")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert all(item["class_id"] == class_obj.id for item in data)

    async def test_get_all_fee_class_mappings_with_fee_type_filter(
        self, test_client, create_test_mapping, setup_fee_type
    ):
        """Test get all fee class mappings with fee type filter"""
        fee_type = setup_fee_type
        
        response = await test_client.get(f"/fee/class-mappings/?fee_type_id={fee_type.id}")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert all(item["fee_type_id"] == str(fee_type.id) for item in data)

    async def test_get_all_fee_class_mappings_with_all_by_default_filter(
        self, test_client, create_test_mapping
    ):
        """Test get all fee class mappings with all_by_default filter"""
        response = await test_client.get("/fee/class-mappings/?all_by_default=true")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert all(item["all_by_default"] == True for item in data)

    async def test_update_fee_class_mapping_success(
        self, test_client, create_test_mapping
    ):
        """Test successful fee class mapping update"""
        mapping = create_test_mapping
        
        payload = {
            "total_fee": "6000.00",
            "all_by_default": False
        }
        
        response = await test_client.put(f"/fee/class-mappings/{mapping.id}", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(mapping.id)
        assert data["total_fee"] == "6000.00"
        assert data["all_by_default"] == False

    async def test_update_fee_class_mapping_duplicate_error(
        self, test_client, create_test_mapping, setup_second_class, setup_second_fee_type, setup_academic_year
    ):
        """Test update fee class mapping with duplicate combination"""
        # Create another mapping
        second_class = setup_second_class
        second_fee_type = setup_second_fee_type
        academic_year = setup_academic_year
        
        # First create a second mapping
        payload = {
            "class_id": second_class.id,
            "fee_type_id": str(second_fee_type.id),
            "total_fee": "3000.00",
            "academic_year_id": academic_year.id,
            "all_by_default": False
        }
        
        response = await test_client.post("/fee/class-mappings/", json=payload)
        assert response.status_code == 201
        second_mapping_id = response.json()["id"]
        
        # Now try to update the first mapping to have same combination as second
        mapping = create_test_mapping
        
        update_payload = {
            "class_id": second_class.id,
            "fee_type_id": str(second_fee_type.id)
        }
        
        response = await test_client.put(f"/fee/class-mappings/{mapping.id}", json=update_payload)
        
        assert response.status_code == 400
        assert "already exists" in response.json()["detail"]

    async def test_update_fee_class_mapping_not_found(self, test_client):
        """Test update fee class mapping with non-existent ID"""
        payload = {
            "total_fee": "6000.00"
        }
        
        response = await test_client.put(
            "/fee/class-mappings/123e4567-e89b-12d3-a456-426614174000", 
            json=payload
        )
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]

    async def test_delete_fee_class_mapping_success(self, test_client, create_test_mapping):
        """Test successful fee class mapping deletion"""
        mapping = create_test_mapping
        
        response = await test_client.delete(f"/fee/class-mappings/{mapping.id}")
        
        assert response.status_code == 200
        assert "deleted successfully" in response.json()["message"]

    async def test_delete_fee_class_mapping_not_found(self, test_client):
        """Test delete fee class mapping with non-existent ID"""
        response = await test_client.delete("/fee/class-mappings/123e4567-e89b-12d3-a456-426614174000")
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]

    async def test_delete_fee_class_mapping_invalid_id(self, test_client):
        """Test delete fee class mapping with invalid ID"""
        response = await test_client.delete("/fee/class-mappings/invalid-id")
        
        assert response.status_code == 400
        assert "Invalid fee class mapping ID format" in response.json()["detail"]

    async def test_fee_class_mapping_business_logic_validation(
        self, test_client, setup_class, setup_fee_type, setup_academic_year
    ):
        """Test fee class mapping business logic validation"""
        class_obj = setup_class
        fee_type = setup_fee_type
        academic_year = setup_academic_year
        
        # Test with zero fee
        payload = {
            "class_id": class_obj.id,
            "fee_type_id": str(fee_type.id),
            "total_fee": "0.00",
            "academic_year_id": academic_year.id,
            "all_by_default": False
        }
        
        response = await test_client.post("/fee/class-mappings/", json=payload)
        
        assert response.status_code == 201
        data = response.json()
        assert data["total_fee"] == "0.00"