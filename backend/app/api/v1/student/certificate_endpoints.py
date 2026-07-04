"""
Student Certificate Endpoints — S3-backed PDF/file management

8 REST endpoints for certificate issuance, management, and download.
All operations generate presigned S3 URLs for downloads (not direct streaming).
"""

import uuid
from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.tenant_session import get_tenant_db
from app.models.masters.admission_model import Admission
from app.models.masters.class_model import Class
from app.models.masters.sections_model import Section
from app.models.student.student_model import Student
from app.schemas.student.certificate_schema import (
    CertificateDownloadResponse,
    CertificateRead,
    CertificateUpdateRequest,
    CertificateUploadRequest,
    StudentSelectorItem,
)
from app.service.student.student_certificate_service import (
    create_certificate,
    create_issued_certificate,
    create_received_document,
    delete_certificate,
    download_certificate,
    get_certificate_by_id,
    list_certificates,
    update_certificate,
)
from app.tools.enhanced_permissions import check_user_resource_access
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
    tenant_schema = request.headers.get("cschema", "little_bunny")

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
        db, request, role, "student_certificates", "list_own"
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

    **Permission Required:** `student_certificates:list_related` (Parent) or `student_certificates:list`
    """
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    user_id = UUID(current_user.get("sub"))

    # Permission check — resolves list_related for Parent, plain list for others
    await check_user_resource_access(db, request, "student_certificates", "list")

    # Verify parent relationship
    if role == "Parent":
        from app.models.masters.student_parent_association_model import StudentParentLink
        from sqlalchemy import text as _text

        pr = await db.execute(_text("SELECT id FROM parents WHERE user_id = :uid"), {"uid": str(user_id)})
        parent_id = pr.scalar_one_or_none()

        if not parent_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Parent profile not found")

        result = await db.execute(
            select(StudentParentLink).where(
                StudentParentLink.student_id == student_id,
                StudentParentLink.parent_id == parent_id,
            )
        )
        if not result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not the parent of this student")

    return await list_certificates(
        db=db,
        student_id=student_id,
        skip=skip,
        limit=limit,
    )


# ============================================================================
# POST /certificates/received — Upload Received Document (Admin ONLY)
# ============================================================================


@router.post("/received", status_code=status.HTTP_201_CREATED, response_model=CertificateRead)
async def create_received_document_endpoint(
    student_id: UUID = Form(...),
    certificate_type_id: UUID = Form(...),
    remarks: str | None = Form(None),
    file: UploadFile = File(...),
    request: Request = None,
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Upload a received document for a student (Category 1).

    **Admin ONLY.** Parent role is NOT allowed to upload anything.

    **Permission Required:** `student_certificates:create`
    """
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    user_id = UUID(current_user.get("sub"))
    tenant_schema = request.headers.get("cschema", "little_bunny")

    if role != "Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin can upload received documents",
        )

    await check_role_plan_permission_with_error(
        db, request, role, "student_certificates", "create"
    )

    return await create_received_document(
        db=db,
        student_id=student_id,
        certificate_type_id=certificate_type_id,
        remarks=remarks,
        file=file,
        tenant_schema=tenant_schema,
        actor_id=user_id,
        actor_role=role,
    )


# ============================================================================
# POST /certificates/issued — Issue a School Certificate (Admin ONLY)
# ============================================================================


