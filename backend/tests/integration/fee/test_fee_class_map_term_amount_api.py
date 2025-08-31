"""
Integration tests for Fee Class Mapping Term Amount API endpoints
"""
import pytest
from datetime import date
from decimal import Decimal

from app.models.masters.academic_year_model import AcademicYear
from app.models.masters.class_model import Class
from app.models.fee.fee_category_model import FeeCategory
from app.models.fee.fee_term_model import FeeTerm
from app.models.fee.fee_term_dates_model import FeeTermDates
from app.models.fee.fee_type_model import FeeType
from app.models.fee.fee_class_mapping_model import FeeClassMapping
from app.models.fee.fee_class_map_term_amount_model import FeeClassMappingTermAmount

class TestFeeClassMappingTermAmountAPI:
    """Test Fee Class Mapping Term Amount API endpoints"""

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
        """Create a fee term with dates for testing"""
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
        
        # Add fee term dates
        term_dates = [
            FeeTermDates(term_id=fee_term.id, fee_term_date=date(2024, 6, 1)),
            FeeTermDates(term_id=fee_term.id, fee_term_date=date(2024, 9, 1)),
            FeeTermDates(term_id=fee_term.id, fee_term_date=date(2024, 12, 1)),
            FeeTermDates(term_id=fee_term.id, fee_term_date=date(2025, 3, 1))
        ]
        
        for term_date in term_dates:
            test_db_session.add(term_date)
        
        await test_db_session.commit()
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
    async def setup_fee_class_mapping(self, test_db_session, setup_class, setup_fee_type, setup_academic_year):
        """Create a fee class mapping for testing"""
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

    async def test_create_fee_class_mapping_term_amounts_success(
        self, test_client, setup_fee_class_mapping, setup_fee_term
    ):
        """Test successful creation of fee class mapping term amounts"""
        mapping = setup_fee_class_mapping
        fee_term = setup_fee_term
        
        # Get the term dates to create proper term amounts
        term_dates_response = await test_client.get(f"/fee/terms/{fee_term.id}")
        assert term_dates_response.status_code == 200
        term_dates = term_dates_response.json()["fee_term_dates"]
        
        # Create term amounts for each term (4 terms, $1250 each = $5000 total)
        term_amounts = []
        for i, term_date in enumerate(term_dates):
            term_amounts.append({
                "term_id": term_date["term_id"],
                "term_amount": "1250.00"
            })
        
        payload = {
            "fee_class_mapping_id": str(mapping.id),
            "term_amounts": term_amounts
        }
        
        response = await test_client.post("/fee/class-mapping-term-amounts/", json=payload)
        
        assert response.status_code == 201
        data = response.json()
        assert len(data) == 4
        assert all(item["term_amount"] == "1250.00" for item in data)
        assert all(item["fee_class_mapping_id"] == str(mapping.id) for item in data)

    async def test_create_fee_class_mapping_term_amounts_wrong_count(
        self, test_client, setup_fee_class_mapping, setup_fee_term
    ):
        """Test creation with wrong number of term amounts"""
        mapping = setup_fee_class_mapping
        fee_term = setup_fee_term
        
        # Get the term dates
        term_dates_response = await test_client.get(f"/fee/terms/{fee_term.id}")
        term_dates = term_dates_response.json()["fee_term_dates"]
        
        # Only provide 2 term amounts when 4 are required
        term_amounts = []
        for i in range(2):
            term_amounts.append({
                "term_id": term_dates[i]["term_id"],
                "term_amount": "2500.00"
            })
        
        payload = {
            "fee_class_mapping_id": str(mapping.id),
            "term_amounts": term_amounts
        }
        
        response = await test_client.post("/fee/class-mapping-term-amounts/", json=payload)
        
        assert response.status_code == 400
        assert "must match number_of_terms" in response.json()["detail"]

    async def test_create_fee_class_mapping_term_amounts_wrong_total(
        self, test_client, setup_fee_class_mapping, setup_fee_term
    ):
        """Test creation with term amounts that don't sum to total fee"""
        mapping = setup_fee_class_mapping
        fee_term = setup_fee_term
        
        # Get the term dates
        term_dates_response = await test_client.get(f"/fee/terms/{fee_term.id}")
        term_dates = term_dates_response.json()["fee_term_dates"]
        
        # Create term amounts that sum to $4000 instead of $5000
        term_amounts = []
        for i, term_date in enumerate(term_dates):
            term_amounts.append({
                "term_id": term_date["term_id"],
                "term_amount": "1000.00"
            })
        
        payload = {
            "fee_class_mapping_id": str(mapping.id),
            "term_amounts": term_amounts
        }
        
        response = await test_client.post("/fee/class-mapping-term-amounts/", json=payload)
        
        assert response.status_code == 400
        assert "must equal total fee" in response.json()["detail"]

    async def test_create_fee_class_mapping_term_amounts_duplicate_terms(
        self, test_client, setup_fee_class_mapping, setup_fee_term
    ):
        """Test creation with duplicate term IDs"""
        mapping = setup_fee_class_mapping
        fee_term = setup_fee_term
        
        # Get the term dates
        term_dates_response = await test_client.get(f"/fee/terms/{fee_term.id}")
        term_dates = term_dates_response.json()["fee_term_dates"]
        
        # Use same term_id twice
        term_amounts = [
            {
                "term_id": term_dates[0]["term_id"],
                "term_amount": "2500.00"
            },
            {
                "term_id": term_dates[0]["term_id"],  # Duplicate
                "term_amount": "2500.00"
            }
        ]
        
        payload = {
            "fee_class_mapping_id": str(mapping.id),
            "term_amounts": term_amounts
        }
        
        response = await test_client.post("/fee/class-mapping-term-amounts/", json=payload)
        
        assert response.status_code == 400
        assert "Duplicate term_id" in response.json()["detail"]

    async def test_create_fee_class_mapping_term_amounts_invalid_mapping_id(
        self, test_client, setup_fee_term
    ):
        """Test creation with invalid fee class mapping ID"""
        fee_term = setup_fee_term
        
        # Get the term dates
        term_dates_response = await test_client.get(f"/fee/terms/{fee_term.id}")
        term_dates = term_dates_response.json()["fee_term_dates"]
        
        term_amounts = []
        for term_date in term_dates:
            term_amounts.append({
                "term_id": term_date["term_id"],
                "term_amount": "1250.00"
            })
        
        payload = {
            "fee_class_mapping_id": "123e4567-e89b-12d3-a456-426614174000",  # Non-existent
            "term_amounts": term_amounts
        }
        
        response = await test_client.post("/fee/class-mapping-term-amounts/", json=payload)
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]

    async def test_update_fee_class_mapping_term_amounts_success(
        self, test_client, setup_fee_class_mapping, setup_fee_term, test_db_session
    ):
        """Test successful update of fee class mapping term amounts"""
        mapping = setup_fee_class_mapping
        fee_term = setup_fee_term
        
        # First create some term amounts
        term_dates_response = await test_client.get(f"/fee/terms/{fee_term.id}")
        term_dates = term_dates_response.json()["fee_term_dates"]
        
        # Create initial term amounts
        initial_term_amounts = []
        for term_date in term_dates:
            term_amount = FeeClassMappingTermAmount(
                fee_class_mapping_id=mapping.id,
                term_id=term_date["term_id"],
                term_amount=Decimal("1250.00")
            )
            test_db_session.add(term_amount)
            initial_term_amounts.append(term_amount)
        
        await test_db_session.commit()
        for term_amount in initial_term_amounts:
            await test_db_session.refresh(term_amount)
        
        # Now update them
        updated_term_amounts = []
        for i, term_amount in enumerate(initial_term_amounts):
            updated_term_amounts.append({
                "id": str(term_amount.id),
                "term_id": str(term_amount.term_id),
                "term_amount": "1250.00"  # Keep same amounts for simplicity
            })
        
        payload = {
            "fee_class_mapping_id": str(mapping.id),
            "term_amounts": updated_term_amounts
        }
        
        response = await test_client.put("/fee/class-mapping-term-amounts/", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 4
        assert all(item["term_amount"] == "1250.00" for item in data)

    async def test_delete_fee_class_mapping_term_amounts_success(
        self, test_client, setup_fee_class_mapping, setup_fee_term, test_db_session
    ):
        """Test successful deletion of fee class mapping term amounts"""
        mapping = setup_fee_class_mapping
        fee_term = setup_fee_term
        
        # First create some term amounts
        term_dates_response = await test_client.get(f"/fee/terms/{fee_term.id}")
        term_dates = term_dates_response.json()["fee_term_dates"]
        
        # Create initial term amounts
        initial_term_amounts = []
        for i, term_date in enumerate(term_dates[:2]):  # Only create 2 for deletion test
            term_amount = FeeClassMappingTermAmount(
                fee_class_mapping_id=mapping.id,
                term_id=term_date["term_id"],
                term_amount=Decimal("2500.00")
            )
            test_db_session.add(term_amount)
            initial_term_amounts.append(term_amount)
        
        await test_db_session.commit()
        for term_amount in initial_term_amounts:
            await test_db_session.refresh(term_amount)
        
        # Delete them
        payload = {
            "term_amount_ids": [str(ta.id) for ta in initial_term_amounts]
        }
        
        response = await test_client.delete("/fee/class-mapping-term-amounts/", json=payload)
        
        assert response.status_code == 200
        assert "Successfully deleted 2 term amount(s)" in response.json()["message"]

    async def test_delete_fee_class_mapping_term_amounts_partial_success(
        self, test_client, setup_fee_class_mapping, setup_fee_term, test_db_session
    ):
        """Test deletion with some non-existent IDs"""
        mapping = setup_fee_class_mapping
        fee_term = setup_fee_term
        
        # Create one term amount
        term_dates_response = await test_client.get(f"/fee/terms/{fee_term.id}")
        term_dates = term_dates_response.json()["fee_term_dates"]
        
        term_amount = FeeClassMappingTermAmount(
            fee_class_mapping_id=mapping.id,
            term_id=term_dates[0]["term_id"],
            term_amount=Decimal("5000.00")
        )
        test_db_session.add(term_amount)
        await test_db_session.commit()
        await test_db_session.refresh(term_amount)
        
        # Try to delete it plus a non-existent one
        payload = {
            "term_amount_ids": [
                str(term_amount.id),
                "123e4567-e89b-12d3-a456-426614174000"  # Non-existent
            ]
        }
        
        response = await test_client.delete("/fee/class-mapping-term-amounts/", json=payload)
        
        assert response.status_code == 200
        assert "Successfully deleted 1 term amount(s)" in response.json()["message"]

    async def test_delete_fee_class_mapping_term_amounts_invalid_id_format(
        self, test_client
    ):
        """Test deletion with invalid ID format"""
        payload = {
            "term_amount_ids": ["invalid-id"]
        }
        
        response = await test_client.delete("/fee/class-mapping-term-amounts/", json=payload)
        
        assert response.status_code == 400
        assert "Invalid term amount ID format" in response.json()["detail"]

    async def test_fee_class_mapping_includes_term_amounts(
        self, test_client, setup_fee_class_mapping, setup_fee_term, test_db_session
    ):
        """Test that fee class mapping GET includes term amounts"""
        mapping = setup_fee_class_mapping
        fee_term = setup_fee_term
        
        # Create some term amounts
        term_dates_response = await test_client.get(f"/fee/terms/{fee_term.id}")
        term_dates = term_dates_response.json()["fee_term_dates"]
        
        for i, term_date in enumerate(term_dates):
            term_amount = FeeClassMappingTermAmount(
                fee_class_mapping_id=mapping.id,
                term_id=term_date["term_id"],
                term_amount=Decimal("1250.00")
            )
            test_db_session.add(term_amount)
        
        await test_db_session.commit()
        
        # Get the fee class mapping
        response = await test_client.get(f"/fee/class-mappings/{mapping.id}")
        
        assert response.status_code == 200
        data = response.json()
        assert "class_fee_mapping_terms" in data
        assert len(data["class_fee_mapping_terms"]) == 4
        assert all(item["term_amount"] == "1250.00" for item in data["class_fee_mapping_terms"])
        assert all("term_name" in item for item in data["class_fee_mapping_terms"])

    async def test_business_logic_validation_in_bulk_operations(
        self, test_client, setup_fee_class_mapping, setup_fee_term
    ):
        """Test business logic validation in bulk operations"""
        mapping = setup_fee_class_mapping
        fee_term = setup_fee_term
        
        # Test with negative amount
        payload = {
            "fee_class_mapping_id": str(mapping.id),
            "term_amounts": [
                {
                    "term_id": str(fee_term.id),
                    "term_amount": "-100.00"
                }
            ]
        }
        
        response = await test_client.post("/fee/class-mapping-term-amounts/", json=payload)
        
        assert response.status_code == 422
        assert "term_amount must be positive" in str(response.json())