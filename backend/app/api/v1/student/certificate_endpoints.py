import os
from fastapi import APIRouter, UploadFile, File, Form, Depends, Request, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.responses import FileResponse
from typing import List, Optional
from datetime import date

from app.db.session import get_db
from app.schemas.student.certificate_schema import (
    CertificateIssueOut,
    CertificateIssueUpdate,
    CertificateFileResponse
)
from uuid import UUID
from app.schemas.student.certificate_type_schema import CertificateTypeOut
from app.service.student.student_certificate_service import list_all_certificates_of_student,download_certificate_file,get_all_certificates,upload_certificate,update_certificate_file,delete_certificate_file,get_certificate,get_all_certificate_types
from app.tools.simple_permissions import check_role_permission, get_current_user_token, check_role_plan_permission_with_error

router = APIRouter(prefix="/student/certificates", tags=["Student/Student Certificates"])

UPLOAD_DIR = "uploaded_certificates"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/", status_code=201)
async def create_certificate(
    student_id: UUID = Form(...),
    certificate_type_id: UUID = Form(...),
    issue_date: Optional[date] = Form(None),
    description: Optional[str] = Form(None),
    certificate_file: Optional[UploadFile] = File(None),
    request: Request = None,
    db: AsyncSession = Depends(get_db),
):
    """Create student certificate - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'student_certificates', 'create')
    
    return await upload_certificate(student_id,certificate_type_id,issue_date,description,certificate_file,db)


@router.get("/")
async def get_certificates(request: Request, db: AsyncSession = Depends(get_db)):
    """Get all certificates - All authenticated users"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'student_certificates', 'list')
    
    return await get_all_certificates(db)


@router.get("/certificateid/{certificate_id}")
async def get_certificate_by_id(certificate_id: UUID, request: Request, db: AsyncSession = Depends(get_db)):
    """Get certificate by ID - All authenticated users"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'student_certificates', 'read')
    
    return await get_certificate(certificate_id,db)


@router.patch("/{certificate_id}")
async def update_certificate(
    certificate_id: UUID,
    certificate_type_id: UUID = Form(...),
    issue_date: Optional[date] = Form(None),
    remarks: Optional[str] = Form(None),
    certificate_file: Optional[UploadFile] = File(None),
    request: Request = None,
    db: AsyncSession = Depends(get_db),
):
    """Update certificate - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'student_certificates', 'update')
    
    return await update_certificate_file(certificate_id,certificate_type_id,issue_date,remarks,certificate_file,db)


@router.delete("/{certificate_id}")
async def delete_certificate(certificate_id: UUID, request: Request, db: AsyncSession = Depends(get_db)):
    """Delete certificate - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'student_certificates', 'delete')
    
    return await delete_certificate_file(certificate_id,db)

@router.get("/certificates/{certificate_id}/download", response_class=FileResponse)
async def download_certificate(certificate_id: UUID, request: Request, db: AsyncSession = Depends(get_db)):
    """Download certificate file - All authenticated users"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'student_certificates', 'read')
    
    return await download_certificate_file(certificate_id,db)


@router.get("/student/{student_id}", response_model=List[CertificateFileResponse])
async def list_certificates_for_student(student_id: UUID, request: Request, db: AsyncSession = Depends(get_db)):
    """List certificates for specific student - All authenticated users"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'student_certificates', 'list')
    
    return await list_all_certificates_of_student(student_id,db)

@router.get("/certificate-types", response_model=List[CertificateTypeOut])
async def list_certificate_types(request: Request, db: AsyncSession = Depends(get_db)):
    """List certificate types - All authenticated users"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'student_certificates', 'list')
    
    return await get_all_certificate_types(db)