@router.post("/issued", status_code=status.HTTP_201_CREATED, response_model=CertificateRead)
async def create_issued_certificate_endpoint(
    student_id: UUID = Form(...),
    certificate_type_id: UUID = Form(...),
    issue_date: date = Form(...),
    remarks: str | None = Form(None),
    file: UploadFile = File(...),
    request: Request = None,
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Issue a school certificate for a student (Category 2).

    **Admin ONLY.** Requires issue_date.

    **Permission Required:** `student_certificates:create`
    """
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    user_id = UUID(current_user.get("sub"))
    tenant_schema = request.headers.get("cschema", "little_bunny")

    if role != "Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin can issue certificates",
        )

    await check_role_plan_permission_with_error(
        db, request, role, "student_certificates", "create"
    )

    return await create_issued_certificate(
        db=db,
        student_id=student_id,
        certificate_type_id=certificate_type_id,
        issue_date=issue_date,
        remarks=remarks,
        file=file,
        tenant_schema=tenant_schema,
        actor_id=user_id,
        actor_role=role,
    )


# ============================================================================
# GET /certificates/received — List All Received Documents (Admin)
# ============================================================================


@router.get("/received", response_model=dict)
async def list_received_documents(
    student_id: UUID | None = None,
    certificate_type_id: UUID | None = None,
    skip: int = 0,
    limit: int = 50,
    request: Request = None,
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    List all received documents across all students.

    **Admin ONLY.**

    **Permission Required:** `student_certificates:list`
    """
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    if role != "Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin can access this endpoint",
        )

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
# GET /certificates/issued — List All Issued Certificates (Admin)
# ============================================================================


@router.get("/issued", response_model=dict)
async def list_issued_certificates(
    student_id: UUID | None = None,
    certificate_type_id: UUID | None = None,
    skip: int = 0,
    limit: int = 50,
    request: Request = None,
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    List all issued certificates across all students.

    **Admin ONLY.**

    **Permission Required:** `student_certificates:list`
    """
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    if role != "Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin can access this endpoint",
        )

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
# GET /certificates/by-student/{student_id} — Datatable for Admin
# ============================================================================


@router.get("/by-student/{student_id}", response_model=dict)
async def list_certificates_by_student(
    student_id: UUID,
    skip: int = 0,
    limit: int = 50,
    request: Request = None,
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    List all certificates for a specific student (Admin datatable view).

    **Admin ONLY.**

    **Permission Required:** `student_certificates:list`
    """
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    if role != "Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin can access this endpoint",
        )

    await check_role_plan_permission_with_error(
        db, request, role, "student_certificates", "list"
    )

    return await list_certificates(
        db=db,
        student_id=student_id,
        skip=skip,
        limit=limit,
    )


# ============================================================================
# GET /certificates/my-child/{student_id}/received — Parent VIEW ONLY
# ============================================================================


@router.get("/my-child/{student_id}/received", response_model=dict)
async def list_child_received_documents(
    student_id: UUID,
    skip: int = 0,
    limit: int = 50,
    request: Request = None,
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Parent views a child's received documents (no upload).

    **Permission Required:** `student_certificates:list_related` (Parent) or `student_certificates:list`
    """
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    user_id = UUID(current_user.get("sub"))

    await check_user_resource_access(db, request, "student_certificates", "list")

    if role == "Parent":
        from app.models.masters.student_parent_association_model import StudentParentLink
        from sqlalchemy import text as _text

        pr = await db.execute(_text("SELECT id FROM parents WHERE user_id = :uid"), {"uid": str(user_id)})
        parent_id = pr.scalar_one_or_none()

        if not parent_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Parent profile not found")

        result = await db.execute(
            select(StudentParentLink).where(
                StudentParentLink.student_id == student_id,
                StudentParentLink.parent_id == parent_id,
            )
        )
        if not result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not the parent of this student")

    return await list_certificates(
        db=db,
        student_id=student_id,
        skip=skip,
        limit=limit,
    )


# ============================================================================
# GET /certificates/my-child/{student_id}/issued — Parent + Student VIEW ONLY
# ============================================================================


@router.get("/my-child/{student_id}/issued", response_model=dict)
async def list_child_issued_certificates(
    student_id: UUID,
    skip: int = 0,
    limit: int = 50,
    request: Request = None,
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Parent or Student views issued certificates (no upload).

    **Permission Required:** `student_certificates:list_related` (Parent) or `student_certificates:list`
    """
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    user_id = UUID(current_user.get("sub"))

    await check_user_resource_access(db, request, "student_certificates", "list")

    if role == "Parent":
        from app.models.masters.student_parent_association_model import StudentParentLink
        from sqlalchemy import text as _text

        pr = await db.execute(_text("SELECT id FROM parents WHERE user_id = :uid"), {"uid": str(user_id)})
        parent_id = pr.scalar_one_or_none()

        if not parent_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Parent profile not found")

        result = await db.execute(
            select(StudentParentLink).where(
                StudentParentLink.student_id == student_id,
                StudentParentLink.parent_id == parent_id,
            )
        )
        if not result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not the parent of this student")
    elif role == "Student":
        result = await db.execute(select(Student).where(Student.id == student_id))
        student = result.scalar_one_or_none()
        if not student or student.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view your own certificates",
            )

    return await list_certificates(
        db=db,
        student_id=student_id,
        skip=skip,
        limit=limit,
    )


