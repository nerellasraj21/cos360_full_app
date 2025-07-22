import os
from fastapi import APIRouter, UploadFile, File, Form, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.responses import FileResponse
from typing import List, Optional
from datetime import date

from app.db.session import get_db
from app.schemas.student.certificate_schema import (
    CertificateIssueOut,
    CertificateIssueUpdate,
    CertificateType,
    CertificateFileResponse
)

from app.service.student.student_certificate_service import list_all_certificates_of_student,download_certificate_file,get_all_certificates,upload_certificate,update_certificate_file,delete_certificate_file,get_certificate

router = APIRouter(prefix="/certificates", tags=["Certificates"])

UPLOAD_DIR = "uploaded_certificates"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/", response_model=CertificateIssueOut, status_code=201)
async def create_certificate(
    student_id: int = Form(...),
    certificate_type: CertificateType = Form(...),
    issue_date: Optional[date] = Form(None),
    description: Optional[str] = Form(None),
    certificate_file: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
):
    return await upload_certificate(student_id,certificate_type,issue_date,description,certificate_file,db)


@router.get("/", response_model=List[CertificateIssueOut])
async def get_certificates(db: AsyncSession = Depends(get_db)):
    return await get_all_certificates(db)


@router.get("/{certificate_id}", response_model=CertificateIssueOut)
async def get_certificate_by_id(certificate_id: int, db: AsyncSession = Depends(get_db)):
    return await get_certificate(certificate_id,db)


@router.patch("/{certificate_id}", response_model=CertificateIssueOut)
async def update_certificate(
    certificate_id: int,
    update_data: CertificateIssueUpdate,
    db: AsyncSession = Depends(get_db)
):
    return await update_certificate_file(certificate_id,update_data,db)


@router.delete("/{certificate_id}")
async def delete_certificate(certificate_id: int, db: AsyncSession = Depends(get_db)):
    return await delete_certificate_file(certificate_id,db)

@router.get("/certificates/{certificate_id}/download", response_class=FileResponse)
async def download_certificate(certificate_id: int, db: AsyncSession = Depends(get_db)):
    return await download_certificate_file(certificate_id,db)


@router.get("/student/{student_id}", response_model=List[CertificateFileResponse])
async def list_certificates_for_student(student_id: int, db: AsyncSession = Depends(get_db)):
    return await list_all_certificates_of_student(student_id,db)
