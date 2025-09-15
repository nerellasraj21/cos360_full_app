from typing import List, Optional, Dict, Any
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from fastapi import HTTPException, status

from app.models.expense import ExpenseAttachment, ExpenseTransaction
from app.schemas.expense import (
    ExpenseAttachmentCreate,
    ExpenseAttachmentUpdate,
    ExpenseAttachmentRead
)
from .base_expense_service import BaseExpenseService


class ExpenseAttachmentService(BaseExpenseService):
    """Service for managing expense attachments"""

    def __init__(self, db: AsyncSession):
        super().__init__(db)

    async def create_attachment(
        self,
        attachment_data: ExpenseAttachmentCreate,
        user_id: UUID,
        user_role: str,
        user_username: str
    ) -> ExpenseAttachmentRead:
        """Create a new expense attachment"""

        # Validate transaction exists
        transaction = await self.check_record_exists(
            ExpenseTransaction,
            attachment_data.transaction_id,
            "Expense transaction not found"
        )

        # TODO: Implement file processing, virus scanning, hash generation
        # For now, create minimal attachment record

        db_attachment = ExpenseAttachment(
            transaction_id=attachment_data.transaction_id,
            original_filename=attachment_data.original_filename,
            stored_filename=f"{UUID.uuid4().hex}_{attachment_data.original_filename}",
            file_path="/temp/path",  # TODO: Implement proper file storage
            file_size=len(attachment_data.file_content),
            mime_type="application/octet-stream",  # TODO: Detect actual MIME type
            file_extension=attachment_data.original_filename.split('.')[-1] if '.' in attachment_data.original_filename else '',
            file_hash_sha256="temp_hash",  # TODO: Calculate actual SHA-256
            document_type=attachment_data.document_type,
            department_id=attachment_data.department_id,
            uploaded_by_user_id=user_id,
            uploaded_by_role=user_role
        )

        self.db.add(db_attachment)
        await self.db.flush()
        await self.db.refresh(db_attachment)

        await self.db.commit()
        return ExpenseAttachmentRead.model_validate(db_attachment)

    async def get_attachment(self, attachment_id: UUID) -> ExpenseAttachmentRead:
        """Get a specific expense attachment"""

        attachment = await self.check_record_exists(
            ExpenseAttachment,
            attachment_id,
            "Expense attachment not found"
        )

        return ExpenseAttachmentRead.model_validate(attachment)