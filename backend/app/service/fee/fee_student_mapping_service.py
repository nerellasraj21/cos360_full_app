from fastapi import HTTPException, status
import logging as log
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError
from app.models.fee.fee_student_mapping_model import FeeStudentMapping as FeeStudentMappingModel
from app.models.fee.fee_student_map_term_amount_model import FeeStudentMapTermAmount as FeeStudentMapTermAmountModel
from app.models.fee.fee_type_model import FeeType
from app.models.fee.fee_term_model import FeeTerm
from app.models.student.student_model import Student
from app.models.masters.admission_model import Admission
from app.models.masters.class_model import Class
from app.models.masters.sections_model import Section
from app.models.masters.academic_year_model import AcademicYear
from app.schemas.fee.fee_student_mapping_schema import FeeStudentMappingCreate, FeeStudentMappingUpdate
from typing import List, Optional
from uuid import UUID
from decimal import Decimal

log = log.getLogger("fee.student_mapping_service")

async def validate_student_exists(db: AsyncSession, student_id: int):
    """Validate that student exists"""
    result = await db.execute(select(Student).where(Student.id == student_id))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with id {student_id} not found"
        )
    return student

async def validate_admission_exists(db: AsyncSession, admission_number: str):
    """Validate that admission exists"""
    result = await db.execute(select(Admission).where(Admission.admission_number == admission_number))
    admission = result.scalar_one_or_none()
    if not admission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Admission with number {admission_number} not found"
        )
    return admission

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

async def validate_section_exists(db: AsyncSession, section_id: int):
    """Validate that section exists"""
    result = await db.execute(select(Section).where(Section.id == section_id))
    section = result.scalar_one_or_none()
    if not section:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Section with id {section_id} not found"
        )
    return section

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

async def check_mapping_unique(db: AsyncSession, student_id: int, fee_type_id: str, academic_year_id: int, exclude_id: Optional[str] = None):
    """Check if mapping is unique for student, fee type, and academic year"""
    try:
        fee_type_uuid = UUID(fee_type_id)
        query = select(FeeStudentMappingModel).where(
            and_(
                FeeStudentMappingModel.student_id == student_id,
                FeeStudentMappingModel.fee_type_id == fee_type_uuid,
                FeeStudentMappingModel.academic_year_id == academic_year_id
            )
        )
        
        if exclude_id:
            exclude_uuid = UUID(exclude_id)
            query = query.where(FeeStudentMappingModel.id != exclude_uuid)
        
        result = await db.execute(query)
        existing_mapping = result.scalar_one_or_none()
        
        if existing_mapping:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Fee student mapping already exists for this combination of student, fee type, and academic year"
            )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid fee type ID format"
        )

async def get_fee_terms_for_type(db: AsyncSession, fee_type_id: str):
    """Get fee terms specific to the fee type"""
    try:
        fee_type_uuid = UUID(fee_type_id)
        result = await db.execute(
            select(FeeType).options(selectinload(FeeType.fee_term)).where(FeeType.id == fee_type_uuid)
        )
        fee_type = result.scalar_one_or_none()
        if not fee_type or not fee_type.fee_term:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Fee type has no associated fee term"
            )
        
        # Get terms from the fee_term associated with the fee_type
        result = await db.execute(
            select(FeeTerm).where(FeeTerm.id == fee_type.fee_term.id)
        )
        fee_term = result.scalar_one()
        
        # Get individual terms - this should get all terms for the same academic year and term group
        # For now, we'll assume we divide equally across the number_of_terms
        return fee_term
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid fee type ID format"
        )

async def create_term_amounts(db: AsyncSession, fee_student_mapping_id: str, total_fee: Decimal, fee_type_id: str):
    """Create term amounts based on fee type terms"""
    fee_term = await get_fee_terms_for_type(db, fee_type_id)
    
    # Calculate amount per term
    amount_per_term = total_fee / fee_term.number_of_terms
    
    # Create term amounts for each term
    term_amounts = []
    for i in range(fee_term.number_of_terms):
        term_amount = FeeStudentMapTermAmountModel(
            fee_student_map_id=UUID(fee_student_mapping_id),
            term_amount=amount_per_term,
            term_id=fee_term.id
        )
        db.add(term_amount)
        term_amounts.append(term_amount)
    
    return term_amounts

