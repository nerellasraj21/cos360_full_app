import logging as log
from typing import Union
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.fee.fee_category_model import FeeCategory
from app.models.fee.fee_term_model import FeeTerm
from app.models.fee.fee_type_model import FeeType as FeeTypeModel
from app.models.masters.academic_year_model import AcademicYear
from app.schemas.fee.fee_type_schema import FeeTypeCreate, FeeTypeUpdate
from app.tools.cache_utils import cache_dropdown, invalidate_cache

log = log.getLogger("fee.type_service")


async def validate_academic_year_exists(db: AsyncSession, academic_year_id: UUID):
    """Validate that academic year exists"""
    result = await db.execute(select(AcademicYear).where(AcademicYear.id == academic_year_id))
    academic_year = result.scalar_one_or_none()
    if not academic_year:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Academic year with id {academic_year_id} not found"
        )
    return academic_year


async def validate_fee_category_exists(db: AsyncSession, fee_category_id: UUID):
    """Validate that fee category exists"""
    try:
        result = await db.execute(select(FeeCategory).where(FeeCategory.id == fee_category_id))
        fee_category = result.scalar_one_or_none()
        if not fee_category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail=f"Fee category with id {fee_category_id} not found"
            )
        return fee_category
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid fee category ID format")


async def validate_fee_term_exists(db: AsyncSession, fee_term_id: UUID):
    """Validate that fee term exists"""
    try:
        result = await db.execute(select(FeeTerm).where(FeeTerm.id == fee_term_id))
        fee_term = result.scalar_one_or_none()
        if not fee_term:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail=f"Fee term with id {fee_term_id} not found"
            )
        return fee_term
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid fee term ID format")


async def check_type_name_unique(
    db: AsyncSession, type_name: str, fee_category_id: UUID, exclude_id: Union[UUID, str] | None = None
):
    """Check if type name is unique within fee category"""
    try:
        query = select(FeeTypeModel).where(
            FeeTypeModel.type_name == type_name, FeeTypeModel.fee_category_id == fee_category_id
        )

        if exclude_id:
            # Handle both UUID objects and string UUIDs
            if isinstance(exclude_id, str):
                exclude_uuid = UUID(exclude_id)
            else:
                exclude_uuid = exclude_id
            query = query.where(FeeTypeModel.id != exclude_uuid)

        result = await db.execute(query)
        existing_type = result.scalar_one_or_none()

        if existing_type:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Fee type name '{type_name}' already exists for this fee category",
            )
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid fee category ID format")


async def create_fee_type(db: AsyncSession, fee_type_data: FeeTypeCreate):
    """Create a new fee type"""
    try:
        # Validate all relationships exist
        await validate_academic_year_exists(db, fee_type_data.academic_year_id)
        await validate_fee_category_exists(db, fee_type_data.fee_category_id)
        await validate_fee_term_exists(db, fee_type_data.fee_term_id)

        # Check type name uniqueness within fee category
        await check_type_name_unique(db, fee_type_data.type_name, fee_type_data.fee_category_id)

        # Create fee type
        db_fee_type = FeeTypeModel(
            type_name=fee_type_data.type_name,
            fee_category_id=fee_type_data.fee_category_id,
            fee_status=fee_type_data.fee_status,
            fee_term_id=fee_type_data.fee_term_id,
            academic_year_id=fee_type_data.academic_year_id,
        )

        db.add(db_fee_type)
        await db.flush()

        # Load with all relationships for response before commit
        result = await db.execute(
            select(FeeTypeModel)
            .options(
                selectinload(FeeTypeModel.fee_category),
                selectinload(FeeTypeModel.fee_term).selectinload(FeeTerm.fee_term_dates),
                selectinload(FeeTypeModel.academic_year),
            )
            .where(FeeTypeModel.id == db_fee_type.id)
        )
        fee_type = result.scalar_one()

        await db.commit()

        # Invalidate cache after creating new fee type
        invalidate_cache("dropdown", "fee_types")

        # Add relationship names to response
        fee_type.fee_category_name = fee_type.fee_category.category_name if fee_type.fee_category else None
        fee_type.fee_term_name = fee_type.fee_term.term_name if fee_type.fee_term else None
        fee_type.academic_year_name = fee_type.academic_year.title if fee_type.academic_year else None
        fee_type.fee_term_dates = fee_type.fee_term.fee_term_dates if fee_type.fee_term else []

        return fee_type

    except HTTPException:
        await db.rollback()
        raise
    except IntegrityError as e:
        await db.rollback()
        if "uq_type_name_fee_category" in str(e):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Fee type name '{fee_type_data.type_name}' already exists for this fee category",
            )
        else:
            log.error(f"Integrity error creating fee type: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Integrity error creating fee type: {str(e)}"
            )
    except Exception as e:
        await db.rollback()
        log.error(f"Error creating fee type: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred while creating fee type"
        )


