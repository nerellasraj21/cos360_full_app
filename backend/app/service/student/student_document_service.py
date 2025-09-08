import os
from uuid import UUID
from fastapi import Depends, HTTPException, Form, File, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.tenant_session import get_tenant_db
from uuid import uuid4
from datetime import datetime
from app.models.student.student_model import Student
from app.models.student.student_document_model import StudentDocument
from app.schemas.student.student_document_schema import (
    StudentDocumentUpdate
)

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
):
    try:
        # Validate content type
        if document_file.content_type not in ALLOWED_CONTENT_TYPES:
            raise HTTPException(status_code=400, detail="Invalid file type. Allowed: PDF, JPG, PNG")

        # Read contents to validate size
        file_contents = await document_file.read()
        if len(file_contents) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="File too large. Max allowed is 5 MB")
        
        # Save uploaded file
        filename_str = str(document_file.filename)
        extension = os.path.splitext(filename_str)[-1]
        filename = f"{uuid4()}{extension}"
        filepath = os.path.join(UPLOAD_DIR, filename)

        with open(filepath, "wb") as buffer:
            buffer.write(await document_file.read())

        # Create DB entry
        new_doc = StudentDocument(
            student_id=student_id,
            document_type=document_type,
            file_path=filepath,
            upload_date=datetime.now(),
        )

        db.add(new_doc)
        await db.commit()
        await db.refresh(new_doc)
        return new_doc

    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating document: {str(e)}")


# Get all documents (optionally filter by student)
async def get_documents_by_student(student_id: UUID, db: AsyncSession = Depends(get_tenant_db)):
    try:
        # Check if the student exists
        student_result = await db.execute(
            select(Student).where(Student.id == student_id)
        )
        student = student_result.scalar_one_or_none()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        
        stmt = select(StudentDocument)
        if student_id:
            stmt = stmt.where(StudentDocument.student_id == student_id)
        result = await db.execute(stmt)
        return result.scalars().all()
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching documents: {str(e)}")


# Get single document by ID
async def get_document_by_id(document_id: UUID, db: AsyncSession = Depends(get_tenant_db)):
    result = await db.execute(select(StudentDocument).where(StudentDocument.id == document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


# Update document
async def update_document_file(
    document_id: UUID,
    document_type: str = Form(...),
    document_file: UploadFile = File(...),
    db: AsyncSession = Depends(get_tenant_db),
):
    try:
        # Fetch the existing document
        result = await db.execute(select(StudentDocument).where(StudentDocument.id == document_id))
        existing_doc = result.scalar_one_or_none()
        if not existing_doc:
            raise HTTPException(status_code=404, detail="Document not found")

        # Validate file type
        if document_file.content_type not in ALLOWED_CONTENT_TYPES:
            raise HTTPException(
                status_code=400,
                detail="Invalid file type. Allowed types: PDF, JPG, PNG, DOCX"
            )

        # Read contents and validate size
        file_contents = await document_file.read()
        if len(file_contents) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail="File too large. Max allowed size is 5 MB"
            )

        # Generate new filename and save
        filename_str = str(document_file.filename)
        extension = os.path.splitext(filename_str)[-1]
        filename = f"{uuid4()}{extension}"
        filepath = os.path.join(UPLOAD_DIR, filename)

        with open(filepath, "wb") as buffer:
            buffer.write(file_contents)

        # Optional: Delete old file
        if existing_doc.file_path and os.path.exists(existing_doc.file_path):
            os.remove(existing_doc.file_path)

        # Update fields
        existing_doc.document_type = document_type
        existing_doc.file_path = filepath
        existing_doc.upload_date = datetime.now()

        await db.commit()
        await db.refresh(existing_doc)
        return existing_doc

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating document: {str(e)}")


# Delete document
async def delete_document_file(document_id: UUID, db: AsyncSession = Depends(get_tenant_db)):
    try:
        result = await db.execute(select(StudentDocument).where(StudentDocument.id == document_id))
        doc = result.scalar_one_or_none()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        await db.delete(doc)
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting document: {str(e)}")