async def get_student_details(db: AsyncSession, student_id: int, admission_number: str, class_id: int, section_id: int):
    """Get comprehensive student details"""
    # Get student
    result = await db.execute(select(Student).where(Student.id == student_id))
    student = result.scalar_one()
    
    # Get class
    result = await db.execute(select(Class).where(Class.id == class_id))
    class_obj = result.scalar_one()
    
    # Get section
    result = await db.execute(select(Section).where(Section.id == section_id))
    section_obj = result.scalar_one()
    
    return {
        "student_id": student.id,
        "student_name": f"{student.first_name} {student.last_name}",
        "student_admission_number": admission_number,
        "student_class": {"id": class_obj.id, "name": class_obj.name},
        "student_section": {"id": section_obj.id, "name": section_obj.name}
    }

async def create_fee_student_mapping(db: AsyncSession, mapping_data: FeeStudentMappingCreate):
    """Create a new fee student mapping with term amounts"""
    try:
        # Validate all relationships exist
        await validate_student_exists(db, mapping_data.student_id)
        await validate_admission_exists(db, mapping_data.student_admission_num)
        await validate_class_exists(db, mapping_data.class_id)
        await validate_section_exists(db, mapping_data.section_id)
        fee_type = await validate_fee_type_exists(db, mapping_data.fee_type_id)
        await validate_academic_year_exists(db, mapping_data.academic_year_id)
        
        # Check mapping uniqueness
        await check_mapping_unique(
            db,
            mapping_data.student_id,
            mapping_data.fee_type_id,
            mapping_data.academic_year_id
        )
        
        # Create fee student mapping
        db_mapping = FeeStudentMappingModel(
            student_id=mapping_data.student_id,
            student_admission_num=mapping_data.student_admission_num,
            class_id=mapping_data.class_id,
            section_id=mapping_data.section_id,
            fee_type_id=UUID(mapping_data.fee_type_id),
            total_fee=mapping_data.total_fee,
            academic_year_id=mapping_data.academic_year_id
        )
        
        db.add(db_mapping)
        await db.flush()  # Get the ID for term amounts
        
        # Create term amounts
        await create_term_amounts(db, str(db_mapping.id), mapping_data.total_fee, mapping_data.fee_type_id)
        
        await db.commit()
        await db.refresh(db_mapping)
        
        # Load with all relationships for response
        result = await db.execute(
            select(FeeStudentMappingModel)
            .options(
                selectinload(FeeStudentMappingModel.student),
                selectinload(FeeStudentMappingModel.class_ref),
                selectinload(FeeStudentMappingModel.section),
                selectinload(FeeStudentMappingModel.fee_type),
                selectinload(FeeStudentMappingModel.academic_year),
                selectinload(FeeStudentMappingModel.term_amounts).selectinload(FeeStudentMapTermAmountModel.fee_term)
            )
            .where(FeeStudentMappingModel.id == db_mapping.id)
        )
        mapping = result.scalar_one()
        
        # Add relationship names and student details
        mapping.fee_type_name = mapping.fee_type.type_name if mapping.fee_type else None
        mapping.academic_year_name = mapping.academic_year.title if mapping.academic_year else None
        
        # Add student details
        mapping.student_details = await get_student_details(
            db, mapping.student_id, mapping.student_admission_num, mapping.class_id, mapping.section_id
        )
        
        # Add term names to term amounts
        if hasattr(mapping, 'term_amounts'):
            for term_amount in mapping.term_amounts:
                term_amount.term_name = term_amount.fee_term.term_name if term_amount.fee_term else None
            mapping.student_fee_mapping_terms = mapping.term_amounts
        else:
            mapping.student_fee_mapping_terms = []
        
        return mapping
        
    except HTTPException:
        await db.rollback()
        raise
    except IntegrityError as e:
        await db.rollback()
        if "uq_student_fee_type_academic_year" in str(e):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Fee student mapping already exists for this combination of student, fee type, and academic year"
            )
        else:
            log.error(f"Integrity error creating fee student mapping: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while creating fee student mapping"
            )
    except Exception as e:
        await db.rollback()
        log.error(f"Error creating fee student mapping: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while creating fee student mapping"
        )

