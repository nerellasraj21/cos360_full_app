from fastapi import HTTPException, status
import logging
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError
from app.models.fee.fee_student_mapping_model import FeeStudentMapping as FeeStudentMappingModel
from app.models.fee.fee_student_map_term_amount_model import FeeStudentMapTermAmount as FeeStudentMapTermAmountModel
from app.models.fee.fee_type_model import FeeType
from app.models.fee.fee_term_model import FeeTerm
from app.models.fee.fee_term_dates_model import FeeTermDates
from app.models.student.student_model import Student
from app.models.masters.admission_model import Admission
from app.models.masters.class_model import Class
from app.models.masters.sections_model import Section
from app.models.masters.academic_year_model import AcademicYear
from app.schemas.fee.fee_student_mapping_schema import FeeStudentMappingCreate, FeeStudentMappingUpdate, FeeStudentMappingBulkCreate, FeeStudentMappingBulkResponse, FeeStudentMappingBulkError
from typing import List, Optional
from uuid import UUID
from decimal import Decimal

log = logging.getLogger("fee.student_mapping_service")

async def validate_student_exists(db: AsyncSession, student_id: UUID):
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

async def validate_class_exists(db: AsyncSession, class_id: UUID):
    """Validate that class exists"""
    result = await db.execute(select(Class).where(Class.id == class_id))
    class_obj = result.scalar_one_or_none()
    if not class_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Class with id {class_id} not found"
        )
    return class_obj

async def validate_section_exists(db: AsyncSession, section_id: UUID):
    """Validate that section exists"""
    result = await db.execute(select(Section).where(Section.id == section_id))
    section = result.scalar_one_or_none()
    if not section:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Section with id {section_id} not found"
        )
    return section

async def validate_fee_type_exists(db: AsyncSession, fee_type_id: UUID):
    """Validate that fee type exists"""
    try:
        result = await db.execute(select(FeeType).where(FeeType.id == fee_type_id))
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

async def validate_academic_year_exists(db: AsyncSession, academic_year_id: UUID):
    """Validate that academic year exists"""
    result = await db.execute(select(AcademicYear).where(AcademicYear.id == academic_year_id))
    academic_year = result.scalar_one_or_none()
    if not academic_year:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Academic year with id {academic_year_id} not found"
        )
    return academic_year

async def check_mapping_unique(db: AsyncSession, student_id: UUID, fee_type_id: UUID, academic_year_id: UUID, exclude_id: Optional[UUID] = None):
    """Check if mapping is unique for student, fee type, and academic year"""
    try:
        query = select(FeeStudentMappingModel).where(
            and_(
                FeeStudentMappingModel.student_id == student_id,
                FeeStudentMappingModel.fee_type_id == fee_type_id,
                FeeStudentMappingModel.academic_year_id == academic_year_id
            )
        )
        
        if exclude_id:
            query = query.where(FeeStudentMappingModel.id != exclude_id)
        
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

async def get_fee_terms_for_type(db: AsyncSession, fee_type_id: UUID):
    """Get fee terms specific to the fee type"""
    try:
        result = await db.execute(
            select(FeeType).options(selectinload(FeeType.fee_term)).where(FeeType.id == fee_type_id)
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

async def create_term_amounts(db: AsyncSession, fee_student_mapping_id: UUID, total_fee: Decimal, fee_type_id: UUID):
    """Create term amounts based on fee type term dates"""
    fee_term = await get_fee_terms_for_type(db, fee_type_id)

    # Get all term dates for this fee term
    result = await db.execute(
        select(FeeTermDates)
        .where(FeeTermDates.term_id == fee_term.id)
        .order_by(FeeTermDates.fee_term_date.asc())
    )
    term_dates = result.scalars().all()

    if len(term_dates) != fee_term.number_of_terms:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Data inconsistency: Fee term has {fee_term.number_of_terms} terms but {len(term_dates)} dates"
        )

    # Calculate amount per term (equal split by default)
    amount_per_term = total_fee / len(term_dates)

    # CRITICAL FIX: Create term amounts for EACH TERM DATE
    # NOTE: Both term_id and term_date_id are required (denormalized for performance)
    # - term_id: References the fee term (e.g., "Quarterly")
    # - term_date_id: References the specific term date (e.g., "Q1 - Jan 15")
    term_amounts = []
    for term_date in term_dates:
        term_amount = FeeStudentMapTermAmountModel(
            fee_student_map_id=fee_student_mapping_id,
            term_id=term_date.term_id,  # ✅ FIXED: Extract from FeeTermDates (NOT NULL constraint)
            term_date_id=term_date.id,   # ✅ The specific term date
            term_amount=amount_per_term
        )
        db.add(term_amount)
        term_amounts.append(term_amount)

    return term_amounts

