"""
Student Certificate Service — S3-based CRUD with audit logging

Handles certificate creation, retrieval, updates, deletion, and downloads.
Integrates with FileManager for S3 operations and logs all actions to FileAuditLog.
"""

import logging
from datetime import datetime, date
from uuid import UUID

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.student.certificate_type_model import CertificateType
from app.models.student.student_certificate_model import (
    CertificateIssue,
    FileAuditLog,
    StaleFileRegistry,
)
from app.models.student.student_model import Student
from app.schemas.student.certificate_schema import CertificateRead
from app.service.student.file_manager import file_manager

log = logging.getLogger("student.certificate_service")


# ============================================================================
# AUDIT LOGGING
# ============================================================================


async def _log_audit(
    db: AsyncSession,
    actor_id: UUID,
    actor_role: str,
    student_id: UUID | None,
    certificate_id: UUID | None,
    action: str,
    s3_key: str | None,
    tenant_schema: str,
) -> None:
    """
    Log file action to audit log.

    Args:
        db: Database session
        actor_id: User ID performing action
        actor_role: User role
        student_id: Student UUID (nullable)
        certificate_id: Certificate UUID (nullable)
        action: Action type (upload, update, delete, download)
        s3_key: S3 key affected (nullable)
        tenant_schema: Tenant schema name
    """
    audit_entry = FileAuditLog(
        actor_id=actor_id,
        actor_role=actor_role,
        student_id=student_id,
        certificate_id=certificate_id,
        action=action,
        s3_key=s3_key,
        tenant_schema=tenant_schema,
        created_at=datetime.utcnow(),
    )
    db.add(audit_entry)


# ============================================================================
# CERTIFICATE CRUD OPERATIONS
# ============================================================================


async def create_certificate(
    db: AsyncSession,
    student_id: UUID,
    certificate_type_id: UUID,
    issue_date: date,
    remarks: str | None,
    file: UploadFile,
    tenant_schema: str,
    actor_id: UUID,
    actor_role: str,
) -> CertificateRead:
    """
    Create new certificate with file upload to S3.

    Args:
        db: Database session
        student_id: Student UUID
        certificate_type_id: Certificate type UUID
        issue_date: Issue date
        remarks: Optional remarks
        file: Uploaded file
        tenant_schema: Tenant schema name
        actor_id: User ID performing action
        actor_role: User role

    Returns:
        CertificateRead schema

    Raises:
        HTTPException: If validation or S3 upload fails
    """
    try:
        # 1. Validate student exists
        result = await db.execute(select(Student).where(Student.id == student_id))
        student = result.scalar_one_or_none()
        if not student:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Student with id {student_id} not found",
            )

        # 2. Validate certificate type exists
        result = await db.execute(
            select(CertificateType).where(CertificateType.id == certificate_type_id)
        )
        cert_type = result.scalar_one_or_none()
        if not cert_type:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Certificate type with id {certificate_type_id} not found",
            )

        # 3. Upload file to S3 (all validation done in FileManager)
        s3_key = await file_manager.upload_file(
            tenant_schema, "certificates", str(student_id), file
        )

        # 4. Create certificate record
        cert = CertificateIssue(
            student_id=student_id,
            certificate_type_id=certificate_type_id,
            issue_date=issue_date,
            remarks=remarks,
            file_path=s3_key,
            created_at=datetime.utcnow(),
        )
        db.add(cert)
        await db.flush()

        # 5. Load with relationships
        result = await db.execute(
            select(CertificateIssue)
            .options(selectinload(CertificateIssue.certificate_type))
            .where(CertificateIssue.id == cert.id)
        )
        cert_with_type = result.scalar_one()

        # 6. Log audit entry
        await _log_audit(
            db,
            actor_id,
            actor_role,
            student_id,
            cert.id,
            "upload",
            s3_key,
            tenant_schema,
        )

        await db.commit()

        log.info(f"Certificate created: {cert.id} for student {student_id}")

        # 7. Build response
        return CertificateRead(
            id=cert_with_type.id,
            student_id=cert_with_type.student_id,
            certificate_type_id=cert_with_type.certificate_type_id,
            type_name=cert_with_type.certificate_type.name if cert_with_type.certificate_type else "",
            file_path=cert_with_type.file_path,
            issue_date=cert_with_type.issue_date,
            remarks=cert_with_type.remarks,
            created_at=cert_with_type.created_at,
            updated_at=cert_with_type.updated_at,
        )

    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        log.error(f"Error creating certificate: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating certificate: {str(e)}",
        )