# ============================================================================
# GET /certificates/selector/classes — Admin cascade selector (step 1)
# ============================================================================


@router.get("/selector/classes", response_model=list[dict])
async def selector_get_classes(
    request: Request = None,
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Return all active classes for the Admin upload cascade selector.

    **Admin ONLY. Permission Required:** `student_certificates:list`
    """
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    if role != "Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin can access the student selector",
        )

    await check_role_plan_permission_with_error(
        db, request, role, "student_certificates", "list"
    )

    result = await db.execute(
        select(Class).where(Class.is_active == True).order_by(Class.name)
    )
    classes = result.scalars().all()
    return [{"id": str(c.id), "name": c.name} for c in classes]


# ============================================================================
# GET /certificates/selector/sections — Admin cascade selector (step 2)
# ============================================================================


@router.get("/selector/sections", response_model=list[dict])
async def selector_get_sections(
    class_id: UUID = Query(..., description="Class UUID"),
    request: Request = None,
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Return sections for a given class for the Admin upload cascade selector.

    **Admin ONLY. Permission Required:** `student_certificates:list`
    """
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    if role != "Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin can access the student selector",
        )

    await check_role_plan_permission_with_error(
        db, request, role, "student_certificates", "list"
    )

    result = await db.execute(
        select(Section)
        .where(Section.class_id == class_id)
        .order_by(Section.name)
    )
    sections = result.scalars().all()
    return [{"id": str(s.id), "name": s.name} for s in sections]


# ============================================================================
# GET /certificates/selector/students — Admin cascade selector (step 3)
# ============================================================================


@router.get("/selector/students", response_model=list[StudentSelectorItem])
async def selector_get_students(
    class_id: UUID = Query(..., description="Class UUID"),
    section_id: UUID | None = Query(None, description="Section UUID (optional)"),
    request: Request = None,
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Return students enrolled in a class (and optionally section) for the cascade selector.

    **Admin ONLY. Permission Required:** `student_certificates:list`
    """
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    if role != "Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin can access the student selector",
        )

    await check_role_plan_permission_with_error(
        db, request, role, "student_certificates", "list"
    )

    query = (
        select(Admission, Student)
        .join(Student, Student.id == Admission.student_id)
        .where(Admission.current_class_id == class_id)
    )
    if section_id:
        query = query.where(Admission.current_section_id == section_id)

    query = query.order_by(Student.first_name, Student.last_name)

    result = await db.execute(query)
    rows = result.all()

    return [
        StudentSelectorItem(
            student_id=row.Student.id,
            full_name=f"{row.Student.first_name} {row.Student.last_name}",
            admission_no=row.Admission.admission_number,
        )
        for row in rows
    ]


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
    read_action = "read_own" if role == "Student" else "read"
    await check_role_plan_permission_with_error(
        db, request, role, "student_certificates", read_action
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
    tenant_schema = request.headers.get("cschema", "little_bunny")

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
    tenant_schema = request.headers.get("cschema", "little_bunny")

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
    tenant_schema = request.headers.get("cschema", "little_bunny")

    # Permission check
    read_action = "read_own" if role == "Student" else "read"
    await check_role_plan_permission_with_error(
        db, request, role, "student_certificates", read_action
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