async def get_student_details(db: AsyncSession, student_id: UUID, admission_number: str, class_id: UUID, section_id: UUID):
    """Get comprehensive student details"""
    try:
        # Get student
        result = await db.execute(select(Student).where(Student.id == student_id))
        student = result.scalar_one_or_none()
        if not student:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Student with id {student_id} not found"
            )

        # Get class
        result = await db.execute(select(Class).where(Class.id == class_id))
        class_obj = result.scalar_one_or_none()
        if not class_obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Class with id {class_id} not found"
            )

        # Get section
        result = await db.execute(select(Section).where(Section.id == section_id))
        section_obj = result.scalar_one_or_none()
        if not section_obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Section with id {section_id} not found"
            )

        return {
            "student_id": student.id,
            "student_name": f"{student.first_name} {student.last_name}",
            "student_admission_number": admission_number,
            "student_class": {"id": class_obj.id, "name": class_obj.name},
            "student_section": {"id": section_obj.id, "name": section_obj.name}
        }
    except HTTPException:
        raise
    except Exception as e:
        log.error(f"Error getting student details: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving student details"
        )

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
            fee_type_id=mapping_data.fee_type_id,
            total_fee=mapping_data.total_fee,
            academic_year_id=mapping_data.academic_year_id
        )
        
        db.add(db_mapping)
        await db.flush()  # Get the ID for term amounts
        
        # Create term amounts
        await create_term_amounts(db, db_mapping.id, mapping_data.total_fee, mapping_data.fee_type_id)

        # Load with all relationships before commit (proper refresh pattern)
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

        await db.commit()
        
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

async def get_fee_student_mapping_by_id(db: AsyncSession, mapping_id: UUID):
    """Get a single fee student mapping by ID with all relationships"""
    try:
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
            .where(FeeStudentMappingModel.id == mapping_id)
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
    student_id: Optional[UUID] = None,
    class_id: Optional[UUID] = None,
    section_id: Optional[UUID] = None,
    fee_type_id: Optional[UUID] = None,
    academic_year_id: Optional[UUID] = None,
    limit: int = 50,
    offset: int = 0
):
    """Get all fee student mappings with optional filters and pagination"""
    try:
        # Simplified query without complex relationships to avoid issues
        query = select(FeeStudentMappingModel)

        # Apply filters
        if student_id is not None:
            query = query.where(FeeStudentMappingModel.student_id == student_id)

        if class_id is not None:
            query = query.where(FeeStudentMappingModel.class_id == class_id)

        if section_id is not None:
            query = query.where(FeeStudentMappingModel.section_id == section_id)

        if fee_type_id is not None:
            query = query.where(FeeStudentMappingModel.fee_type_id == fee_type_id)

        if academic_year_id is not None:
            query = query.where(FeeStudentMappingModel.academic_year_id == academic_year_id)

        # Apply pagination
        query = query.limit(limit).offset(offset)

        result = await db.execute(query)
        mappings = result.scalars().all()
        
        # If no mappings, return empty list immediately
        if not mappings:
            return []

        # Simplified processing without complex relationship access
        for mapping in mappings:
            try:
                # Set basic attributes without accessing relationships
                mapping.fee_type_name = None
                mapping.academic_year_name = None
                mapping.student_details = None
                mapping.student_fee_mapping_terms = []
            except Exception as mapping_error:
                log.error(f"Error processing mapping {mapping.id}: {str(mapping_error)}")
                continue

        return mappings
        
    except HTTPException:
        raise
    except Exception as e:
        log.error(f"Error getting all fee student mappings: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while retrieving fee student mappings"
        )