async def get_certificate_by_id(db: AsyncSession, certificate_id: UUID) -> CertificateRead:
    """
    Fetch certificate by ID with relationships.

    Args:
        db: Database session
        certificate_id: Certificate UUID

    Returns:
        CertificateRead schema

    Raises:
        HTTPException: If not found
    """
    try:
        result = await db.execute(
            select(CertificateIssue)
            .options(selectinload(CertificateIssue.certificate_type))
            .where(CertificateIssue.id == certificate_id)
        )
        cert = result.scalar_one_or_none()

        if not cert:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Certificate with id {certificate_id} not found",
            )

        return CertificateRead(
            id=cert.id,
            student_id=cert.student_id,
            certificate_type_id=cert.certificate_type_id,
            type_name=cert.certificate_type.name if cert.certificate_type else "",
            file_path=cert.file_path,
            issue_date=cert.issue_date,
            remarks=cert.remarks,
            created_at=cert.created_at,
            updated_at=cert.updated_at,
        )

    except HTTPException:
        raise
    except Exception as e:
        log.error(f"Error fetching certificate {certificate_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching certificate: {str(e)}",
        )


async def update_certificate(
    db: AsyncSession,
    certificate_id: UUID,
    certificate_type_id: UUID | None,
    issue_date: date | None,
    remarks: str | None,
    file: UploadFile | None,
    tenant_schema: str,
    actor_id: UUID,
    actor_role: str,
) -> CertificateRead:
    """
    Update certificate metadata and/or file.

    If file is provided, old file is moved to stale zone with 10-day TTL.

    Args:
        db: Database session
        certificate_id: Certificate UUID
        certificate_type_id: New certificate type (optional)
        issue_date: New issue date (optional)
        remarks: New remarks (optional)
        file: New file (optional)
        tenant_schema: Tenant schema name
        actor_id: User ID performing action
        actor_role: User role

    Returns:
        Updated CertificateRead schema

    Raises:
        HTTPException: If not found or update fails
    """
    try:
        # 1. Fetch certificate
        result = await db.execute(
            select(CertificateIssue).where(CertificateIssue.id == certificate_id)
        )
        cert = result.scalar_one_or_none()

        if not cert:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Certificate with id {certificate_id} not found",
            )

        # 2. Handle file replacement if provided
        if file:
            old_key = cert.file_path

            # Upload new file
            new_s3_key = await file_manager.upload_file(
                tenant_schema, "certificates", str(cert.student_id), file
            )

            # Move old file to stale
            stale_key = await file_manager.move_to_stale(old_key, tenant_schema)

            # Register stale file for cleanup
            stale_entry = StaleFileRegistry(
                s3_key=stale_key,
                tenant_schema=tenant_schema,
                expires_at=datetime.utcnow() + __import__("datetime").timedelta(
                    days=10
                ),
                created_at=datetime.utcnow(),
            )
            db.add(stale_entry)

            cert.file_path = new_s3_key

        # 3. Update metadata fields
        if certificate_type_id is not None:
            cert.certificate_type_id = certificate_type_id

        if issue_date is not None:
            cert.issue_date = issue_date

        if remarks is not None:
            cert.remarks = remarks

        cert.updated_at = datetime.utcnow()

        await db.flush()

        # 4. Load with relationships
        result = await db.execute(
            select(CertificateIssue)
            .options(selectinload(CertificateIssue.certificate_type))
            .where(CertificateIssue.id == certificate_id)
        )
        cert_updated = result.scalar_one()

        # 5. Log audit entry
        await _log_audit(
            db,
            actor_id,
            actor_role,
            cert.student_id,
            certificate_id,
            "update",
            cert_updated.file_path,
            tenant_schema,
        )

        await db.commit()

        log.info(f"Certificate updated: {certificate_id}")

        # 6. Build response
        return CertificateRead(
            id=cert_updated.id,
            student_id=cert_updated.student_id,
            certificate_type_id=cert_updated.certificate_type_id,
            type_name=cert_updated.certificate_type.name if cert_updated.certificate_type else "",
            file_path=cert_updated.file_path,
            issue_date=cert_updated.issue_date,
            remarks=cert_updated.remarks,
            created_at=cert_updated.created_at,
            updated_at=cert_updated.updated_at,
        )

    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        log.error(f"Error updating certificate {certificate_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating certificate: {str(e)}",
        )


async def delete_certificate(
    db: AsyncSession,
    certificate_id: UUID,
    tenant_schema: str,
    actor_id: UUID,
    actor_role: str,
) -> dict:
    """
    Delete certificate and move file to stale zone.

    Args:
        db: Database session
        certificate_id: Certificate UUID
        tenant_schema: Tenant schema name
        actor_id: User ID performing action
        actor_role: User role

    Returns:
        Success message dict

    Raises:
        HTTPException: If not found or deletion fails
    """
    try:
        # 1. Fetch certificate
        result = await db.execute(
            select(CertificateIssue).where(CertificateIssue.id == certificate_id)
        )
        cert = result.scalar_one_or_none()

        if not cert:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Certificate with id {certificate_id} not found",
            )

        old_key = cert.file_path

        # 2. Move file to stale
        if old_key:
            stale_key = await file_manager.move_to_stale(old_key, tenant_schema)

            # Register for cleanup
            stale_entry = StaleFileRegistry(
                s3_key=stale_key,
                tenant_schema=tenant_schema,
                expires_at=datetime.utcnow() + __import__("datetime").timedelta(
                    days=10
                ),
                created_at=datetime.utcnow(),
            )
            db.add(stale_entry)

        # 3. Log audit entry before deletion
        await _log_audit(
            db,
            actor_id,
            actor_role,
            cert.student_id,
            certificate_id,
            "delete",
            old_key,
            tenant_schema,
        )

        # 4. Delete record
        await db.delete(cert)
        await db.commit()

        log.info(f"Certificate deleted: {certificate_id}")

        return {"message": "Certificate deleted successfully"}

    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        log.error(f"Error deleting certificate {certificate_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting certificate: {str(e)}",
        )


