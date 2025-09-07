from fastapi import APIRouter, Depends, Form, UploadFile, File, Request, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.student.student_document_schema import (
    StudentDocumentCreate,
    StudentDocumentUpdate,
    StudentDocumentOut
)

from app.service.student.student_document_service import get_documents_by_student,delete_document_file,update_document_file,get_document_by_id,upload_document
from app.tools.simple_permissions import check_role_permission, get_current_user_token

router = APIRouter(prefix="/students/documents", tags=["Student/Student Documents"])

# Create document
@router.post("/", response_model=StudentDocumentOut, status_code=201)
async def create_document(
    student_id: int = Form(...),
    document_type: str = Form(...),
    document_file: UploadFile = File(...),
    request: Request = None,
    db: AsyncSession = Depends(get_db),
):
    """Create student document - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    has_permission = await check_role_permission(db, role, 'student_documents', 'create')
    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail=f"Insufficient permissions: {role} cannot create student_documents"
        )
    
    return await upload_document(
        student_id=student_id,
        document_type=document_type,
        document_file=document_file,
        db=db,
    )


# Get all documents (optionally filter by student)
@router.get("/", response_model=list[StudentDocumentOut])
async def get_documents(student_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    """Get all documents by student - All authenticated users"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    has_permission = await check_role_permission(db, role, 'student_documents', 'list')
    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail=f"Insufficient permissions: {role} cannot list student_documents"
        )
    
    return await get_documents_by_student(student_id,db)


# Get single document by ID
@router.get("/{document_id}", response_model=StudentDocumentOut)
async def get_document(document_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    """Get document by ID - All authenticated users"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    has_permission = await check_role_permission(db, role, 'student_documents', 'read')
    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail=f"Insufficient permissions: {role} cannot read student_documents"
        )
    
    return await get_document_by_id(document_id,db)


# Update document
@router.patch("/{document_id}", response_model=StudentDocumentOut)
async def update_document(
    document_id: int,
    document_type: str = Form(...),
    document_file: UploadFile = File(...),
    request: Request = None,
    db: AsyncSession = Depends(get_db),
):
    """Update document - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    has_permission = await check_role_permission(db, role, 'student_documents', 'update')
    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail=f"Insufficient permissions: {role} cannot update student_documents"
        )
    
    return await update_document_file(document_id, document_type, document_file, db)


# Delete document
@router.delete("/{document_id}", status_code=204)
async def delete_document(document_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    """Delete document - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    has_permission = await check_role_permission(db, role, 'student_documents', 'delete')
    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail=f"Insufficient permissions: {role} cannot delete student_documents"
        )
    
    return await delete_document_file(document_id,db)