async def get_fee_student_mapping_by_id(db: AsyncSession, mapping_id: str):
    """Get a single fee student mapping by ID with all relationships"""
    try:
        mapping_uuid = UUID(mapping_id)
        result = await db.execute(
            select(FeeStudentMappingModel)
            .options(
                selectinload(FeeStudentMappingModel.student),
                selectinload(FeeStudentMappingModel.class_ref),
                selectinload(FeeStudentMappingModel.section),
                selectinload(FeeStudentMappingModel.fee_type),
                selectinload(FeeStudentMappingModel.academic_year),
                selectinload(FeeStudentMappingModel.term_amounts).selectinload(FeeStudentMapTermAmountModel.fee_term)
            )
            .where(FeeStudentMappingModel.id == mapping_uuid)
        )
        mapping = result.scalar_one_or_none()
        
        if not mapping:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Fee student mapping with id {mapping_id} not found"
            )
        
        # Add relationship names and student details
        mapping.fee_type_name = mapping.fee_type.type_name if mapping.fee_type else None
        mapping.academic_year_name = mapping.academic_year.title if mapping.academic_year else None
        
        # Add student details
        mapping.student_details = await get_student_details(
            db, mapping.student_id, mapping.student_admission_num, mapping.class_id, mapping.section_id
        )
        
        # Add term names to term amounts
        if hasattr(mapping, 'term_amounts'):
            for term_amount in mapping.term_amounts:
                term_amount.term_name = term_amount.fee_term.term_name if term_amount.fee_term else None
            mapping.student_fee_mapping_terms = mapping.term_amounts
        else:
            mapping.student_fee_mapping_terms = []
        
        return mapping
        
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid fee student mapping ID format"
        )
    except Exception as e:
        log.error(f"Error getting fee student mapping: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while retrieving fee student mapping"
        )

async def get_all_fee_student_mappings(
    db: AsyncSession, 
    student_id: Optional[int] = None,
    class_id: Optional[int] = None,
    section_id: Optional[int] = None,
    fee_type_id: Optional[str] = None,
    academic_year_id: Optional[int] = None
):
    """Get all fee student mappings with optional filters"""
    try:
        query = select(FeeStudentMappingModel).options(
            selectinload(FeeStudentMappingModel.student),
            selectinload(FeeStudentMappingModel.class_ref),
            selectinload(FeeStudentMappingModel.section),
            selectinload(FeeStudentMappingModel.fee_type),
            selectinload(FeeStudentMappingModel.academic_year),
            selectinload(FeeStudentMappingModel.term_amounts).selectinload(FeeStudentMapTermAmountModel.fee_term)
        )
        
        # Apply filters
        if student_id is not None:
            query = query.where(FeeStudentMappingModel.student_id == student_id)
        
        if class_id is not None:
            query = query.where(FeeStudentMappingModel.class_id == class_id)
            
        if section_id is not None:
            query = query.where(FeeStudentMappingModel.section_id == section_id)
        
        if fee_type_id is not None:
            try:
                fee_type_uuid = UUID(fee_type_id)
                query = query.where(FeeStudentMappingModel.fee_type_id == fee_type_uuid)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid fee type ID format"
                )
        
        if academic_year_id is not None:
            query = query.where(FeeStudentMappingModel.academic_year_id == academic_year_id)
        
        result = await db.execute(query)
        mappings = result.scalars().all()
        
        # Add relationship names and student details for each mapping
        for mapping in mappings:
            mapping.fee_type_name = mapping.fee_type.type_name if mapping.fee_type else None
            mapping.academic_year_name = mapping.academic_year.title if mapping.academic_year else None
            
            # Add student details
            mapping.student_details = await get_student_details(
                db, mapping.student_id, mapping.student_admission_num, mapping.class_id, mapping.section_id
            )
            
            # Add term names to term amounts
            if hasattr(mapping, 'term_amounts'):
                for term_amount in mapping.term_amounts:
                    term_amount.term_name = term_amount.fee_term.term_name if term_amount.fee_term else None
                mapping.student_fee_mapping_terms = mapping.term_amounts
            else:
                mapping.student_fee_mapping_terms = []
        
        return mappings
        
    except HTTPException:
        raise
    except Exception as e:
        log.error(f"Error getting all fee student mappings: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while retrieving fee student mappings"
        )