async def download_certificate(
    db: AsyncSession,
    certificate_id: UUID,
    role: str,
    user_id: UUID,
    tenant_schema: str,
) -> dict:
    """
    Generate presigned URL for certificate download with RBAC check.

    Args:
        db: Database session
        certificate_id: Certificate UUID
        role: User role
        user_id: User UUID
        tenant_schema: Tenant schema name

    Returns:
        Dict with presigned_url and expires_in_seconds

    Raises:
        HTTPException: If not found, access denied, or URL generation fails
    """
    try:
        # 1. Fetch certificate
        result = await db.execute(
            select(CertificateIssue)
            .options(selectinload(CertificateIssue.certificate_type))
            .where(CertificateIssue.id == certificate_id)
        )
        cert = result.scalar_one_or_none()

        if not cert:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Certificate with id {certificate_id} not found",
            )

        # 2. RBAC Check
        if role == "Admin" or role == "Staff":
            # Admin and Staff can download any certificate
            pass
        elif role == "Teacher":
            # Teacher: Allow all (OQ-01 blocker: no class assignment table)
            pass
        elif role == "Student":
            # Student: Can only download own certificates
            result = await db.execute(
                select(Student)
                .where(Student.id == cert.student_id)
            )
            student = result.scalar_one_or_none()
            if not student or student.user_id != user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not have permission to download this certificate",
                )
        elif role == "Parent":
            # Parent: Can download child's certificates
            from app.models.masters.student_parent_association_model import StudentParentLink

            result = await db.execute(
                select(StudentParentLink)
                .where(
                    StudentParentLink.student_id == cert.student_id,
                    StudentParentLink.parent_id == user_id,
                )
            )
            parent_link = result.scalar_one_or_none()
            if not parent_link:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not have permission to download this certificate",
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to download certificates",
            )

        # 3. Generate presigned URL
        presigned_url = await file_manager.generate_presigned_url(cert.file_path)

        # 4. Log audit entry
        await _log_audit(
            db,
            user_id,
            role,
            cert.student_id,
            certificate_id,
            "download",
            cert.file_path,
            tenant_schema,
        )

        await db.commit()

        log.info(f"Certificate downloaded: {certificate_id} by {role} {user_id}")

        return {
            "presigned_url": presigned_url,
            "expires_in_seconds": 900,
            "certificate_id": certificate_id,
        }

    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        log.error(f"Error downloading certificate {certificate_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating download link: {str(e)}",
        )


# ============================================================================
# LIST AND QUERY OPERATIONS
# ============================================================================


async def list_certificates(
    db: AsyncSession,
    student_id: UUID | None = None,
    certificate_type_id: UUID | None = None,
    skip: int = 0,
    limit: int = 50,
) -> dict:
    """
    List certificates with optional filtering.

    Args:
        db: Database session
        student_id: Filter by student (optional)
        certificate_type_id: Filter by certificate type (optional)
        skip: Pagination offset
        limit: Pagination limit

    Returns:
        Dict with items, total, has_next
    """
    try:
        # Build query
        query = select(CertificateIssue).options(
            selectinload(CertificateIssue.certificate_type)
        )

        if student_id:
            query = query.where(CertificateIssue.student_id == student_id)

        if certificate_type_id:
            query = query.where(CertificateIssue.certificate_type_id == certificate_type_id)

        # Get total count
        count_result = await db.execute(
            select(func.count(CertificateIssue.id)).where(
                CertificateIssue.student_id == student_id if student_id else True,
            )
        )
        total = count_result.scalar() or 0

        # Get paginated results
        result = await db.execute(
            query.order_by(CertificateIssue.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        certs = result.scalars().unique().all()

        has_next = (skip + limit) < total

        return {
            "items": [
                CertificateRead(
                    id=cert.id,
                    student_id=cert.student_id,
                    certificate_type_id=cert.certificate_type_id,
                    type_name=cert.certificate_type.name if cert.certificate_type else "",
                    file_path=cert.file_path,
                    issue_date=cert.issue_date,
                    remarks=cert.remarks,
                    created_at=cert.created_at,
                    updated_at=cert.updated_at,
                )
                for cert in certs
            ],
            "total": total,
            "has_next": has_next,
        }

    except Exception as e:
        log.error(f"Error listing certificates: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listing certificates: {str(e)}",
        )
