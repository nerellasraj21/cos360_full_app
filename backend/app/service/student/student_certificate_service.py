import os
import logging
from uuid import UUID
from fastapi import UploadFile, File, Form, HTTPException, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from fastapi.responses import FileResponse
from typing import Optional
from datetime import date
from uuid import uuid4

from app.db.tenant_session import get_tenant_db
from app.models.student.student_certificate_model import CertificateIssue
from app.models.student.student_model import Student
from app.models.student.certificate_type_model import CertificateType
from app.schemas.student.certificate_schema import (
    CertificateIssueUpdate,
    CertificateIssueOut,
    CertificateFileResponse
)
from app.tools.error_handler import (
    create_error_response,
    create_validation_error,
    create_not_found_error,
    create_database_error,
    ErrorCategory
)
from app.tools.database_error_mapper import map_database_error

logger = logging.getLogger(__name__)

UPLOAD_DIR = "uploaded_certificates"
os.makedirs(UPLOAD_DIR, exist_ok=True)

MAX_FILE_SIZE = 5 * 1024 * 1024
ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".docx"}

async def upload_certificate(
    student_id: UUID = Form(...),
    certificate_type_id: UUID = Form(...),
    issue_date: Optional[date] = Form(None),
    remarks: Optional[str] = Form(None),
    certificate_file: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_tenant_db),
    request: Optional[Request] = None,
):
    """
    Upload a student certificate with comprehensive security and error handling

    Args:
        student_id: Student ID
        certificate_type_id: Certificate type ID
        issue_date: Date of issue (defaults to today)
        remarks: Optional remarks
        certificate_file: Uploaded certificate file
        db: Database session
        request: FastAPI request object for context

    Returns:
        Created certificate record

    Raises:
        HTTPException: For validation, security, or database errors
    """
    filepath = None
    try:
        # Validate student exists
        student_result = await db.execute(
            select(Student).where(Student.id == student_id)
        )
        student = student_result.scalar_one_or_none()
        if not student:
            raise create_not_found_error(
                message="Student not found",
                resource_type="student",
                resource_id=str(student_id),
                request=request
            )

        # Validate certificate type exists
        cert_type_result = await db.execute(
            select(CertificateType).where(CertificateType.id == certificate_type_id)
        )
        cert_type = cert_type_result.scalar_one_or_none()
        if not cert_type:
            raise create_not_found_error(
                message="Certificate type not found",
                resource_type="certificate_type",
                resource_id=str(certificate_type_id),
                request=request
            )

        if certificate_file:
            # Validate file is provided with filename
            if not certificate_file.filename:
                raise create_validation_error(
                    message="No file provided",
                    field="certificate_file",
                    request=request
                )

            # Security: Validate filename
            filename_str = str(certificate_file.filename).strip()
            if not filename_str or len(filename_str) > 255:
                raise create_validation_error(
                    message="Invalid filename",
                    field="filename",
                    value=filename_str,
                    request=request
                )

            # Security: Check for path traversal attempts
            if ".." in filename_str or "/" in filename_str or "\\" in filename_str:
                raise create_validation_error(
                    message="Invalid filename - path traversal not allowed",
                    field="filename",
                    value=filename_str,
                    request=request
                )

            # Security: Validate file extension
            file_extension = os.path.splitext(filename_str)[1].lower()
            if file_extension not in ALLOWED_EXTENSIONS:
                raise create_validation_error(
                    message=f"Invalid file extension. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
                    field="file_extension",
                    value=file_extension,
                    request=request
                )

            # Security: Validate content type
            if not certificate_file.content_type or certificate_file.content_type not in ALLOWED_CONTENT_TYPES:
                raise create_validation_error(
                    message="Invalid file type. Allowed: PDF, JPG, PNG, DOCX",
                    field="content_type",
                    value=certificate_file.content_type,
                    request=request
                )

            # Security: Read and validate file size
            file_contents = await certificate_file.read()
            if len(file_contents) == 0:
                raise create_validation_error(
                    message="Empty file not allowed",
                    field="file_size",
                    request=request
                )

            if len(file_contents) > MAX_FILE_SIZE:
                raise create_validation_error(
                    message=f"File too large. Maximum allowed size is {MAX_FILE_SIZE // (1024*1024)} MB",
                    field="file_size",
                    value=f"{len(file_contents) // (1024*1024)} MB",
                    request=request
                )

            # Security: Additional file content validation for PDFs
            if file_extension == ".pdf" and not file_contents.startswith(b'%PDF'):
                raise create_validation_error(
                    message="Invalid PDF file format",
                    field="file_content",
                    request=request
                )

            # Generate secure filename
            secure_filename = f"{uuid4()}{file_extension}"
            filepath = os.path.join(UPLOAD_DIR, secure_filename)

            # Save file securely
            try:
                with open(filepath, "wb") as buffer:
                    buffer.write(file_contents)
            except Exception as e:
                logger.error(f"Failed to save certificate file {secure_filename}: {str(e)}")
                raise create_error_response(
                    error_code=ErrorCategory.SYSTEM_ERROR,
                    message="Failed to save certificate file",
                    status_code=500,
                    request=request
                )

        cert = CertificateIssue(
            student_id=student_id,
            certificate_type_id=certificate_type_id,
            issue_date=issue_date or date.today(),
            remarks=remarks,
            file_path=filepath,
        )

        db.add(cert)
        await db.flush()

        # Load with relationships before commit
        result = await db.execute(
            select(CertificateIssue)
            .options(selectinload(CertificateIssue.certificate_type))
            .where(CertificateIssue.id == cert.id)
        )
        cert_with_relations = result.scalar_one()

        await db.commit()

        logger.info(f"Successfully uploaded certificate for student {student_id}")
        return cert_with_relations

    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error creating certificate: {str(e)}", exc_info=True)

        # Handle database-specific errors
        if "constraint" in str(e).lower() or "duplicate" in str(e).lower():
            result = map_database_error(e)
            if result:
                error_code, message, details = result
                raise create_database_error(
                    message=message,
                    constraint=details.get("constraint"),
                    request=request
                )

        # Generic system error
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create certificate: {str(e)}"
        )


