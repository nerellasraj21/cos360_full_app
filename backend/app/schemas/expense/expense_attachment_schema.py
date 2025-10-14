from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class ExpenseAttachmentBase(BaseModel):
    """Base schema for ExpenseAttachment"""
    original_filename: str = Field(..., min_length=1, max_length=255, description="Original filename")
    document_type: str = Field(..., max_length=50, description="Document type: invoice, receipt, bill, contract, etc.")
    department_id: Optional[UUID] = Field(None, description="Department ID for scoping")


class ExpenseAttachmentCreate(ExpenseAttachmentBase):
    """Schema for creating ExpenseAttachment"""
    transaction_id: UUID = Field(..., description="Transaction ID this attachment belongs to")
    file_content: bytes = Field(..., description="File content (will be processed for security)")

    class Config:
        # Don't include file_content in JSON serialization
        exclude = {'file_content'}


class ExpenseAttachmentUpdate(BaseModel):
    """Schema for updating ExpenseAttachment"""
    document_type: Optional[str] = Field(None, max_length=50, description="Document type")
    is_verified: Optional[bool] = Field(None, description="Whether document is verified")
    verification_notes: Optional[str] = Field(None, description="Verification notes")
    department_id: Optional[UUID] = Field(None, description="Department ID for scoping")


class ExpenseAttachmentRead(ExpenseAttachmentBase):
    """Schema for reading ExpenseAttachment"""
    id: UUID = Field(..., description="Unique identifier")
    transaction_id: UUID = Field(..., description="Transaction ID")

    # File details
    stored_filename: str = Field(..., description="Stored filename (UUID-based)")
    file_path: str = Field(..., description="File storage path")
    file_size: int = Field(..., description="File size in bytes")
    mime_type: str = Field(..., description="MIME type")
    file_extension: str = Field(..., description="File extension")

    # Security fields
    file_hash_sha256: str = Field(..., description="SHA-256 hash for integrity")
    virus_scan_status: str = Field(..., description="Virus scan status")
    virus_scan_result: Optional[str] = Field(None, description="Virus scan result details")
    virus_scanned_at: Optional[datetime] = Field(None, description="Virus scan timestamp")

    # Access control
    is_public: bool = Field(..., description="Whether file is publicly accessible")
    is_encrypted: bool = Field(..., description="Whether file is encrypted")
    encryption_key_id: Optional[str] = Field(None, description="Encryption key reference")

    # Verification
    is_verified: bool = Field(..., description="Whether document is verified")
    verified_by_user_id: Optional[UUID] = Field(None, description="User who verified")
    verified_at: Optional[datetime] = Field(None, description="Verification timestamp")
    verification_notes: Optional[str] = Field(None, description="Verification notes")

    # Retention and archival
    retention_period_months: int = Field(..., description="Retention period in months")
    is_archived: bool = Field(..., description="Whether file is archived")
    archived_at: Optional[datetime] = Field(None, description="Archive timestamp")
    can_be_deleted: bool = Field(..., description="Whether file can be deleted")

    # Access tracking
    last_accessed_at: Optional[datetime] = Field(None, description="Last access timestamp")
    access_count: int = Field(..., description="Number of times accessed")

    # Audit fields
    uploaded_by_user_id: UUID = Field(..., description="Uploader user ID")
    uploaded_by_role: str = Field(..., description="Uploader role")
    uploaded_at: datetime = Field(..., description="Upload timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    model_config = ConfigDict(from_attributes=True)


class ExpenseAttachmentDownload(BaseModel):
    """Schema for downloading ExpenseAttachment"""
    id: UUID = Field(..., description="Attachment ID")
    original_filename: str = Field(..., description="Original filename")
    mime_type: str = Field(..., description="MIME type")
    file_size: int = Field(..., description="File size")
    download_url: str = Field(..., description="Secure download URL")

    model_config = ConfigDict(from_attributes=True)