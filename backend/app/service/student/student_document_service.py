import os
import shutil
from uuid import UUID
from fastapi import Depends, HTTPException, Form, File, UploadFile, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.db.tenant_session import get_tenant_db
from uuid import uuid4
from datetime import datetime
from typing import Optional
from app.models.student.student_model import Student
from app.models.student.student_document_model import StudentDocument
from app.schemas.student.student_document_schema import (
    StudentDocumentUpdate
)
from app.tools.error_handler import (
    create_error_response,
    create_validation_error,
    create_not_found_error,
    create_business_rule_error,
    create_database_error,
    ErrorCategory
)
from app.tools.database_error_mapper import map_database_error
import logging

logger = logging.getLogger(__name__)

UPLOAD_DIR = "student_documents"
os.makedirs(UPLOAD_DIR, exist_ok=True)

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",  # DOCX
}

async def upload_document(
    student_id: UUID = Form(...),
    document_type: str = Form(...),
    document_file: UploadFile = File(...),
    db: AsyncSession = Depends(get_tenant_db),
    request: Optional[Request] = None,
):
    """
    Upload a student document with comprehensive security and error handling
    
    Args:
        student_id: Student ID
        document_type: Type of document
        document_file: Uploaded file
        db: Database session
        request: FastAPI request object for context
        
    Returns:
        Created document record
        
    Raises:
        HTTPException: For validation, security, or database errors
    """
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
        
        # Validate document type
        if not document_type or not document_type.strip():
            raise create_validation_error(
                message="Document type is required",
                field="document_type",
                request=request
            )
        
        # Validate file is provided
        if not document_file or not document_file.filename:
            raise create_validation_error(
                message="No file provided",
                field="document_file",
                request=request
            )
        
        # Security: Validate filename
        filename_str = str(document_file.filename).strip()
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
        allowed_extensions = {".pdf", ".jpg", ".jpeg", ".png", ".docx"}
        file_extension = os.path.splitext(filename_str)[1].lower()
        if file_extension not in allowed_extensions:
            raise create_validation_error(
                message=f"Invalid file extension. Allowed: {', '.join(allowed_extensions)}",
                field="file_extension",
                value=file_extension,
                request=request
            )
        
        # Security: Validate content type
        if not document_file.content_type or document_file.content_type not in ALLOWED_CONTENT_TYPES:
            raise create_validation_error(
                message="Invalid file type. Allowed: PDF, JPG, PNG, DOCX",
                field="content_type",
                value=document_file.content_type,
                request=request
            )
        
        # Security: Read and validate file size
        file_contents = await document_file.read()
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
        
        # Security: Additional file content validation
        if file_extension == ".pdf" and not file_contents.startswith(b'%PDF'):
            raise create_validation_error(
                message="Invalid PDF file format",
                field="file_content",
                request=request
            )
        
        # Check for duplicate document type for this student
        existing_doc = await db.execute(
            select(StudentDocument).where(
                StudentDocument.student_id == student_id,
                StudentDocument.document_type == document_type
            )
        )
        if existing_doc.scalar_one_or_none():
            raise create_business_rule_error(
                message=f"Document of type '{document_type}' already exists for this student",
                rule="unique_document_type_per_student",
                request=request
            )
        
        # Generate secure filename
        secure_filename = f"{uuid4()}{file_extension}"
        filepath = os.path.join(UPLOAD_DIR, secure_filename)
        
        # Security: Ensure upload directory exists and is secure
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        
        # Save file securely
        try:
            with open(filepath, "wb") as buffer:
                buffer.write(file_contents)
        except Exception as e:
            logger.error(f"Failed to save file {secure_filename}: {str(e)}")
            raise create_error_response(
                error_code=ErrorCategory.SYSTEM_ERROR,
                message="Failed to save uploaded file",
                status_code=500,
                request=request
            )
        
        # Create DB entry
        new_doc = StudentDocument(
            student_id=student_id,
            document_type=document_type,
            file_path=filepath,
            upload_date=datetime.now(),
        )

        db.add(new_doc)
        await db.flush()
        
        # Load with relationships before commit
        result = await db.execute(
            select(StudentDocument)
            .options(selectinload(StudentDocument.student))
            .where(StudentDocument.id == new_doc.id)
        )
        document_with_relations = result.scalar_one()
        
        await db.commit()
        
        logger.info(f"Successfully uploaded document {secure_filename} for student {student_id}")
        return document_with_relations

    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error uploading document for student {student_id}: {str(e)}")
        
        # Handle database-specific errors
        if "constraint" in str(e).lower() or "duplicate" in str(e).lower():
            error_code, message, details = map_database_error(e)
            raise create_database_error(
                message=message,
                constraint=details.get("constraint"),
                request=request
            )
        
        # Generic system error
        raise create_error_response(
            error_code=ErrorCategory.SYSTEM_ERROR,
            message="Failed to upload document",
            status_code=500,
            request=request
        )


