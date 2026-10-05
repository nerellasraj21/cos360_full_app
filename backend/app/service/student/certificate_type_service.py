import logging as log
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.student.certificate_type_model import CertificateType
from app.schemas.student.certificate_type_schema import CertificateTypeCreate, CertificateTypeUpdate
from app.tools.cache_utils import cache_dropdown, invalidate_cache

log = log.getLogger("student.certificate_type_service")


async def check_certificate_type_name_unique(db: AsyncSession, name: str, exclude_id: UUID | None = None):
    """Check if certificate type name is unique"""
    query = select(CertificateType).where(CertificateType.name == name)

    if exclude_id:
        query = query.where(CertificateType.id != exclude_id)

    result = await db.execute(query)
    existing_type = result.scalar_one_or_none()

    if existing_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=f"Certificate type name '{name}' already exists"
        )


async def create_certificate_type(db: AsyncSession, certificate_type_data: CertificateTypeCreate):
    """Create a new certificate type"""
    try:
        # Check name uniqueness
        await check_certificate_type_name_unique(db, certificate_type_data.name)

        # Create new certificate type
        new_certificate_type = CertificateType(
            name=certificate_type_data.name, description=certificate_type_data.description
        )

        db.add(new_certificate_type)
        await db.flush()
        created = (
            await db.execute(select(CertificateType).where(CertificateType.id == new_certificate_type.id))
        ).scalar_one()
        await db.commit()

        # Invalidate cache
        invalidate_cache("certificate_types_dropdown")

        log.info(f"Certificate type created successfully: {created.id}")
        return created

    except HTTPException:
        raise
    except IntegrityError as e:
        await db.rollback()
        log.error(f"Database integrity error creating certificate type: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Certificate type name must be unique")
    except Exception as e:
        await db.rollback()
        log.error(f"Error creating certificate type: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error creating certificate type"
        )


async def get_certificate_type_by_id(db: AsyncSession, certificate_type_id: UUID):
    """Get certificate type by ID"""
    try:
        result = await db.execute(select(CertificateType).where(CertificateType.id == certificate_type_id))
        certificate_type = result.scalar_one_or_none()

        if not certificate_type:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Certificate type with id {certificate_type_id} not found",
            )

        return certificate_type

    except HTTPException:
        raise
    except Exception as e:
        log.error(f"Error fetching certificate type {certificate_type_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error fetching certificate type"
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

        return {"items": certificate_types, "total_count": total_count, "has_next": has_next}

    except Exception as e:
        log.error(f"Error fetching certificate types: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error fetching certificate types"
        )


@cache_dropdown(ttl=300)
async def get_certificate_types_dropdown(db: AsyncSession):
    """Get certificate types for dropdown - cached"""
    try:
        query = select(CertificateType).order_by(CertificateType.name)
        result = await db.execute(query)
        return result.scalars().all()

    except Exception as e:
        log.error(f"Error fetching certificate types dropdown: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching certificate types dropdown",
        )


async def search_certificate_types(db: AsyncSession, q: str = "", limit: int = 10):
    """Search certificate types by name using ILIKE"""
    try:
        query = (
            select(CertificateType)
            .where(CertificateType.name.ilike(f"%{q}%"))
            .order_by(CertificateType.name)
            .limit(limit)
        )
        result = await db.execute(query)
        return result.scalars().all()
    except Exception as e:
        log.error(f"Error searching certificate types: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error searching certificate types",
        )


async def update_certificate_type(
    db: AsyncSession, certificate_type_id: UUID, certificate_type_update: CertificateTypeUpdate
):
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

        await db.flush()
        updated = (
            await db.execute(select(CertificateType).where(CertificateType.id == certificate_type_id))
        ).scalar_one()
        await db.commit()

        # Invalidate cache
        invalidate_cache("certificate_types_dropdown")

        log.info(f"Certificate type updated successfully: {certificate_type_id}")
        return updated

    except HTTPException:
        raise
    except IntegrityError as e:
        await db.rollback()
        log.error(f"Database integrity error updating certificate type: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Certificate type name must be unique")
    except Exception as e:
        await db.rollback()
        log.error(f"Error updating certificate type {certificate_type_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error updating certificate type"
        )


async def delete_certificate_type(db: AsyncSession, certificate_type_id: UUID):
    """Delete certificate type"""
    try:
        # Get existing certificate type
        certificate_type = await get_certificate_type_by_id(db, certificate_type_id)

        # Check if certificate type is in use by student certificates
        from sqlalchemy import func

        from app.models.student.student_certificate_model import CertificateIssue

        certificate_count = await db.execute(
            select(func.count(CertificateIssue.id)).where(CertificateIssue.certificate_type_id == certificate_type_id)
        )
        certificate_dependencies = certificate_count.scalar()

        if certificate_dependencies > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete certificate type '{certificate_type.name}' because it is being used by {certificate_dependencies} student certificate(s). Please reassign or delete the certificates first.",
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
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error deleting certificate type"
        )
