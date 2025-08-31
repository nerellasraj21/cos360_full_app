from fastapi import HTTPException, status
import logging as log
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError
from app.models.fee.fee_class_mapping_model import FeeClassMapping as FeeClassMappingModel
from app.models.fee.fee_type_model import FeeType
from app.models.masters.class_model import Class
from app.models.masters.academic_year_model import AcademicYear
from app.schemas.fee.fee_class_mapping_schema import FeeClassMappingCreate, FeeClassMappingUpdate
from typing import List, Optional
from uuid import UUID

log = log.getLogger("fee.class_mapping_service")

async def validate_class_exists(db: AsyncSession, class_id: int):
    """Validate that class exists"""
    result = await db.execute(select(Class).where(Class.id == class_id))
    class_obj = result.scalar_one_or_none()
    if not class_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Class with id {class_id} not found"
        )
    return class_obj

async def validate_fee_type_exists(db: AsyncSession, fee_type_id: str):
    """Validate that fee type exists"""
    try:
        fee_type_uuid = UUID(fee_type_id)
        result = await db.execute(select(FeeType).where(FeeType.id == fee_type_uuid))
        fee_type = result.scalar_one_or_none()
        if not fee_type:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Fee type with id {fee_type_id} not found"
            )
        return fee_type
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid fee type ID format"
        )

async def validate_academic_year_exists(db: AsyncSession, academic_year_id: int):
    """Validate that academic year exists"""
    result = await db.execute(select(AcademicYear).where(AcademicYear.id == academic_year_id))
    academic_year = result.scalar_one_or_none()
    if not academic_year:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Academic year with id {academic_year_id} not found"
        )
    return academic_year

async def check_mapping_unique(db: AsyncSession, class_id: int, fee_type_id: str, academic_year_id: int, exclude_id: Optional[str] = None):
    """Check if mapping is unique for class, fee type, and academic year"""
    try:
        fee_type_uuid = UUID(fee_type_id)
        query = select(FeeClassMappingModel).where(
            and_(
                FeeClassMappingModel.class_id == class_id,
                FeeClassMappingModel.fee_type_id == fee_type_uuid,
                FeeClassMappingModel.academic_year_id == academic_year_id
            )
        )
        
        if exclude_id:
            exclude_uuid = UUID(exclude_id)
            query = query.where(FeeClassMappingModel.id != exclude_uuid)
        
        result = await db.execute(query)
        existing_mapping = result.scalar_one_or_none()
        
        if existing_mapping:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Fee class mapping already exists for this combination of class, fee type, and academic year"
            )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid fee type ID format"
        )

async def create_fee_class_mapping(db: AsyncSession, mapping_data: FeeClassMappingCreate):
    """Create a new fee class mapping"""
    try:
        # Validate all relationships exist
        await validate_class_exists(db, mapping_data.class_id)
        await validate_fee_type_exists(db, mapping_data.fee_type_id)
        await validate_academic_year_exists(db, mapping_data.academic_year_id)
        
        # Check mapping uniqueness
        await check_mapping_unique(
            db,
            mapping_data.class_id,
            mapping_data.fee_type_id,
            mapping_data.academic_year_id
        )
        
        # Create fee class mapping
        db_mapping = FeeClassMappingModel(
            class_id=mapping_data.class_id,
            fee_type_id=UUID(mapping_data.fee_type_id),
            total_fee=mapping_data.total_fee,
            academic_year_id=mapping_data.academic_year_id,
            all_by_default=mapping_data.all_by_default
        )
        
        db.add(db_mapping)
        await db.commit()
        await db.refresh(db_mapping)
        
        # Load with all relationships for response
        result = await db.execute(
            select(FeeClassMappingModel)
            .options(
                selectinload(FeeClassMappingModel.class_ref),
                selectinload(FeeClassMappingModel.fee_type),
                selectinload(FeeClassMappingModel.academic_year),
                selectinload(FeeClassMappingModel.term_amounts).selectinload(FeeClassMappingModel.term_amounts.property.mapper.class_.fee_term)
            )
            .where(FeeClassMappingModel.id == db_mapping.id)
        )
        mapping = result.scalar_one()
        
        # Add relationship names to response
        mapping.class_name = mapping.class_ref.name if mapping.class_ref else None
        mapping.fee_type_name = mapping.fee_type.type_name if mapping.fee_type else None
        mapping.academic_year_name = mapping.academic_year.title if mapping.academic_year else None
        
        # Add term names to term amounts
        if hasattr(mapping, 'term_amounts'):
            for term_amount in mapping.term_amounts:
                term_amount.term_name = term_amount.fee_term.term_name if term_amount.fee_term else None
            mapping.class_fee_mapping_terms = mapping.term_amounts
        else:
            mapping.class_fee_mapping_terms = []
        
        return mapping
        
    except HTTPException:
        await db.rollback()
        raise
    except IntegrityError as e:
        await db.rollback()
        if "uq_class_fee_type_academic_year" in str(e):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Fee class mapping already exists for this combination of class, fee type, and academic year"
            )
        else:
            log.error(f"Integrity error creating fee class mapping: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while creating fee class mapping"
            )
    except Exception as e:
        await db.rollback()
        log.error(f"Error creating fee class mapping: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while creating fee class mapping"
        )