async def get_all_certificates(db: AsyncSession = Depends(get_tenant_db)):
    result = await db.execute(select(CertificateIssue))
    return result.scalars().all()


async def get_certificate(certificate_id: UUID, db: AsyncSession = Depends(get_tenant_db)):
    result = await db.execute(select(CertificateIssue).where(CertificateIssue.id == certificate_id))
    cert = result.scalar_one_or_none()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
    return cert


async def update_certificate_file(
    certificate_id: UUID,
    certificate_type_id: Optional[int] = Form(None),
    issue_date: Optional[date] = Form(None),
    remarks: Optional[str] = Form(None),
    certificate_file: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_tenant_db),
    request: Optional[Request] = None,
):
    try:
        result = await db.execute(select(CertificateIssue).where(CertificateIssue.id == certificate_id))
        cert = result.scalar_one_or_none()
        if not cert:
            raise create_not_found_error(
                message="Certificate not found",
                resource_type="certificate",
                resource_id=str(certificate_id),
                request=request
            )

        old_file_path = None

        # If new file uploaded, save it and update path
        if certificate_file:
            old_file_path = cert.file_path

            # Validate file is provided with filename
            if not certificate_file.filename:
                raise create_validation_error(
                    message="No file provided",
                    field="certificate_file",
                    request=request
                )

            # Security: Validate filename
            filename_str = str(certificate_file.filename).strip()
            if not filename_str or len(filename_str) > 255:
                raise create_validation_error(
                    message="Invalid filename",
                    field="filename",
                    value=filename_str,
                    request=request
                )

            # Security: Check for path traversal attempts
            if ".." in filename_str or "/" in filename_str or "\\" in filename_str:
                raise create_validation_error(
                    message="Invalid filename - path traversal not allowed",
                    field="filename",
                    value=filename_str,
                    request=request
                )

            # Security: Validate file extension
            file_extension = os.path.splitext(filename_str)[1].lower()
            if file_extension not in ALLOWED_EXTENSIONS:
                raise create_validation_error(
                    message=f"Invalid file extension. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
                    field="file_extension",
                    value=file_extension,
                    request=request
                )

            # Security: Validate content type
            if not certificate_file.content_type or certificate_file.content_type not in ALLOWED_CONTENT_TYPES:
                raise create_validation_error(
                    message="Invalid file type. Allowed: PDF, JPG, PNG, DOCX",
                    field="content_type",
                    value=certificate_file.content_type,
                    request=request
                )

            # Security: Read and validate file size
            file_contents = await certificate_file.read()
            if len(file_contents) == 0:
                raise create_validation_error(
                    message="Empty file not allowed",
                    field="file_size",
                    request=request
                )

            if len(file_contents) > MAX_FILE_SIZE:
                raise create_validation_error(
                    message=f"File too large. Maximum allowed size is {MAX_FILE_SIZE // (1024*1024)} MB",
                    field="file_size",
                    value=f"{len(file_contents) // (1024*1024)} MB",
                    request=request
                )

            # Security: Additional file content validation for PDFs
            if file_extension == ".pdf" and not file_contents.startswith(b'%PDF'):
                raise create_validation_error(
                    message="Invalid PDF file format",
                    field="file_content",
                    request=request
                )

            # Generate secure filename
            secure_filename = f"{uuid4()}{file_extension}"
            filepath = os.path.join(UPLOAD_DIR, secure_filename)

            # Save file securely
            try:
                with open(filepath, "wb") as buffer:
                    buffer.write(file_contents)
            except Exception as file_error:
                logger.error(f"Failed to save certificate file {secure_filename}: {str(file_error)}")
                raise create_error_response(
                    error_code=ErrorCategory.SYSTEM_ERROR,
                    message="Failed to save certificate file",
                    status_code=500,
                    request=request
                )

            cert.file_path = filepath

        if certificate_type_id is not None:
            cert.certificate_type_id = certificate_type_id
        if issue_date is not None:
            cert.issue_date = issue_date
        if remarks is not None:
            cert.remarks = remarks

        await db.flush()

        # Fetch with relationships before commit to avoid schema context loss
        result = await db.execute(
            select(CertificateIssue)
            .options(selectinload(CertificateIssue.certificate_type))
            .where(CertificateIssue.id == certificate_id)
        )
        updated_cert = result.scalar_one()

        await db.commit()

        # Clean up old file after successful commit
        if old_file_path and os.path.exists(old_file_path):
            try:
                os.remove(old_file_path)
                logger.info(f"Cleaned up old certificate file: {old_file_path}")
            except Exception as cleanup_error:
                logger.warning(f"Failed to clean up old file {old_file_path}: {str(cleanup_error)}")

        logger.info(f"Successfully updated certificate {certificate_id}")
        return updated_cert

    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error updating certificate {certificate_id}: {str(e)}")

        if "constraint" in str(e).lower() or "duplicate" in str(e).lower():
            error_code, message, details = map_database_error(e)
            raise create_database_error(
                message=message,
                constraint=details.get("constraint"),
                request=request
            )

        raise create_error_response(
            error_code=ErrorCategory.SYSTEM_ERROR,
            message="Failed to update certificate",
            status_code=500,
            request=request
        )


