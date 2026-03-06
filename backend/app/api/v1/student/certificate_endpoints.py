from datetime import date
import os
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_tenant_db
from app.schemas.student.certificate_schema import CertificateFileResponse
from app.schemas.student.certificate_type_schema import CertificateTypeRead
from app.service.student.student_certificate_service import (
    delete_certificate_file,
    download_certificate_file,
    get_all_certificate_types,
    get_all_certificates,
    get_certificate,
    list_all_certificates_of_student,
    update_certificate_file,
    upload_certificate,
)
from app.tools.simple_permissions import (
    check_role_plan_permission_with_error,
    get_current_user_token,
)

router = APIRouter(prefix="/student/certificates", tags=["Student/Student Certificates"])

UPLOAD_DIR = "uploaded_certificates"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/", status_code=201)
async def create_certificate(
    student_id: UUID = Form(...),
    certificate_type_id: UUID = Form(...),
    issue_date: date | None = Form(None),
    remarks: str | None = Form(None),
    certificate_file: UploadFile | None = File(None),
    request: Request = None,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Create student certificate - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "student_certificates", "create")

    return await upload_certificate(student_id, certificate_type_id, issue_date, remarks, certificate_file, db, request)


@router.get("/")
async def get_certificates(request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """Get all certificates - All authenticated users"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "student_certificates", "list")

    return await get_all_certificates(db)


@router.get("/certificateid/{certificate_id}")
async def get_certificate_by_id(certificate_id: UUID, request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """Get certificate by ID - All authenticated users"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "student_certificates", "read")

    return await get_certificate(certificate_id, db)


@router.patch("/{certificate_id}")
async def update_certificate(
    certificate_id: UUID,
    certificate_type_id: UUID = Form(...),
    issue_date: date | None = Form(None),
    remarks: str | None = Form(None),
    certificate_file: UploadFile | None = File(None),
    request: Request = None,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Update certificate - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "student_certificates", "update")

    return await update_certificate_file(
        certificate_id, certificate_type_id, issue_date, remarks, certificate_file, db, request
    )


@router.delete("/{certificate_id}")
async def delete_certificate(certificate_id: UUID, request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """Delete certificate - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "student_certificates", "delete")

    return await delete_certificate_file(certificate_id, db, request)


@router.get("/certificates/{certificate_id}/download", response_class=FileResponse)
async def download_certificate(certificate_id: UUID, request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """Download certificate file - All authenticated users"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "student_certificates", "read")

    return await download_certificate_file(certificate_id, db)


@router.get("/student/{student_id}", response_model=list[CertificateFileResponse])
async def list_certificates_for_student(student_id: UUID, request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """List certificates for specific student - All authenticated users"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "student_certificates", "list")

    return await list_all_certificates_of_student(student_id, db)


@router.get("/certificate-types", response_model=list[CertificateTypeRead])
async def list_certificate_types(request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """List certificate types - All authenticated users"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "student_certificates", "list")

    return await get_all_certificate_types(db)