async def get_documents_by_student(
    student_id: UUID, 
    db: AsyncSession = Depends(get_tenant_db),
    request: Optional[Request] = None
):
    """
    Get all documents for a student with comprehensive error handling
    
    Args:
        student_id: Student ID
        db: Database session
        request: FastAPI request object for context
        
    Returns:
        List of student documents
        
    Raises:
        HTTPException: For not found or database errors
    """
    try:
        # Check if the student exists
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
        
        stmt = select(StudentDocument).where(StudentDocument.student_id == student_id)
        result = await db.execute(stmt)
        return result.scalars().all()
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching documents for student {student_id}: {str(e)}")
        raise create_error_response(
            error_code=ErrorCategory.SYSTEM_ERROR,
            message="Failed to fetch documents",
            status_code=500,
            request=request
        )

async def get_document_by_id(
    document_id: UUID, 
    db: AsyncSession = Depends(get_tenant_db),
    request: Optional[Request] = None
):
    """
    Get single document by ID with comprehensive error handling
    
    Args:
        document_id: Document ID
        db: Database session
        request: FastAPI request object for context
        
    Returns:
        Document record
        
    Raises:
        HTTPException: For not found or database errors
    """
    try:
        result = await db.execute(
            select(StudentDocument)
            .options(selectinload(StudentDocument.student))
            .where(StudentDocument.id == document_id)
        )
        doc = result.scalar_one_or_none()
        
        if not doc:
            raise create_not_found_error(
                message="Document not found",
                resource_type="document",
                resource_id=str(document_id),
                request=request
            )
        
        return doc
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching document {document_id}: {str(e)}")
        raise create_error_response(
            error_code=ErrorCategory.SYSTEM_ERROR,
            message="Failed to fetch document",
            status_code=500,
            request=request
        )


