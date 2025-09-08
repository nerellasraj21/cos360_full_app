"""
Comprehensive CRUD tests for Fee Category using service layer directly
Tests the service layer functions for complete CRUD coverage
"""
import pytest
from uuid import uuid4, UUID
from datetime import date
from fastapi import HTTPException

from app.models.masters.academic_year_model import AcademicYear
from app.models.fee.fee_category_model import FeeCategory
from app.schemas.fee.fee_category_schema import FeeCategoryCreate, FeeCategoryUpdate
from app.service.fee.fee_category_service import (
    create_fee_category,
    get_fee_category_by_id,
    get_all_fee_categories,
    get_fee_categories_dropdown,
    update_fee_category,
    delete_fee_category,
    validate_academic_year_exists,
    check_category_name_unique
)

class TestFeeCategoryServiceCRUD:
    """Test Fee Category CRUD operations using service layer directly"""

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
    async def setup_second_academic_year(self, test_db_session):
        """Create a second academic year for testing"""
        academic_year = AcademicYear(
            title="2025-2026",
            is_active=True,
            start_date=date(2025, 4, 1),
            end_date=date(2026, 3, 31)
        )
        test_db_session.add(academic_year)
        await test_db_session.commit()
        await test_db_session.refresh(academic_year)
        return academic_year

    @pytest.fixture
    async def setup_fee_category(self, test_db_session, setup_academic_year):
        """Create a fee category for testing"""
        academic_year = setup_academic_year
        category = FeeCategory(
            category_name="Test Category",
            category_status="active",
            academic_year_id=academic_year.id
        )
        test_db_session.add(category)
        await test_db_session.commit()
        await test_db_session.refresh(category)
        return category

    # CREATE Tests
    @pytest.mark.asyncio
    async def test_create_fee_category_service_success(self, test_db_session, setup_academic_year):
        """Test successful fee category creation"""
        category_data = FeeCategoryCreate(
            category_name="Academic Fee",
            category_status="active",
            academic_year_id=academic_year.id
        )
        
        result = await create_fee_category(test_db_session, category_data)
        
        assert result.category_name == "Academic Fee"
        assert result.category_status == "active"
        assert result.academic_year_id == academic_year.id
        assert result.id is not None
        assert isinstance(result.id, UUID)

    @pytest.mark.asyncio
    async def test_create_fee_category_with_default_status(self, test_db_session, academic_year):
        """Test fee category creation with default status"""
        category_data = FeeCategoryCreate(
            category_name="Transport Fee",
            academic_year_id=academic_year.id
            # category_status not provided, should default to 'active'
        )
        
        result = await create_fee_category(test_db_session, category_data)
        
        assert result.category_name == "Transport Fee"
        assert result.category_status == "active"  # Default value

    @pytest.mark.asyncio
    async def test_create_fee_category_invalid_academic_year(self, test_db_session):
        """Test fee category creation with non-existent academic year"""
        non_existent_id = uuid4()
        category_data = FeeCategoryCreate(
            category_name="Invalid Fee",
            category_status="active",
            academic_year_id=non_existent_id
        )
        
        with pytest.raises(HTTPException) as exc_info:
            await create_fee_category(test_db_session, category_data)
        
        assert exc_info.value.status_code == 404
        assert f"Academic year with id {non_existent_id} not found" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_create_fee_category_duplicate_name_same_year(self, test_db_session, fee_category):
        """Test fee category creation with duplicate name in same academic year"""
        category_data = FeeCategoryCreate(
            category_name=fee_category.category_name,  # Same name
            category_status="active",
            academic_year_id=fee_category.academic_year_id  # Same academic year
        )
        
        with pytest.raises(HTTPException) as exc_info:
            await create_fee_category(test_db_session, category_data)
        
        assert exc_info.value.status_code == 400
        assert "already exists for this academic year" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_create_fee_category_same_name_different_year(self, test_db_session, fee_category, second_academic_year):
        """Test fee category creation with same name in different academic year"""
        category_data = FeeCategoryCreate(
            category_name=fee_category.category_name,  # Same name
            category_status="active",
            academic_year_id=second_academic_year.id  # Different academic year
        )
        
        result = await create_fee_category(test_db_session, category_data)
        
        assert result.category_name == fee_category.category_name
        assert result.academic_year_id == second_academic_year.id
        assert result.id != fee_category.id

    # READ Tests
    @pytest.mark.asyncio
    async def test_get_fee_category_by_id_success(self, test_db_session, fee_category):
        """Test successful fee category retrieval by ID"""
        result = await get_fee_category_by_id(test_db_session, fee_category.id)
        
        assert result.id == fee_category.id
        assert result.category_name == fee_category.category_name
        assert result.category_status == fee_category.category_status
        assert result.academic_year_id == fee_category.academic_year_id

    @pytest.mark.asyncio
    async def test_get_fee_category_by_id_not_found(self, test_db_session):
        """Test fee category retrieval with non-existent ID"""
        non_existent_id = uuid4()
        
        with pytest.raises(HTTPException) as exc_info:
            await get_fee_category_by_id(test_db_session, non_existent_id)
        
        assert exc_info.value.status_code == 404
        assert f"Fee category with id {non_existent_id} not found" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_get_all_fee_categories(self, test_db_session, academic_year):
        """Test retrieving all fee categories"""
        # Create multiple categories
        categories_data = [
            FeeCategoryCreate(category_name="Academic Fee", category_status="active", academic_year_id=academic_year.id),
            FeeCategoryCreate(category_name="Transport Fee", category_status="inactive", academic_year_id=academic_year.id),
            FeeCategoryCreate(category_name="Sports Fee", category_status="active", academic_year_id=academic_year.id)
        ]
        
        created_categories = []
        for category_data in categories_data:
            created_category = await create_fee_category(test_db_session, category_data)
            created_categories.append(created_category)
        
        result = await get_all_fee_categories(test_db_session)
        
        assert len(result) >= 3
        category_names = [cat.category_name for cat in result]
        assert "Academic Fee" in category_names
        assert "Transport Fee" in category_names
        assert "Sports Fee" in category_names

    @pytest.mark.asyncio
    async def test_get_fee_categories_dropdown(self, test_db_session, academic_year):
        """Test retrieving fee categories for dropdown"""
        # Create a category
        category_data = FeeCategoryCreate(
            category_name="Academic Fee",
            category_status="active",
            academic_year_id=academic_year.id
        )
        await create_fee_category(test_db_session, category_data)
        
        result = await get_fee_categories_dropdown(test_db_session)
        
        assert len(result) >= 1
        assert hasattr(result[0], 'id')
        assert hasattr(result[0], 'category_name')

    @pytest.mark.asyncio
    async def test_get_fee_categories_dropdown_filtered_by_academic_year(self, test_db_session, academic_year, second_academic_year):
        """Test retrieving fee categories dropdown filtered by academic year"""
        # Create categories in different years
        category1_data = FeeCategoryCreate(
            category_name="Year 1 Fee",
            category_status="active",
            academic_year_id=academic_year.id
        )
        category2_data = FeeCategoryCreate(
            category_name="Year 2 Fee",
            category_status="active",
            academic_year_id=second_academic_year.id
        )
        
        await create_fee_category(test_db_session, category1_data)
        await create_fee_category(test_db_session, category2_data)
        
        # Filter by first academic year
        result = await get_fee_categories_dropdown(test_db_session, academic_year_id=academic_year.id)
        
        category_names = [cat.category_name for cat in result]
        assert "Year 1 Fee" in category_names
        assert "Year 2 Fee" not in category_names

    # UPDATE Tests
    @pytest.mark.asyncio
    async def test_update_fee_category_success(self, test_db_session, fee_category):
        """Test successful fee category update"""
        update_data = FeeCategoryUpdate(
            category_name="Updated Category",
            category_status="inactive"
        )
        
        result = await update_fee_category(test_db_session, fee_category.id, update_data)
        
        assert result.id == fee_category.id
        assert result.category_name == "Updated Category"
        assert result.category_status == "inactive"
        assert result.academic_year_id == fee_category.academic_year_id

    @pytest.mark.asyncio
    async def test_update_fee_category_partial_update(self, test_db_session, fee_category):
        """Test partial fee category update (only category name)"""
        update_data = FeeCategoryUpdate(category_name="Partially Updated")
        
        result = await update_fee_category(test_db_session, fee_category.id, update_data)
        
        assert result.category_name == "Partially Updated"
        assert result.category_status == fee_category.category_status  # Unchanged
        assert result.academic_year_id == fee_category.academic_year_id  # Unchanged

    @pytest.mark.asyncio
    async def test_update_fee_category_not_found(self, test_db_session):
        """Test fee category update with non-existent ID"""
        non_existent_id = uuid4()
        update_data = FeeCategoryUpdate(category_name="Updated")
        
        with pytest.raises(HTTPException) as exc_info:
            await update_fee_category(test_db_session, non_existent_id, update_data)
        
        assert exc_info.value.status_code == 404
        assert f"Fee category with id {non_existent_id} not found" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_update_fee_category_duplicate_name(self, test_db_session, academic_year):
        """Test fee category update with duplicate name in same academic year"""
        # Create two categories
        category1_data = FeeCategoryCreate(
            category_name="Category 1",
            category_status="active",
            academic_year_id=academic_year.id
        )
        category2_data = FeeCategoryCreate(
            category_name="Category 2",
            category_status="active",
            academic_year_id=academic_year.id
        )
        
        category1 = await create_fee_category(test_db_session, category1_data)
        category2 = await create_fee_category(test_db_session, category2_data)
        
        # Try to update category2 to have the same name as category1
        update_data = FeeCategoryUpdate(category_name="Category 1")
        
        with pytest.raises(HTTPException) as exc_info:
            await update_fee_category(test_db_session, category2.id, update_data)
        
        assert exc_info.value.status_code == 400
        assert "already exists for this academic year" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_update_fee_category_academic_year(self, test_db_session, fee_category, second_academic_year):
        """Test updating fee category's academic year"""
        update_data = FeeCategoryUpdate(academic_year_id=second_academic_year.id)
        
        result = await update_fee_category(test_db_session, fee_category.id, update_data)
        
        assert result.academic_year_id == second_academic_year.id
        assert result.category_name == fee_category.category_name  # Unchanged

    @pytest.mark.asyncio
    async def test_update_fee_category_invalid_academic_year(self, test_db_session, fee_category):
        """Test updating fee category with invalid academic year"""
        non_existent_id = uuid4()
        update_data = FeeCategoryUpdate(academic_year_id=non_existent_id)
        
        with pytest.raises(HTTPException) as exc_info:
            await update_fee_category(test_db_session, fee_category.id, update_data)
        
        assert exc_info.value.status_code == 404
        assert f"Academic year with id {non_existent_id} not found" in str(exc_info.value.detail)

    # DELETE Tests
    @pytest.mark.asyncio
    async def test_delete_fee_category_success(self, test_db_session, fee_category):
        """Test successful fee category deletion"""
        result = await delete_fee_category(test_db_session, fee_category.id)
        
        assert "deleted successfully" in result["message"]
        
        # Verify it's actually deleted
        with pytest.raises(HTTPException) as exc_info:
            await get_fee_category_by_id(test_db_session, fee_category.id)
        
        assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_fee_category_not_found(self, test_db_session):
        """Test fee category deletion with non-existent ID"""
        non_existent_id = uuid4()
        
        with pytest.raises(HTTPException) as exc_info:
            await delete_fee_category(test_db_session, non_existent_id)
        
        assert exc_info.value.status_code == 404
        assert f"Fee category with id {non_existent_id} not found" in str(exc_info.value.detail)

    # VALIDATION Helper Tests
    @pytest.mark.asyncio
    async def test_validate_academic_year_exists_success(self, test_db_session, academic_year):
        """Test successful academic year validation"""
        result = await validate_academic_year_exists(test_db_session, academic_year.id)
        
        assert result.id == academic_year.id
        assert result.title == academic_year.title

    @pytest.mark.asyncio
    async def test_validate_academic_year_exists_not_found(self, test_db_session):
        """Test academic year validation with non-existent ID"""
        non_existent_id = uuid4()
        
        with pytest.raises(HTTPException) as exc_info:
            await validate_academic_year_exists(test_db_session, non_existent_id)
        
        assert exc_info.value.status_code == 404
        assert f"Academic year with id {non_existent_id} not found" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_check_category_name_unique_success(self, test_db_session, academic_year):
        """Test category name uniqueness check with unique name"""
        # Should not raise any exception
        await check_category_name_unique(
            test_db_session,
            "Unique Category Name",
            academic_year.id
        )

    @pytest.mark.asyncio
    async def test_check_category_name_unique_duplicate(self, test_db_session, fee_category):
        """Test category name uniqueness check with duplicate name"""
        with pytest.raises(HTTPException) as exc_info:
            await check_category_name_unique(
                test_db_session,
                fee_category.category_name,
                fee_category.academic_year_id
            )
        
        assert exc_info.value.status_code == 400
        assert "already exists for this academic year" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_check_category_name_unique_exclude_self(self, test_db_session, fee_category):
        """Test category name uniqueness check excluding the record being updated"""
        # Should not raise exception when excluding the same record
        await check_category_name_unique(
            test_db_session,
            fee_category.category_name,
            fee_category.academic_year_id,
            exclude_id=fee_category.id
        )

    # Edge Cases
    @pytest.mark.asyncio
    async def test_create_fee_category_empty_name(self, test_db_session, academic_year):
        """Test fee category creation with empty name"""
        category_data = FeeCategoryCreate(
            category_name="",
            category_status="active",
            academic_year_id=academic_year.id
        )
        
        # This should succeed at service level but might fail at validation level
        # depending on schema validation rules
        result = await create_fee_category(test_db_session, category_data)
        assert result.category_name == ""

    @pytest.mark.asyncio
    async def test_create_fee_category_long_name(self, test_db_session, academic_year):
        """Test fee category creation with very long name"""
        long_name = "A" * 150  # Longer than the 100 char limit
        category_data = FeeCategoryCreate(
            category_name=long_name,
            category_status="active",
            academic_year_id=academic_year.id
        )
        
        # This might fail due to database constraints
        with pytest.raises(Exception):  # Could be various types of exceptions
            await create_fee_category(test_db_session, category_data)

    @pytest.mark.asyncio
    async def test_update_all_fields(self, test_db_session, fee_category, second_academic_year):
        """Test updating all fields of a fee category"""
        update_data = FeeCategoryUpdate(
            category_name="Completely Updated Category",
            category_status="inactive",
            academic_year_id=second_academic_year.id
        )
        
        result = await update_fee_category(test_db_session, fee_category.id, update_data)
        
        assert result.category_name == "Completely Updated Category"
        assert result.category_status == "inactive"
        assert result.academic_year_id == second_academic_year.id