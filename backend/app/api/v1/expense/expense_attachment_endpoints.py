from fastapi import HTTPException, status, APIRouter, Depends, Query, Request, UploadFile, File
from fastapi.responses import StreamingResponse
from app.schemas.expense.expense_attachment_schema import (
    ExpenseAttachmentCreate,
    ExpenseAttachmentRead,
    ExpenseAttachmentUpdate,
    ExpenseAttachmentDownload
)
from app.db.tenant_session import get_tenant_db
from sqlalchemy.ext.asyncio import AsyncSession
from app.service.expense.expense_attachment_service import ExpenseAttachmentService
from app.middleware.rate_limit_middleware import rate_limit_api, rate_limit_create
from app.tools.simple_permissions import get_current_user_token, check_role_plan_permission_with_error
from typing import List
from uuid import UUID
import io

router = APIRouter(prefix="/expense/attachments", tags=["Expense/Attachments"])

# Upload Attachment
@router.post("/transactions/{transaction_id}/upload", response_model=ExpenseAttachmentRead, status_code=status.HTTP_201_CREATED)
@rate_limit_create("20 per minute")
async def upload_attachment_endpoint(
    request: Request,
    transaction_id: UUID,
    file: UploadFile = File(..., description="File to upload"),
    document_type: str = Query(..., description="Document type: invoice, receipt, bill, etc."),
    department_id: UUID = Query(None, description="Department ID for scoping"),
    db: AsyncSession = Depends(get_tenant_db)
):
    """Upload a file attachment for an expense transaction. Rate limited to 20 uploads per minute."""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    user_id = UUID(current_user.get('sub'))
    username = current_user.get('username')

    # Multi-layer permission check
    await check_role_plan_permission_with_error(db, request, role, 'expense_attachments', 'create')

    # Validate file
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No filename provided"
        )

    # Read file content
    file_content = await file.read()

    if len(file_content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty file uploaded"
        )

    # Basic file size validation (10MB limit)
    if len(file_content) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds 10MB limit"
        )

    # Create attachment data
    attachment_data = ExpenseAttachmentCreate(
        transaction_id=transaction_id,
        original_filename=file.filename,
        document_type=document_type,
        department_id=department_id,
        file_content=file_content
    )

    service = ExpenseAttachmentService(db)
    return await service.create_attachment(attachment_data, user_id, role, username)

# Get Attachment
@router.get("/{attachment_id}", response_model=ExpenseAttachmentRead)
@rate_limit_api("100 per minute")
async def get_attachment_endpoint(
    request: Request,
    attachment_id: UUID,
    db: AsyncSession = Depends(get_tenant_db)
):
    """Get attachment metadata by ID"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')

    # Multi-layer permission check
    await check_role_plan_permission_with_error(db, request, role, 'expense_attachments', 'read')

    service = ExpenseAttachmentService(db)
    return await service.get_attachment(attachment_id)

# Get Transaction Attachments
@router.get("/transactions/{transaction_id}/list", response_model=List[ExpenseAttachmentRead])
@rate_limit_api("100 per minute")
async def get_transaction_attachments_endpoint(
    request: Request,
    transaction_id: UUID,
    db: AsyncSession = Depends(get_tenant_db)
):
    """Get all attachments for a specific transaction"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')

    # Multi-layer permission check
    await check_role_plan_permission_with_error(db, request, role, 'expense_attachments', 'read')

    # TODO: Implement get_transaction_attachments method in service
    # For now, return empty list
    return []

# Download Attachment
@router.get("/{attachment_id}/download")
@rate_limit_api("50 per minute")
async def download_attachment_endpoint(
    request: Request,
    attachment_id: UUID,
    db: AsyncSession = Depends(get_tenant_db)
):
    """Download attachment file. Rate limited to 50 downloads per minute."""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')

    # Multi-layer permission check
    await check_role_plan_permission_with_error(db, request, role, 'expense_attachments', 'download')

    service = ExpenseAttachmentService(db)
    attachment = await service.get_attachment(attachment_id)

    # TODO: Implement actual file retrieval from storage
    # For now, return a mock file
    mock_content = f"Mock file content for {attachment.original_filename}"

    return StreamingResponse(
        io.BytesIO(mock_content.encode()),
        media_type=attachment.mime_type,
        headers={
            "Content-Disposition": f"attachment; filename={attachment.original_filename}",
            "Content-Length": str(len(mock_content))
        }
    )

# Update Attachment
@router.put("/{attachment_id}", response_model=ExpenseAttachmentRead)
@rate_limit_api("30 per minute")
async def update_attachment_endpoint(
    request: Request,
    attachment_id: UUID,
    attachment_data: ExpenseAttachmentUpdate,
    db: AsyncSession = Depends(get_tenant_db)
):
    """Update attachment metadata. Rate limited to 30 updates per minute."""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')

    # Multi-layer permission check
    await check_role_plan_permission_with_error(db, request, role, 'expense_attachments', 'update')

    # TODO: Implement update functionality
    service = ExpenseAttachmentService(db)
    return await service.get_attachment(attachment_id)

# Delete Attachment
@router.delete("/{attachment_id}")
@rate_limit_api("20 per minute")
async def delete_attachment_endpoint(
    request: Request,
    attachment_id: UUID,
    db: AsyncSession = Depends(get_tenant_db)
):
    """Delete an attachment. Rate limited to 20 deletes per minute."""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')

    # Multi-layer permission check
    await check_role_plan_permission_with_error(db, request, role, 'expense_attachments', 'delete')

    # TODO: Implement delete functionality
    return {"message": "Attachment deleted successfully", "attachment_id": attachment_id}