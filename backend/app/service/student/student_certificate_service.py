import os
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi.responses import FileResponse
from typing import List, Optional
from datetime import date
from uuid import uuid4

from app.db.session import get_db
from app.models.student.student_certificate_model import CertificateIssue
from app.schemas.student.certificate_schema import (
    CertificateIssueOut,
    CertificateIssueUpdate,
    CertificateType,
    CertificateFileResponse
)

UPLOAD_DIR = "uploaded_certificates"
os.makedirs(UPLOAD_DIR, exist_ok=True)

async def upload_certificate(
    student_id: int = Form(...),
    certificate_type: CertificateType = Form(...),
    issue_date: Optional[date] = Form(None),
    description: Optional[str] = Form(None),
    certificate_file: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
):
    try:
        filename = None
        if certificate_file:
            filename_str = str(certificate_file.filename)
            extension = os.path.splitext(filename_str)[-1]
            filename = f"{uuid4()}{extension}"
            filepath = os.path.join(UPLOAD_DIR, filename)
            with open(filepath, "wb") as buffer:
                buffer.write(await certificate_file.read())

        cert = CertificateIssue(
            student_id=student_id,
            certificate_type=certificate_type,
            issue_date=issue_date or date.today(),
            description=description,
            certificate_file=filename,
        )

        db.add(cert)
        await db.commit()
        await db.refresh(cert)
        return cert

    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating certificate: {str(e)}")


async def get_all_certificates(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CertificateIssue))
    return result.scalars().all()


async def get_certificate(certificate_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CertificateIssue).where(CertificateIssue.id == certificate_id))
    cert = result.scalar_one_or_none()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
    return cert


async def update_certificate_file(
    certificate_id: int,
    update_data: CertificateIssueUpdate,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(CertificateIssue).where(CertificateIssue.id == certificate_id))
    cert = result.scalar_one_or_none()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")

    for field, value in update_data.dict(exclude_unset=True).items():
        setattr(cert, field, value)

    await db.commit()
    await db.refresh(cert)
    return cert


async def delete_certificate_file(certificate_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CertificateIssue).where(CertificateIssue.id == certificate_id))
    cert = result.scalar_one_or_none()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")

    await db.delete(cert)
    await db.commit()
    return {"detail": "Certificate deleted successfully"}

async def download_certificate_file(certificate_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CertificateIssue).where(CertificateIssue.id == certificate_id))
    certificate = result.scalar_one_or_none()
    
    if not certificate:
        raise HTTPException(status_code=404, detail="Certificate not found")
    
    file_path_str = str(certificate.file_path or "").strip()

    if not file_path_str:
        raise HTTPException(status_code=404, detail="Certificate file path not found")
    
    if not os.path.isfile(file_path_str):
        raise HTTPException(status_code=404, detail="Certificate file does not exist on disk")

    # Use FileResponse to return the file for download
    return FileResponse(path=file_path_str, filename=os.path.basename(file_path_str), media_type = 'application/pdf')# For Direct Download change media_type='application/octet-stream')


async def list_all_certificates_of_student(student_id: int, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(
            select(CertificateIssue).where(CertificateIssue.student_id == student_id)
        )
        certificates = result.scalars().all()

        if not certificates:
            raise HTTPException(status_code=404, detail="No certificates found for this student")

        file_list = []
        for cert in certificates:
            file_path = str(cert.file_path or "").strip()
            file_exists = os.path.isfile(file_path) if file_path else False

            file_list.append(
                CertificateFileResponse(
                    certificate_type=str(cert.certificate_type or ""),
                    issue_date=cert.issue_date,
                    file_path=str(cert.file_path or ""),
                    exists_on_disk=file_exists
                )
            )

        return file_list

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing certificates: {str(e)}")
