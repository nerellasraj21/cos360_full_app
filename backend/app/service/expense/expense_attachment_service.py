from typing import Any
import uuid
from uuid import UUID

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.expense import ExpenseAttachment, ExpenseTransaction
from app.schemas.expense import ExpenseAttachmentCreate, ExpenseAttachmentRead, ExpenseAttachmentUpdate

from .base_expense_service import BaseExpenseService


class ExpenseAttachmentService(BaseExpenseService):
    """Service for managing expense attachments"""

    def __init__(self, db: AsyncSession):
        super().__init__(db)

    async def create_attachment(
        self, attachment_data: ExpenseAttachmentCreate, user_id: UUID, user_role: str, user_username: str, org_id: UUID
    ) -> ExpenseAttachmentRead:
        """Create a new expense attachment"""

        # Validate transaction exists
        await self.check_record_exists(
            ExpenseTransaction, attachment_data.transaction_id, "Expense transaction not found"
        )

        # Create the attachment
        db_attachment = ExpenseAttachment(
            transaction_id=attachment_data.transaction_id,
            org_id=org_id,
            original_filename=attachment_data.original_filename,
            stored_filename=f"{uuid.uuid4().hex}_{attachment_data.original_filename}",
            file_path="/temp/path",  # TODO: Implement proper file storage
            file_size=len(attachment_data.file_content),
            mime_type="application/octet-stream",  # TODO: Detect actual MIME type
            file_extension=(
                attachment_data.original_filename.split(".")[-1] if "." in attachment_data.original_filename else ""
            ),
            file_hash_sha256="temp_hash",  # TODO: Calculate actual SHA-256
            virus_scan_status="pending",  # Required field
            is_public=False,  # Required field
            is_encrypted=False,  # Required field
            document_type=attachment_data.document_type,
            is_verified=False,  # Required field
            retention_period_months=84,  # Required field (7 years)
            is_archived=False,  # Required field
            can_be_deleted=True,  # Required field
            access_count=0,  # Required field
            department_id=attachment_data.department_id,
            uploaded_by_user_id=user_id,
            uploaded_by_role=user_role,
        )

        self.db.add(db_attachment)
        await self.db.flush()

        # Get the created attachment with relationships
        result = await self.db.execute(select(ExpenseAttachment).where(ExpenseAttachment.id == db_attachment.id))
        attachment_out = result.scalar_one()

        # Commit the main record
        await self.db.commit()

        # TODO: Fix audit log creation - temporarily disabled
        # await self.create_audit_log(
        #     transaction_id=db_attachment.id,
        #     action="create",
        #     action_category="attachment",
        #     actor_user_id=user_id,
        #     actor_role=user_role,
        #     actor_username=user_username,
        #     org_id=org_id,
        #     full_record_after=self.prepare_record_snapshot(attachment_out),
        #     action_reason="Attachment created"
        # )

        return ExpenseAttachmentRead.model_validate(attachment_out)

    async def get_attachment(self, attachment_id: UUID) -> ExpenseAttachmentRead:
        """Get a specific expense attachment"""

        attachment = await self.check_record_exists(ExpenseAttachment, attachment_id, "Expense attachment not found")

        return ExpenseAttachmentRead.model_validate(attachment)

    async def get_attachments_by_transaction(self, transaction_id: UUID) -> list[ExpenseAttachmentRead]:
        """Get all attachments for a transaction"""

        # Validate transaction exists
        await self.check_record_exists(ExpenseTransaction, transaction_id, "Expense transaction not found")

        query = (
            select(ExpenseAttachment)
            .where(ExpenseAttachment.transaction_id == transaction_id)
            .order_by(desc(ExpenseAttachment.uploaded_at))
        )

        result = await self.db.execute(query)
        attachments = result.scalars().all()

        return [ExpenseAttachmentRead.model_validate(att) for att in attachments]

    async def update_attachment(
        self,
        attachment_id: UUID,
        attachment_data: ExpenseAttachmentUpdate,
        user_id: UUID,
        user_role: str,
        user_username: str,
    ) -> ExpenseAttachmentRead:
        """Update an expense attachment"""

        # Get existing attachment
        attachment = await self.check_record_exists(ExpenseAttachment, attachment_id, "Expense attachment not found")

        # Store original state for audit
        self.prepare_record_snapshot(attachment)

        # Update fields
        update_data = attachment_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(attachment, field, value)

        await self.db.flush()

        # Get the updated attachment
        result = await self.db.execute(select(ExpenseAttachment).where(ExpenseAttachment.id == attachment.id))
        attachment_out = result.scalar_one()

        # Commit the main record
        await self.db.commit()

        # TODO: Fix audit log creation - temporarily disabled
        # await self.create_audit_log(
        #     transaction_id=attachment.transaction_id,
        #     action="update",
        #     action_category="attachment",
        #     actor_user_id=user_id,
        #     actor_role=user_role,
        #     actor_username=user_username,
        #     org_id=attachment.org_id,
        #     full_record_before=original_state,
        #     full_record_after=self.prepare_record_snapshot(attachment_out),
        #     action_reason="Attachment updated"
        # )

        return ExpenseAttachmentRead.model_validate(attachment_out)

    async def download_attachment(self, attachment_id: UUID) -> dict[str, Any]:
        """Get attachment file for download"""

        # Get existing attachment
        attachment = await self.check_record_exists(ExpenseAttachment, attachment_id, "Expense attachment not found")

        # TODO: Implement actual file retrieval
        # For now, return file metadata
        return {
            "attachment_id": attachment.id,
            "original_filename": attachment.original_filename,
            "stored_filename": attachment.stored_filename,
            "file_path": attachment.file_path,
            "file_size": attachment.file_size,
            "mime_type": attachment.mime_type,
            "file_extension": attachment.file_extension,
            "download_url": f"/api/v1/expense/attachments/{attachment_id}/download",  # Placeholder
        }

    async def delete_attachment(
        self, attachment_id: UUID, user_id: UUID, user_role: str, user_username: str
    ) -> dict[str, Any]:
        """Delete an expense attachment"""

        # Get existing attachment
        attachment = await self.check_record_exists(ExpenseAttachment, attachment_id, "Expense attachment not found")

        # TODO: Implement actual file deletion
        # For now, just mark as deleted in database
        attachment.is_archived = True
        await self.db.flush()
        await self.db.commit()

        return {"message": "Expense attachment deleted successfully", "attachment_id": attachment_id}
