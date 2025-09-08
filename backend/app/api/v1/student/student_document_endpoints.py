from fastapi import APIRouter, Depends, Form, UploadFile, File, Request, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.tenant_session import get_tenant_db
from app.schemas.student.student_document_schema import (
    StudentDocumentCreate,
    StudentDocumentUpdate,
    StudentDocumentOut
)
from uuid import UUID

from app.service.student.student_document_service import get_documents_by_student,delete_document_file,update_document_file,get_document_by_id,upload_document
from app.tools.simple_permissions import check_role_permission, get_current_user_token, check_role_plan_permission_with_error

router = APIRouter(prefix="/students/documents", tags=["Student/Student Documents"])

# Create document
@router.post("/", response_model=StudentDocumentOut, status_code=201)
async def create_document(
    student_id: UUID = Form(...),
    document_type: str = Form(...),
    document_file: UploadFile = File(...),
    request: Request = None,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Create student document - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'student_documents', 'create')
    
    return await upload_document(
        student_id=student_id,
        document_type=document_type,
        document_file=document_file,
        db=db,
    )


# Get all documents (optionally filter by student)
@router.get("/", response_model=list[StudentDocumentOut])
async def get_documents(student_id: UUID, request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """Get all documents by student - All authenticated users"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'student_documents', 'list')
    
    return await get_documents_by_student(student_id,db)


# Get single document by ID
@router.get("/{document_id}", response_model=StudentDocumentOut)
async def get_document(document_id: UUID, request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """Get document by ID - All authenticated users"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'student_documents', 'read')
    
    return await get_document_by_id(document_id,db)


# Update document
@router.patch("/{document_id}", response_model=StudentDocumentOut)
async def update_document(
    document_id: UUID,
    document_type: str = Form(...),
    document_file: UploadFile = File(...),
    request: Request = None,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Update document - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'student_documents', 'update')
    
    return await update_document_file(document_id, document_type, document_file, db)


# Delete document
@router.delete("/{document_id}", status_code=204)
async def delete_document(document_id: UUID, request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """Delete document - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'student_documents', 'delete')
    
    return await delete_document_file(document_id,db)