async def get_fee_type_by_id(db: AsyncSession, fee_type_id: UUID):
    """Get a single fee type by ID with all relationships"""
    try:
        result = await db.execute(
            select(FeeTypeModel)
            .options(
                selectinload(FeeTypeModel.fee_category),
                selectinload(FeeTypeModel.fee_term).selectinload(FeeTerm.fee_term_dates),
                selectinload(FeeTypeModel.academic_year),
            )
            .where(FeeTypeModel.id == fee_type_id)
        )
        fee_type = result.scalar_one_or_none()

        if not fee_type:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail=f"Fee type with id {fee_type_id} not found"
            )

        # Add relationship names to response
        fee_type.fee_category_name = fee_type.fee_category.category_name if fee_type.fee_category else None
        fee_type.fee_term_name = fee_type.fee_term.term_name if fee_type.fee_term else None
        fee_type.academic_year_name = fee_type.academic_year.title if fee_type.academic_year else None
        fee_type.fee_term_dates = fee_type.fee_term.fee_term_dates if fee_type.fee_term else []

        return fee_type

    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid fee type ID format")
    except Exception as e:
        log.error(f"Error getting fee type: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred while retrieving fee type"
        )


async def get_all_fee_types(db: AsyncSession, limit: int = 50, offset: int = 0):
    """Get all fee types with all relationships and pagination"""
    try:
        result = await db.execute(
            select(FeeTypeModel)
            .options(
                selectinload(FeeTypeModel.fee_category),
                selectinload(FeeTypeModel.fee_term).selectinload(FeeTerm.fee_term_dates),
                selectinload(FeeTypeModel.academic_year),
            )
            .limit(limit)
            .offset(offset)
        )
        fee_types = result.scalars().all()

        # Add relationship names to response
        for fee_type in fee_types:
            fee_type.fee_category_name = fee_type.fee_category.category_name if fee_type.fee_category else None
            fee_type.fee_term_name = fee_type.fee_term.term_name if fee_type.fee_term else None
            fee_type.academic_year_name = fee_type.academic_year.title if fee_type.academic_year else None
            fee_type.fee_term_dates = fee_type.fee_term.fee_term_dates if fee_type.fee_term else []

        return fee_types

    except Exception as e:
        log.error(f"Error getting all fee types: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred while retrieving fee types"
        )


@cache_dropdown(ttl=300)  # Cache for 5 minutes
async def get_fee_types_dropdown(db: AsyncSession, fee_category_id: str | None = None):
    """Get fee types for dropdown (id + type_name only) - Cached"""
    try:
        query = select(FeeTypeModel)

        if fee_category_id:
            fee_category_uuid = UUID(fee_category_id)
            query = query.where(FeeTypeModel.fee_category_id == fee_category_uuid)

        result = await db.execute(query)
        fee_types = result.scalars().all()

        log.debug(f"Retrieved {len(fee_types)} fee types from database")
        return fee_types

    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid fee category ID format")
    except Exception as e:
        log.error(f"Error getting fee types dropdown: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while retrieving fee types for dropdown",
        )