async def get_fee_class_mapping_by_id(db: AsyncSession, mapping_id: str):
    """Get a single fee class mapping by ID with all relationships"""
    try:
        mapping_uuid = UUID(mapping_id)
        result = await db.execute(
            select(FeeClassMappingModel)
            .options(
                selectinload(FeeClassMappingModel.class_ref),
                selectinload(FeeClassMappingModel.fee_type),
                selectinload(FeeClassMappingModel.academic_year),
                selectinload(FeeClassMappingModel.term_amounts).selectinload(FeeClassMappingModel.term_amounts.property.mapper.class_.fee_term)
            )
            .where(FeeClassMappingModel.id == mapping_uuid)
        )
        mapping = result.scalar_one_or_none()
        
        if not mapping:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Fee class mapping with id {mapping_id} not found"
            )
        
        # Add relationship names to response
        mapping.class_name = mapping.class_ref.name if mapping.class_ref else None
        mapping.fee_type_name = mapping.fee_type.type_name if mapping.fee_type else None
        mapping.academic_year_name = mapping.academic_year.title if mapping.academic_year else None
        
        # Add term names to term amounts
        if hasattr(mapping, 'term_amounts'):
            for term_amount in mapping.term_amounts:
                term_amount.term_name = term_amount.fee_term.term_name if term_amount.fee_term else None
            mapping.class_fee_mapping_terms = mapping.term_amounts
        else:
            mapping.class_fee_mapping_terms = []
        
        return mapping
        
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid fee class mapping ID format"
        )
    except Exception as e:
        log.error(f"Error getting fee class mapping: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while retrieving fee class mapping"
        )

async def get_all_fee_class_mappings(
    db: AsyncSession, 
    class_id: Optional[int] = None,
    fee_type_id: Optional[str] = None,
    all_by_default: Optional[bool] = None
):
    """Get all fee class mappings with optional filters"""
    try:
        query = select(FeeClassMappingModel).options(
            selectinload(FeeClassMappingModel.class_ref),
            selectinload(FeeClassMappingModel.fee_type),
            selectinload(FeeClassMappingModel.academic_year),
            selectinload(FeeClassMappingModel.term_amounts).selectinload(FeeClassMappingModel.term_amounts.property.mapper.class_.fee_term)
        )
        
        # Apply filters
        if class_id is not None:
            query = query.where(FeeClassMappingModel.class_id == class_id)
        
        if fee_type_id is not None:
            try:
                fee_type_uuid = UUID(fee_type_id)
                query = query.where(FeeClassMappingModel.fee_type_id == fee_type_uuid)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid fee type ID format"
                )
        
        if all_by_default is not None:
            query = query.where(FeeClassMappingModel.all_by_default == all_by_default)
        
        result = await db.execute(query)
        mappings = result.scalars().all()
        
        # Add relationship names to response
        for mapping in mappings:
            mapping.class_name = mapping.class_ref.name if mapping.class_ref else None
            mapping.fee_type_name = mapping.fee_type.type_name if mapping.fee_type else None
            mapping.academic_year_name = mapping.academic_year.title if mapping.academic_year else None
            
            # Add term names to term amounts
            if hasattr(mapping, 'term_amounts'):
                for term_amount in mapping.term_amounts:
                    term_amount.term_name = term_amount.fee_term.term_name if term_amount.fee_term else None
                mapping.class_fee_mapping_terms = mapping.term_amounts
            else:
                mapping.class_fee_mapping_terms = []
        
        return mappings
        
    except HTTPException:
        raise
    except Exception as e:
        log.error(f"Error getting all fee class mappings: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while retrieving fee class mappings"
        )

