from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.session import get_db
from app.models.masters.student_document_model import StudentDocument
from app.schemas.masters.student_document_schema import (
    StudentDocumentCreate,
    StudentDocumentUpdate,
    StudentDocumentOut
)

router = APIRouter(prefix="/students/documents", tags=["Student Documents"])

# Create document
@router.post("/", response_model=StudentDocumentOut, status_code=201)
async def create_document(document: StudentDocumentCreate, db: AsyncSession = Depends(get_db)):
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
@router.get("/", response_model=list[StudentDocumentOut])
async def get_documents(student_id: int, db: AsyncSession = Depends(get_db)):
    try:
        stmt = select(StudentDocument)
        if student_id:
            stmt = stmt.where(StudentDocument.student_id == student_id)
        result = await db.execute(stmt)
        return result.scalars().all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching documents: {str(e)}")


# Get single document by ID
@router.get("/{document_id}", response_model=StudentDocumentOut)
async def get_document(document_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(StudentDocument).where(StudentDocument.id == document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


# Update document
@router.patch("/{document_id}", response_model=StudentDocumentOut)
async def update_document(document_id: int, document_data: StudentDocumentUpdate, db: AsyncSession = Depends(get_db)):
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
@router.delete("/{document_id}", status_code=204)
async def delete_document(document_id: int, db: AsyncSession = Depends(get_db)):
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