async def update_document_file(
    document_id: UUID,
    document_type: str = Form(...),
    document_file: UploadFile = File(...),
    db: AsyncSession = Depends(get_tenant_db),
    request: Optional[Request] = None,
):
    """
    Update document file with comprehensive security and error handling
    
    Args:
        document_id: Document ID
        document_type: Type of document
        document_file: New uploaded file
        db: Database session
        request: FastAPI request object for context
        
    Returns:
        Updated document record
        
    Raises:
        HTTPException: For validation, security, or database errors
    """
    try:
        # Fetch the existing document
        result = await db.execute(
            select(StudentDocument)
            .options(selectinload(StudentDocument.student))
            .where(StudentDocument.id == document_id)
        )
        existing_doc = result.scalar_one_or_none()
        if not existing_doc:
            raise create_not_found_error(
                message="Document not found",
                resource_type="document",
                resource_id=str(document_id),
                request=request
            )

        # Validate document type
        if not document_type or not document_type.strip():
            raise create_validation_error(
                message="Document type is required",
                field="document_type",
                request=request
            )
        
        # Validate file is provided
        if not document_file or not document_file.filename:
            raise create_validation_error(
                message="No file provided",
                field="document_file",
                request=request
            )
        
        # Security: Validate filename
        filename_str = str(document_file.filename).strip()
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
        allowed_extensions = {".pdf", ".jpg", ".jpeg", ".png", ".docx"}
        file_extension = os.path.splitext(filename_str)[1].lower()
        if file_extension not in allowed_extensions:
            raise create_validation_error(
                message=f"Invalid file extension. Allowed: {', '.join(allowed_extensions)}",
                field="file_extension",
                value=file_extension,
                request=request
            )

        # Security: Validate content type
        if not document_file.content_type or document_file.content_type not in ALLOWED_CONTENT_TYPES:
            raise create_validation_error(
                message="Invalid file type. Allowed: PDF, JPG, PNG, DOCX",
                field="content_type",
                value=document_file.content_type,
                request=request
            )

        # Security: Read and validate file size
        file_contents = await document_file.read()
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
        
        # Security: Additional file content validation
        if file_extension == ".pdf" and not file_contents.startswith(b'%PDF'):
            raise create_validation_error(
                message="Invalid PDF file format",
                field="file_content",
                request=request
            )

        # Generate secure filename
        secure_filename = f"{uuid4()}{file_extension}"
        filepath = os.path.join(UPLOAD_DIR, secure_filename)

        # Save new file securely
        try:
            with open(filepath, "wb") as buffer:
                buffer.write(file_contents)
        except Exception as e:
            logger.error(f"Failed to save file {secure_filename}: {str(e)}")
            raise create_error_response(
                error_code=ErrorCategory.SYSTEM_ERROR,
                message="Failed to save uploaded file",
                status_code=500,
                request=request
            )

        # Store old file path for cleanup
        old_file_path = existing_doc.file_path

        # Update fields
        existing_doc.document_type = document_type
        existing_doc.file_path = filepath
        existing_doc.upload_date = datetime.now()

        await db.flush()
        
        # Load with relationships before commit
        result = await db.execute(
            select(StudentDocument)
            .options(selectinload(StudentDocument.student))
            .where(StudentDocument.id == document_id)
        )
        updated_doc = result.scalar_one()

        await db.commit()
        
        # Clean up old file after successful commit
        try:
            if old_file_path and os.path.exists(old_file_path):
                os.remove(old_file_path)
                logger.info(f"Cleaned up old file: {old_file_path}")
        except Exception as e:
            logger.warning(f"Failed to clean up old file {old_file_path}: {str(e)}")
        
        logger.info(f"Successfully updated document {secure_filename} for document {document_id}")
        return updated_doc

    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error updating document {document_id}: {str(e)}")
        
        # Handle database-specific errors
        if "constraint" in str(e).lower() or "duplicate" in str(e).lower():
            error_code, message, details = map_database_error(e)
            raise create_database_error(
                message=message,
                constraint=details.get("constraint"),
                request=request
            )
        
        # Generic system error
        raise create_error_response(
            error_code=ErrorCategory.SYSTEM_ERROR,
            message="Failed to update document",
            status_code=500,
            request=request
        )

async def delete_document_file(
    document_id: UUID, 
    db: AsyncSession = Depends(get_tenant_db),
    request: Optional[Request] = None
):
    """
    Delete document file with comprehensive error handling and cleanup
    
    Args:
        document_id: Document ID
        db: Database session
        request: FastAPI request object for context
        
    Returns:
        Success message
        
    Raises:
        HTTPException: For not found or database errors
    """
    try:
        result = await db.execute(
            select(StudentDocument).where(StudentDocument.id == document_id)
        )
        doc = result.scalar_one_or_none()
        
        if not doc:
            raise create_not_found_error(
                message="Document not found",
                resource_type="document",
                resource_id=str(document_id),
                request=request
            )
        
        # Store file path for cleanup
        file_path = doc.file_path
        
        # Delete from database
        await db.delete(doc)
        await db.commit()
        
        # Clean up file after successful database deletion
        try:
            if file_path and os.path.exists(file_path):
                os.remove(file_path)
                logger.info(f"Successfully deleted file: {file_path}")
        except Exception as e:
            logger.warning(f"Failed to delete file {file_path}: {str(e)}")
        
        logger.info(f"Successfully deleted document {document_id}")
        return {"detail": "Document deleted successfully"}
        
    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error deleting document {document_id}: {str(e)}")
        raise create_error_response(
            error_code=ErrorCategory.SYSTEM_ERROR,
            message="Failed to delete document",
            status_code=500,
            request=request
        )