async def update_fee_student_mapping(db: AsyncSession, mapping_id: UUID, mapping_data: FeeStudentMappingUpdate):
    """Update an existing fee student mapping"""
    try:
        # Get existing mapping
        result = await db.execute(
            select(FeeStudentMappingModel)
            .options(selectinload(FeeStudentMappingModel.term_amounts))
            .where(FeeStudentMappingModel.id == mapping_id)
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
            new_fee_type_id = mapping_data.fee_type_id or db_mapping.fee_type_id
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
            db_mapping.fee_type_id = mapping_data.fee_type_id
        if mapping_data.total_fee is not None:
            db_mapping.total_fee = mapping_data.total_fee
            
            # If total fee is updated, update term amounts
            for term_amount in db_mapping.term_amounts:
                await db.delete(term_amount)
            
            # Create new term amounts
            new_fee_type_id = mapping_data.fee_type_id or db_mapping.fee_type_id
            await create_term_amounts(db, db_mapping.id, mapping_data.total_fee, new_fee_type_id)
            
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

async def delete_fee_student_mapping(db: AsyncSession, mapping_id: UUID):
    """Delete a fee student mapping"""
    try:
        result = await db.execute(select(FeeStudentMappingModel).where(FeeStudentMappingModel.id == mapping_id))
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

async def create_bulk_fee_student_mappings(db: AsyncSession, bulk_data: FeeStudentMappingBulkCreate):
    """Create fee mappings for multiple students with comprehensive error handling"""
    try:
        # Validate common data once (class, section, fee_type, academic_year)
        await validate_class_exists(db, bulk_data.class_id)
        await validate_section_exists(db, bulk_data.section_id)
        await validate_fee_type_exists(db, bulk_data.fee_type_id)
        await validate_academic_year_exists(db, bulk_data.academic_year_id)
        
        created_mappings = []
        errors = []
        
        # Process each student_id individually
        for student_id in bulk_data.student_ids:
            try:
                # Get student details for the mapping (including admission number)
                student_result = await db.execute(
                    select(Student, Admission)
                    .join(Admission, Student.id == Admission.student_id)
                    .where(Student.id == student_id)
                )
                student_admission = student_result.first()
                
                if not student_admission:
                    errors.append(FeeStudentMappingBulkError(
                        student_id=student_id,
                        student_name=None,
                        student_admission_num=None,
                        error=f"Student with id {student_id} not found or has no admission record",
                        error_code="STUDENT_NOT_FOUND"
                    ))
                    continue
                
                student, admission = student_admission
                
                # Check mapping uniqueness
                await check_mapping_unique(
                    db,
                    student_id,
                    bulk_data.fee_type_id,
                    bulk_data.academic_year_id
                )
                
                # Create individual mapping
                db_mapping = FeeStudentMappingModel(
                    student_id=student_id,
                    student_admission_num=admission.admission_number,
                    class_id=bulk_data.class_id,
                    section_id=bulk_data.section_id,
                    fee_type_id=bulk_data.fee_type_id,
                    total_fee=bulk_data.total_fee,
                    academic_year_id=bulk_data.academic_year_id
                )
                
                db.add(db_mapping)
                await db.flush()  # Flush to get the ID without committing

                # Create term amounts
                await create_term_amounts(db, db_mapping.id, bulk_data.total_fee, bulk_data.fee_type_id)

                # Load with relationships for response
                result = await db.execute(
                    select(FeeStudentMappingModel)
                    .options(
                        selectinload(FeeStudentMappingModel.student).selectinload(Student.admissions),
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
                if mapping.student:
                    # admissions is a single object (uselist=False), not a list
                    student_admission = mapping.student.admissions
                    mapping.student_details = {
                        "student_id": mapping.student.id,
                        "student_name": f"{mapping.student.first_name} {mapping.student.last_name}",
                        "student_admission_number": student_admission.admission_number if student_admission else "",
                        "student_class": {
                            "id": mapping.class_ref.id,
                            "name": mapping.class_ref.name
                        } if mapping.class_ref else None,
                        "student_section": {
                            "id": mapping.section.id,
                            "name": mapping.section.name
                        } if mapping.section else None
                    }
                
                # Add term names to term amounts
                if hasattr(mapping, 'term_amounts'):
                    for term_amount in mapping.term_amounts:
                        term_amount.term_name = term_amount.fee_term.term_name if term_amount.fee_term else None
                    mapping.student_fee_mapping_terms = mapping.term_amounts
                else:
                    mapping.student_fee_mapping_terms = []
                
                created_mappings.append(mapping)
                
            except HTTPException as he:
                # Handle individual student errors without stopping bulk operation
                student_name = None
                student_admission_num = None
                
                try:
                    # Try to get student name and admission number for error response
                    student_result = await db.execute(
                        select(Student, Admission)
                        .join(Admission, Student.id == Admission.student_id, isouter=True)
                        .where(Student.id == student_id)
                    )
                    student_data = student_result.first()
                    if student_data:
                        student, admission = student_data
                        student_name = f"{student.first_name} {student.last_name}"
                        student_admission_num = admission.admission_number if admission else None
                except:
                    pass  # Student name and admission num are optional in error response
                
                error_code = "VALIDATION_ERROR"
                if he.status_code == 404:
                    error_code = "STUDENT_NOT_FOUND"
                elif he.status_code == 400 and "already exists" in he.detail:
                    error_code = "DUPLICATE_MAPPING"
                
                errors.append(FeeStudentMappingBulkError(
                    student_id=student_id,
                    student_name=student_name,
                    student_admission_num=student_admission_num,
                    error=he.detail,
                    error_code=error_code
                ))
                
            except Exception as e:
                # Handle unexpected errors for individual students
                log.error(f"Unexpected error processing student {student_id}: {str(e)}")
                errors.append(FeeStudentMappingBulkError(
                    student_id=student_id,
                    student_name=None,
                    student_admission_num=None,
                    error=f"Unexpected error: {str(e)}",
                    error_code="SYSTEM_ERROR"
                ))
        
        # Commit all successful mappings
        if created_mappings:
            await db.commit()
        
        # Prepare response message
        total_count = len(bulk_data.student_ids)
        success_count = len(created_mappings)
        error_count = len(errors)
        
        if success_count == total_count:
            message = f"Successfully created {success_count} fee student mappings"
        elif success_count > 0:
            message = f"Successfully created {success_count} out of {total_count} fee student mappings. {error_count} failed."
        else:
            message = f"Failed to create any fee student mappings. All {total_count} attempts failed."
        
        return FeeStudentMappingBulkResponse(
            success_count=success_count,
            total_count=total_count,
            created_mappings=created_mappings,
            errors=errors,
            message=message
        )
        
    except HTTPException:
        # Common validation errors (class, section, fee_type, or academic_year not found)
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        log.error(f"Error in bulk fee student mapping creation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while creating bulk fee student mappings"
        )