async def update_fee_class_mapping(db: AsyncSession, mapping_id: str, mapping_data: FeeClassMappingUpdate):
    """Update an existing fee class mapping"""
    try:
        mapping_uuid = UUID(mapping_id)
        
        # Get existing mapping
        result = await db.execute(
            select(FeeClassMappingModel)
            .options(
                selectinload(FeeClassMappingModel.class_ref),
                selectinload(FeeClassMappingModel.fee_type),
                selectinload(FeeClassMappingModel.academic_year)
            )
            .where(FeeClassMappingModel.id == mapping_uuid)
        )
        db_mapping = result.scalar_one_or_none()
        
        if not db_mapping:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Fee class mapping with id {mapping_id} not found"
            )
        
        # Validate relationships if provided
        if mapping_data.class_id is not None:
            await validate_class_exists(db, mapping_data.class_id)
        if mapping_data.fee_type_id is not None:
            await validate_fee_type_exists(db, mapping_data.fee_type_id)
        if mapping_data.academic_year_id is not None:
            await validate_academic_year_exists(db, mapping_data.academic_year_id)
        
        # Check mapping uniqueness if relevant fields are being updated
        if (mapping_data.class_id is not None or 
            mapping_data.fee_type_id is not None or
            mapping_data.academic_year_id is not None):
            
            new_class_id = mapping_data.class_id or db_mapping.class_id
            new_fee_type_id = mapping_data.fee_type_id or str(db_mapping.fee_type_id)
            new_academic_year_id = mapping_data.academic_year_id or db_mapping.academic_year_id
            
            await check_mapping_unique(
                db,
                new_class_id,
                new_fee_type_id,
                new_academic_year_id,
                exclude_id=mapping_id
            )
        
        # Update mapping fields
        if mapping_data.class_id is not None:
            db_mapping.class_id = mapping_data.class_id
        if mapping_data.fee_type_id is not None:
            db_mapping.fee_type_id = UUID(mapping_data.fee_type_id)
        if mapping_data.total_fee is not None:
            db_mapping.total_fee = mapping_data.total_fee
        if mapping_data.academic_year_id is not None:
            db_mapping.academic_year_id = mapping_data.academic_year_id
        if mapping_data.all_by_default is not None:
            db_mapping.all_by_default = mapping_data.all_by_default
        
        await db.commit()
        await db.refresh(db_mapping)
        
        # Load updated mapping with all relationships
        result = await db.execute(
            select(FeeClassMappingModel)
            .options(
                selectinload(FeeClassMappingModel.class_ref),
                selectinload(FeeClassMappingModel.fee_type),
                selectinload(FeeClassMappingModel.academic_year),
                selectinload(FeeClassMappingModel.term_amounts).selectinload(FeeClassMappingModel.term_amounts.property.mapper.class_.fee_term)
            )
            .where(FeeClassMappingModel.id == db_mapping.id)
        )
        updated_mapping = result.scalar_one()
        
        # Add relationship names to response
        updated_mapping.class_name = updated_mapping.class_ref.name if updated_mapping.class_ref else None
        updated_mapping.fee_type_name = updated_mapping.fee_type.type_name if updated_mapping.fee_type else None
        updated_mapping.academic_year_name = updated_mapping.academic_year.title if updated_mapping.academic_year else None
        
        return updated_mapping
        
    except HTTPException:
        await db.rollback()
        raise
    except ValueError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid fee class mapping ID format"
        )
    except IntegrityError as e:
        await db.rollback()
        if "uq_class_fee_type_academic_year" in str(e):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Fee class mapping already exists for this combination of class, fee type, and academic year"
            )
        else:
            log.error(f"Integrity error updating fee class mapping: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while updating fee class mapping"
            )
    except Exception as e:
        await db.rollback()
        log.error(f"Error updating fee class mapping: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while updating fee class mapping"
        )

async def delete_fee_class_mapping(db: AsyncSession, mapping_id: str):
    """Delete a fee class mapping"""
    try:
        mapping_uuid = UUID(mapping_id)
        
        result = await db.execute(select(FeeClassMappingModel).where(FeeClassMappingModel.id == mapping_uuid))
        db_mapping = result.scalar_one_or_none()
        
        if not db_mapping:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Fee class mapping with id {mapping_id} not found"
            )
        
        await db.delete(db_mapping)
        await db.commit()
        return {"message": "Fee class mapping deleted successfully"}
        
    except HTTPException:
        await db.rollback()
        raise
    except ValueError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid fee class mapping ID format"
        )
    except Exception as e:
        await db.rollback()
        log.error(f"Error deleting fee class mapping: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while deleting fee class mapping"
        )