async def delete_certificate_file(
    certificate_id: UUID,
    db: AsyncSession = Depends(get_tenant_db),
    request: Optional[Request] = None
):
    try:
        result = await db.execute(select(CertificateIssue).where(CertificateIssue.id == certificate_id))
        cert = result.scalar_one_or_none()
        if not cert:
            raise create_not_found_error(
                message="Certificate not found",
                resource_type="certificate",
                resource_id=str(certificate_id),
                request=request
            )

        file_path = cert.file_path

        await db.delete(cert)
        await db.commit()

        # Clean up file after successful database deletion
        if file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
                logger.info(f"Successfully deleted certificate file: {file_path}")
            except Exception as cleanup_error:
                logger.warning(f"Failed to delete file {file_path}: {str(cleanup_error)}")

        logger.info(f"Successfully deleted certificate {certificate_id}")
        return {"detail": "Certificate deleted successfully"}

    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error deleting certificate {certificate_id}: {str(e)}")
        raise create_error_response(
            error_code=ErrorCategory.SYSTEM_ERROR,
            message="Failed to delete certificate",
            status_code=500,
            request=request
        )

async def download_certificate_file(certificate_id: UUID, db: AsyncSession = Depends(get_tenant_db)):
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


async def list_all_certificates_of_student(student_id: UUID, db: AsyncSession = Depends(get_tenant_db)):
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
    
async def get_all_certificate_types(db: AsyncSession):
    result = await db.execute(select(CertificateType))
    return result.scalars().all()