async def update_fee_student_mapping(db: AsyncSession, mapping_id: str, mapping_data: FeeStudentMappingUpdate):
    """Update an existing fee student mapping"""
    try:
        mapping_uuid = UUID(mapping_id)
        
        # Get existing mapping
        result = await db.execute(
            select(FeeStudentMappingModel)
            .options(selectinload(FeeStudentMappingModel.term_amounts))
            .where(FeeStudentMappingModel.id == mapping_uuid)
        )
        db_mapping = result.scalar_one_or_none()
        
        if not db_mapping:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Fee student mapping with id {mapping_id} not found"
            )
        
        # Validate relationships if provided
        if mapping_data.student_id is not None:
            await validate_student_exists(db, mapping_data.student_id)
        if mapping_data.student_admission_num is not None:
            await validate_admission_exists(db, mapping_data.student_admission_num)
        if mapping_data.class_id is not None:
            await validate_class_exists(db, mapping_data.class_id)
        if mapping_data.section_id is not None:
            await validate_section_exists(db, mapping_data.section_id)
        if mapping_data.fee_type_id is not None:
            await validate_fee_type_exists(db, mapping_data.fee_type_id)
        if mapping_data.academic_year_id is not None:
            await validate_academic_year_exists(db, mapping_data.academic_year_id)
        
        # Check mapping uniqueness if relevant fields are being updated
        if (mapping_data.student_id is not None or 
            mapping_data.fee_type_id is not None or
            mapping_data.academic_year_id is not None):
            
            new_student_id = mapping_data.student_id or db_mapping.student_id
            new_fee_type_id = mapping_data.fee_type_id or str(db_mapping.fee_type_id)
            new_academic_year_id = mapping_data.academic_year_id or db_mapping.academic_year_id
            
            await check_mapping_unique(
                db,
                new_student_id,
                new_fee_type_id,
                new_academic_year_id,
                exclude_id=mapping_id
            )
        
        # Update mapping fields
        if mapping_data.student_id is not None:
            db_mapping.student_id = mapping_data.student_id
        if mapping_data.student_admission_num is not None:
            db_mapping.student_admission_num = mapping_data.student_admission_num
        if mapping_data.class_id is not None:
            db_mapping.class_id = mapping_data.class_id
        if mapping_data.section_id is not None:
            db_mapping.section_id = mapping_data.section_id
        if mapping_data.fee_type_id is not None:
            db_mapping.fee_type_id = UUID(mapping_data.fee_type_id)
        if mapping_data.total_fee is not None:
            db_mapping.total_fee = mapping_data.total_fee
            
            # If total fee is updated, update term amounts
            for term_amount in db_mapping.term_amounts:
                await db.delete(term_amount)
            
            # Create new term amounts
            new_fee_type_id = mapping_data.fee_type_id or str(db_mapping.fee_type_id)
            await create_term_amounts(db, str(db_mapping.id), mapping_data.total_fee, new_fee_type_id)
            
        if mapping_data.academic_year_id is not None:
            db_mapping.academic_year_id = mapping_data.academic_year_id
        
        await db.commit()
        await db.refresh(db_mapping)
        
        # Return updated mapping
        return await get_fee_student_mapping_by_id(db, mapping_id)
        
    except HTTPException:
        await db.rollback()
        raise
    except ValueError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid fee student mapping ID format"
        )
    except IntegrityError as e:
        await db.rollback()
        if "uq_student_fee_type_academic_year" in str(e):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Fee student mapping already exists for this combination of student, fee type, and academic year"
            )
        else:
            log.error(f"Integrity error updating fee student mapping: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while updating fee student mapping"
            )
    except Exception as e:
        await db.rollback()
        log.error(f"Error updating fee student mapping: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while updating fee student mapping"
        )

async def delete_fee_student_mapping(db: AsyncSession, mapping_id: str):
    """Delete a fee student mapping"""
    try:
        mapping_uuid = UUID(mapping_id)
        
        result = await db.execute(select(FeeStudentMappingModel).where(FeeStudentMappingModel.id == mapping_uuid))
        db_mapping = result.scalar_one_or_none()
        
        if not db_mapping:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Fee student mapping with id {mapping_id} not found"
            )
        
        await db.delete(db_mapping)
        await db.commit()
        return {"message": "Fee student mapping deleted successfully"}
        
    except HTTPException:
        await db.rollback()
        raise
    except ValueError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid fee student mapping ID format"
        )
    except Exception as e:
        await db.rollback()
        log.error(f"Error deleting fee student mapping: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while deleting fee student mapping"
        )