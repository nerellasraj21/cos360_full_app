from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.session import get_db
from app.models.student.student_document_model import StudentDocument
from app.schemas.student.student_document_schema import (
    StudentDocumentCreate,
    StudentDocumentUpdate,
    StudentDocumentOut
)

# Create document
async def upload_document(document: StudentDocumentCreate, db: AsyncSession = Depends(get_db)):
    try:
        new_doc = StudentDocument(**document.dict())
        db.add(new_doc)
        await db.commit()
        await db.refresh(new_doc)
        return new_doc
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating document: {str(e)}")


# Get all documents (optionally filter by student)
async def get_documents_by_student(student_id: int, db: AsyncSession = Depends(get_db)):
    try:
        stmt = select(StudentDocument)
        if student_id:
            stmt = stmt.where(StudentDocument.student_id == student_id)
        result = await db.execute(stmt)
        return result.scalars().all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching documents: {str(e)}")


# Get single document by ID
async def get_document_by_id(document_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(StudentDocument).where(StudentDocument.id == document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


# Update document
async def update_document_file(document_id: int, document_data: StudentDocumentUpdate, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(StudentDocument).where(StudentDocument.id == document_id))
        document = result.scalar_one_or_none()
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")

        for field, value in document_data.dict(exclude_unset=True).items():
            setattr(document, field, value)

        await db.commit()
        await db.refresh(document)
        return document
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating document: {str(e)}")


# Delete document
async def delete_document_file(document_id: int, db: AsyncSession = Depends(get_db)):
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