async def update_fee_type(db: AsyncSession, fee_type_id: UUID, fee_type_data: FeeTypeUpdate):
    """Update an existing fee type"""
    try:
        # Get existing fee type
        result = await db.execute(
            select(FeeTypeModel)
            .options(
                selectinload(FeeTypeModel.fee_category),
                selectinload(FeeTypeModel.fee_term).selectinload(FeeTerm.fee_term_dates),
                selectinload(FeeTypeModel.academic_year),
            )
            .where(FeeTypeModel.id == fee_type_id)
        )
        db_fee_type = result.scalar_one_or_none()

        if not db_fee_type:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail=f"Fee type with id {fee_type_id} not found"
            )

        # Validate relationships if provided
        if fee_type_data.academic_year_id is not None:
            await validate_academic_year_exists(db, fee_type_data.academic_year_id)
        if fee_type_data.fee_category_id is not None:
            await validate_fee_category_exists(db, fee_type_data.fee_category_id)
        if fee_type_data.fee_term_id is not None:
            await validate_fee_term_exists(db, fee_type_data.fee_term_id)

        # Check type name uniqueness if type_name or fee_category_id is being updated
        if fee_type_data.type_name is not None or fee_type_data.fee_category_id is not None:

            new_type_name = fee_type_data.type_name or db_fee_type.type_name
            new_fee_category_id = fee_type_data.fee_category_id or db_fee_type.fee_category_id

            await check_type_name_unique(db, new_type_name, new_fee_category_id, exclude_id=fee_type_id)

        # Update fee type fields
        if fee_type_data.type_name is not None:
            db_fee_type.type_name = fee_type_data.type_name
        if fee_type_data.fee_category_id is not None:
            db_fee_type.fee_category_id = fee_type_data.fee_category_id
        if fee_type_data.fee_status is not None:
            db_fee_type.fee_status = fee_type_data.fee_status
        if fee_type_data.fee_term_id is not None:
            db_fee_type.fee_term_id = fee_type_data.fee_term_id
        if fee_type_data.academic_year_id is not None:
            db_fee_type.academic_year_id = fee_type_data.academic_year_id

        await db.flush()

        # Load updated fee type with all relationships before commit
        result = await db.execute(
            select(FeeTypeModel)
            .options(
                selectinload(FeeTypeModel.fee_category),
                selectinload(FeeTypeModel.fee_term).selectinload(FeeTerm.fee_term_dates),
                selectinload(FeeTypeModel.academic_year),
            )
            .where(FeeTypeModel.id == db_fee_type.id)
        )
        updated_type = result.scalar_one()

        await db.commit()

        # Invalidate cache after updating fee type
        invalidate_cache("dropdown", "fee_types")

        # Add relationship names to response
        updated_type.fee_category_name = updated_type.fee_category.category_name if updated_type.fee_category else None
        updated_type.fee_term_name = updated_type.fee_term.term_name if updated_type.fee_term else None
        updated_type.academic_year_name = updated_type.academic_year.title if updated_type.academic_year else None
        updated_type.fee_term_dates = updated_type.fee_term.fee_term_dates if updated_type.fee_term else []

        return updated_type

    except HTTPException:
        await db.rollback()
        raise
    except ValueError:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid fee type ID format")
    except IntegrityError as e:
        await db.rollback()
        if "uq_type_name_fee_category" in str(e):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Fee type name already exists for this fee category"
            )
        else:
            log.error(f"Integrity error updating fee type: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred while updating fee type"
            )
    except Exception as e:
        await db.rollback()
        log.error(f"Error updating fee type: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred while updating fee type"
        )


async def delete_fee_type(db: AsyncSession, fee_type_id: UUID):
    """Delete a fee type"""
    try:
        result = await db.execute(select(FeeTypeModel).where(FeeTypeModel.id == fee_type_id))
        db_fee_type = result.scalar_one_or_none()

        if not db_fee_type:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail=f"Fee type with id {fee_type_id} not found"
            )

        # Check if fee type is in use by fee class mappings
        from sqlalchemy import func

        from app.models.fee.fee_class_mapping_model import FeeClassMapping

        fee_class_count = await db.execute(
            select(func.count(FeeClassMapping.id)).where(FeeClassMapping.fee_type_id == fee_type_id)
        )
        fee_class_dependencies = fee_class_count.scalar()

        # Check if fee type is in use by fee student mappings
        from app.models.fee.fee_student_mapping_model import FeeStudentMapping

        fee_student_count = await db.execute(
            select(func.count(FeeStudentMapping.id)).where(FeeStudentMapping.fee_type_id == fee_type_id)
        )
        fee_student_dependencies = fee_student_count.scalar()

        # Calculate total dependencies
        total_dependencies = fee_class_dependencies + fee_student_dependencies

        if total_dependencies > 0:
            dependency_details = []
            if fee_class_dependencies > 0:
                dependency_details.append(f"{fee_class_dependencies} fee class mapping(s)")
            if fee_student_dependencies > 0:
                dependency_details.append(f"{fee_student_dependencies} fee student mapping(s)")

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete fee type '{db_fee_type.type_name}' because it is being used by {total_dependencies} record(s): {', '.join(dependency_details)}. Please reassign or delete the dependent records first.",
            )

        await db.delete(db_fee_type)
        await db.commit()

        # Invalidate cache after deleting fee type
        invalidate_cache("dropdown", "fee_types")

        return {"message": "Fee type deleted successfully"}

    except HTTPException:
        await db.rollback()
        raise
    except ValueError:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid fee type ID format")
    except Exception as e:
        await db.rollback()
        log.error(f"Error deleting fee type: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred while deleting fee type"
        )
