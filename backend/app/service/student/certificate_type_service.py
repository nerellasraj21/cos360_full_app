from fastapi import HTTPException, status
import logging as log
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from app.models.student.certificate_type_model import CertificateType
from app.schemas.student.certificate_type_schema import CertificateTypeCreate, CertificateTypeUpdate
from app.tools.cache_utils import cache_dropdown, invalidate_cache
from typing import List, Optional
from uuid import UUID

log = log.getLogger("student.certificate_type_service")

async def check_certificate_type_name_unique(db: AsyncSession, name: str, exclude_id: Optional[UUID] = None):
    """Check if certificate type name is unique"""
    query = select(CertificateType).where(CertificateType.name == name)
    
    if exclude_id:
        query = query.where(CertificateType.id != exclude_id)
    
    result = await db.execute(query)
    existing_type = result.scalar_one_or_none()
    
    if existing_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Certificate type name '{name}' already exists"
        )

async def create_certificate_type(db: AsyncSession, certificate_type_data: CertificateTypeCreate):
    """Create a new certificate type"""
    try:
        # Check name uniqueness
        await check_certificate_type_name_unique(db, certificate_type_data.name)
        
        # Create new certificate type
        new_certificate_type = CertificateType(
            name=certificate_type_data.name,
            description=certificate_type_data.description
        )
        
        db.add(new_certificate_type)
        await db.commit()
        await db.refresh(new_certificate_type)
        
        # Invalidate cache
        invalidate_cache("certificate_types_dropdown")
        
        log.info(f"Certificate type created successfully: {new_certificate_type.id}")
        return new_certificate_type
        
    except IntegrityError as e:
        await db.rollback()
        log.error(f"Database integrity error creating certificate type: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Certificate type name must be unique"
        )
    except Exception as e:
        await db.rollback()
        log.error(f"Error creating certificate type: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating certificate type: {str(e)}"
        )

async def get_certificate_type_by_id(db: AsyncSession, certificate_type_id: UUID):
    """Get certificate type by ID"""
    try:
        result = await db.execute(select(CertificateType).where(CertificateType.id == certificate_type_id))
        certificate_type = result.scalar_one_or_none()
        
        if not certificate_type:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Certificate type with id {certificate_type_id} not found"
            )
        
        return certificate_type
        
    except HTTPException:
        raise
    except Exception as e:
        log.error(f"Error fetching certificate type {certificate_type_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching certificate type: {str(e)}"
        )

async def get_all_certificate_types(db: AsyncSession, skip: int = 0, limit: int = 100):
    """Get all certificate types with pagination"""
    try:
        # Get total count
        count_query = select(CertificateType)
        total_result = await db.execute(count_query)
        total_count = len(total_result.scalars().all())
        
        # Get paginated results
        query = select(CertificateType).offset(skip).limit(limit).order_by(CertificateType.name)
        result = await db.execute(query)
        certificate_types = result.scalars().all()
        
        has_next = (skip + limit) < total_count
        
        return {
            "items": certificate_types,
            "total_count": total_count,
            "has_next": has_next
        }
        
    except Exception as e:
        log.error(f"Error fetching certificate types: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching certificate types: {str(e)}"
        )

async def get_certificate_types_dropdown(db: AsyncSession):
    """Get certificate types for dropdown - cached"""
    return await cache_dropdown(
        cache_key="certificate_types_dropdown",
        fetch_function=_fetch_certificate_types_dropdown,
        db=db
    )

async def _fetch_certificate_types_dropdown(db: AsyncSession):
    """Internal function to fetch certificate types for dropdown"""
    try:
        query = select(CertificateType).order_by(CertificateType.name)
        result = await db.execute(query)
        return result.scalars().all()
        
    except Exception as e:
        log.error(f"Error fetching certificate types dropdown: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching certificate types dropdown: {str(e)}"
        )

async def update_certificate_type(db: AsyncSession, certificate_type_id: UUID, certificate_type_update: CertificateTypeUpdate):
    """Update certificate type"""
    try:
        # Get existing certificate type
        certificate_type = await get_certificate_type_by_id(db, certificate_type_id)
        
        # Check name uniqueness if name is being updated
        if certificate_type_update.name and certificate_type_update.name != certificate_type.name:
            await check_certificate_type_name_unique(db, certificate_type_update.name, certificate_type_id)
        
        # Update fields
        update_data = certificate_type_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(certificate_type, field, value)
        
        await db.commit()
        await db.refresh(certificate_type)
        
        # Invalidate cache
        invalidate_cache("certificate_types_dropdown")
        
        log.info(f"Certificate type updated successfully: {certificate_type_id}")
        return certificate_type
        
    except HTTPException:
        raise
    except IntegrityError as e:
        await db.rollback()
        log.error(f"Database integrity error updating certificate type: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Certificate type name must be unique"
        )
    except Exception as e:
        await db.rollback()
        log.error(f"Error updating certificate type {certificate_type_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating certificate type: {str(e)}"
        )

async def delete_certificate_type(db: AsyncSession, certificate_type_id: UUID):
    """Delete certificate type"""
    try:
        # Get existing certificate type
        certificate_type = await get_certificate_type_by_id(db, certificate_type_id)

        # Check if certificate type is in use by student certificates
        from app.models.student.student_certificate_model import StudentCertificate
        from sqlalchemy import func
        certificate_count = await db.execute(
            select(func.count(StudentCertificate.id)).where(StudentCertificate.certificate_type_id == certificate_type_id)
        )
        certificate_dependencies = certificate_count.scalar()

        if certificate_dependencies > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete certificate type '{certificate_type.type_name}' because it is being used by {certificate_dependencies} student certificate(s). Please reassign or delete the certificates first."
            )

        await db.delete(certificate_type)
        await db.commit()

        # Invalidate cache
        invalidate_cache("certificate_types_dropdown")

        log.info(f"Certificate type deleted successfully: {certificate_type_id}")
        return {"message": "Certificate type deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        log.error(f"Error deleting certificate type {certificate_type_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting certificate type: {str(e)}"
        )