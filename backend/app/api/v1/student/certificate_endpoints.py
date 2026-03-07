"""
Student Certificate Endpoints — S3-backed PDF/file management

8 REST endpoints for certificate issuance, management, and download.
All operations generate presigned S3 URLs for downloads (not direct streaming).
"""

import uuid
from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_tenant_db
from app.models.student.student_model import Student
from app.schemas.student.certificate_schema import (
    CertificateDownloadResponse,
    CertificateRead,
    CertificateUpdateRequest,
    CertificateUploadRequest,
)
from app.service.student.student_certificate_service import (
    create_certificate,
    delete_certificate,
    download_certificate,
    get_certificate_by_id,
    list_certificates,
    update_certificate,
)
from app.tools.simple_permissions import (
    check_role_plan_permission_with_error,
    get_current_user_token,
)

router = APIRouter(prefix="/certificates", tags=["Student/Student Certificates"])


# ============================================================================
# POST /certificates — Create Certificate
# ============================================================================


@router.post("/", status_code=status.HTTP_201_CREATED, response_model=CertificateRead)
async def create_new_certificate(
    student_id: UUID = Form(...),
    certificate_type_id: UUID = Form(...),
    issue_date: date | None = Form(None),
    remarks: str | None = Form(None),
    file: UploadFile = File(...),
    request: Request = None,
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Issue a new certificate for a student.

    Uploads file to S3, creates DB record, logs audit entry.

    **Permission Required:** `student_certificates:create`
    """
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    user_id = UUID(current_user.get("sub"))
    tenant_schema = request.headers.get("cschema", "test_tenant_schema")

    # Permission check
    await check_role_plan_permission_with_error(
        db, request, role, "student_certificates", "create"
    )

    return await create_certificate(
        db=db,
        student_id=student_id,
        certificate_type_id=certificate_type_id,
        issue_date=issue_date or date.today(),
        remarks=remarks,
        file=file,
        tenant_schema=tenant_schema,
        actor_id=user_id,
        actor_role=role,
    )


# ============================================================================
# GET /certificates — List All Certificates (for admin)
# ============================================================================


@router.get("/", response_model=dict)
async def list_all_certificates(
    student_id: UUID | None = None,
    certificate_type_id: UUID | None = None,
    skip: int = 0,
    limit: int = 50,
    request: Request = None,
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    List all certificates with optional filters.

    Supports filtering by student or certificate type.

    **Permission Required:** `student_certificates:list`
    """
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Permission check
    await check_role_plan_permission_with_error(
        db, request, role, "student_certificates", "list"
    )

    return await list_certificates(
        db=db,
        student_id=student_id,
        certificate_type_id=certificate_type_id,
        skip=skip,
        limit=limit,
    )


# ============================================================================
# GET /certificates/my — List My Certificates (for student/staff)
# ============================================================================


@router.get("/my", response_model=dict)
async def list_my_certificates(
    skip: int = 0,
    limit: int = 50,
    request: Request = None,
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    List the current user's certificates (student-specific).

    Resolves student ID from current user's Student record.

    **Permission Required:** `student_certificates:list`
    """
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    user_id = UUID(current_user.get("sub"))

    # Permission check
    await check_role_plan_permission_with_error(
        db, request, role, "student_certificates", "list"
    )

    # Resolve student ID from user ID
    result = await db.execute(
        select(Student).where(Student.user_id == user_id)
    )
    student = result.scalar_one_or_none()

    if not student:
        return {"items": [], "total": 0, "has_next": False}

    return await list_certificates(
        db=db,
        student_id=student.id,
        skip=skip,
        limit=limit,
    )


# ============================================================================
# GET /certificates/my-child/{student_id} — List Child's Certificates (for parent)
# ============================================================================


@router.get("/my-child/{student_id}", response_model=dict)
async def list_child_certificates(
    student_id: UUID,
    skip: int = 0,
    limit: int = 50,
    request: Request = None,
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    List a child's certificates (parent-specific).

    Parent must be linked to student via StudentParentLink.

    **Permission Required:** `student_certificates:list`
    """
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    user_id = UUID(current_user.get("sub"))

    # Permission check
    await check_role_plan_permission_with_error(
        db, request, role, "student_certificates", "list"
    )

    # Verify parent relationship
    if role == "Parent":
        from app.models.masters.student_parent_association_model import (
            StudentParentLink,
        )

        result = await db.execute(
            select(StudentParentLink).where(
                StudentParentLink.student_id == student_id,
                StudentParentLink.parent_id == user_id,
            )
        )
        parent_link = result.scalar_one_or_none()

        if not parent_link:
            from fastapi import HTTPException

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not the parent of this student",
            )

    return await list_certificates(
        db=db,
        student_id=student_id,
        skip=skip,
        limit=limit,
    )


# ============================================================================
# GET /certificates/{id} — Get Certificate Details
# ============================================================================


@router.get("/{certificate_id}", response_model=CertificateRead)
async def get_certificate_details(
    certificate_id: UUID,
    request: Request = None,
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Get certificate details by ID.

    **Permission Required:** `student_certificates:read`
    """
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Permission check
    await check_role_plan_permission_with_error(
        db, request, role, "student_certificates", "read"
    )

    return await get_certificate_by_id(db=db, certificate_id=certificate_id)


# ============================================================================
# PATCH /certificates/{id} — Update Certificate (metadata + file)
# ============================================================================


@router.patch("/{certificate_id}", response_model=CertificateRead)
async def update_certificate_endpoint(
    certificate_id: UUID,
    certificate_type_id: UUID | None = Form(None),
    issue_date: date | None = Form(None),
    remarks: str | None = Form(None),
    file: UploadFile | None = File(None),
    request: Request = None,
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Update certificate metadata and/or file.

    If file is provided, old file is moved to stale zone (10-day TTL).

    **Permission Required:** `student_certificates:update`
    """
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    user_id = UUID(current_user.get("sub"))
    tenant_schema = request.headers.get("cschema", "test_tenant_schema")

    # Permission check
    await check_role_plan_permission_with_error(
        db, request, role, "student_certificates", "update"
    )

    return await update_certificate(
        db=db,
        certificate_id=certificate_id,
        certificate_type_id=certificate_type_id,
        issue_date=issue_date,
        remarks=remarks,
        file=file,
        tenant_schema=tenant_schema,
        actor_id=user_id,
        actor_role=role,
    )


# ============================================================================
# DELETE /certificates/{id} — Delete Certificate
# ============================================================================


@router.delete("/{certificate_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_certificate_endpoint(
    certificate_id: UUID,
    request: Request = None,
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Delete certificate.

    Moves file to stale zone with 10-day TTL before permanent deletion.

    **Permission Required:** `student_certificates:delete`
    """
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    user_id = UUID(current_user.get("sub"))
    tenant_schema = request.headers.get("cschema", "test_tenant_schema")

    # Permission check
    await check_role_plan_permission_with_error(
        db, request, role, "student_certificates", "delete"
    )

    await delete_certificate(
        db=db,
        certificate_id=certificate_id,
        tenant_schema=tenant_schema,
        actor_id=user_id,
        actor_role=role,
    )

    return None


# ============================================================================
# GET /certificates/{id}/download — Download Certificate (Presigned URL)
# ============================================================================


@router.get(
    "/{certificate_id}/download",
    response_model=CertificateDownloadResponse,
)
async def download_certificate_endpoint(
    certificate_id: UUID,
    request: Request = None,
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Generate presigned S3 URL for certificate download.

    URL expires in 15 minutes (900 seconds).
    Frontend redirects to presigned URL for direct S3 download.

    **Permission Required:** `student_certificates:read`
    """
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    user_id = UUID(current_user.get("sub"))
    tenant_schema = request.headers.get("cschema", "test_tenant_schema")

    # Permission check
    await check_role_plan_permission_with_error(
        db, request, role, "student_certificates", "read"
    )

    result = await download_certificate(
        db=db,
        certificate_id=certificate_id,
        role=role,
        user_id=user_id,
        tenant_schema=tenant_schema,
    )

    return CertificateDownloadResponse(
        presigned_url=result["presigned_url"],
        expires_in_seconds=result["expires_in_seconds"],
        certificate_id=result.get("certificate_id"),
    )
