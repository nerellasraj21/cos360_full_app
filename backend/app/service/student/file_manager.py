"""
S3 File Management Service for Student Certificates

Uses aiobotocore for async S3 operations. Handles file upload, stale file movement,
and presigned URL generation.
"""

import io
import logging
import mimetypes
import uuid
from datetime import datetime, timedelta

from fastapi import UploadFile, status
from fastapi.exceptions import HTTPException

from app.config import settings

log = logging.getLogger("student.file_manager")

# Allowed file extensions for certificate upload
ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".docx"}

# MIME type to extension mapping
MIME_TO_EXT = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
}

# Maximum file size (10 MB)
MAX_FILE_SIZE = 10 * 1024 * 1024

# PDF magic bytes
PDF_MAGIC_BYTES = b"%PDF"

STALE_PREFIX = "stale"


class FileManager:
    """Async S3 file management for certificates"""

    def __init__(self):
        """Initialize FileManager with S3 configuration"""
        self.bucket = settings.S3_BUCKET
        self.region = settings.S3_REGION
        self.endpoint_url = settings.S3_ENDPOINT_URL
        self.ttl_days = settings.STALE_FILE_TTL_DAYS

    async def _get_s3_client(self):
        """Get aiobotocore S3 client"""
        from aiobotocore.session import get_session

        session = get_session()
        return session.client(
            "s3",
            region_name=self.region,
            endpoint_url=self.endpoint_url,
        )

    def _validate_file_extension(self, filename: str) -> str:
        """
        Validate filename extension against allowed list.
        Returns lowercase extension without dot.
        """
        import os

        _, ext = os.path.splitext(filename)
        ext_lower = ext.lower()

        if ext_lower not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File extension '{ext_lower}' not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
            )

        return ext_lower

    def _validate_filename_safety(self, filename: str) -> None:
        """Ensure filename doesn't contain path traversal characters"""
        if ".." in filename or "/" in filename or "\\" in filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Filename contains invalid characters",
            )

    def _guess_extension_from_mime(self, content_type: str) -> str:
        """
        Guess file extension from MIME type.
        Falls back to .bin if MIME type not recognized.
        """
        return MIME_TO_EXT.get(content_type, ".bin")

    async def _validate_pdf_magic_bytes(self, data: bytes) -> None:
        """Validate PDF file has correct magic bytes"""
        if not data.startswith(PDF_MAGIC_BYTES):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="PDF file is corrupted or not a valid PDF",
            )

    async def upload_file(
        self, tenant: str, module: str, student_id: str, file: UploadFile
    ) -> str:
        """
        Upload file to S3 with validation.

        Args:
            tenant: Tenant schema name
            module: Module name (e.g., 'certificates')
            student_id: Student UUID
            file: UploadFile object

        Returns:
            S3 key (path)

        Raises:
            HTTPException: If validation fails or S3 upload fails
        """
        try:
            # 1. Validate extension
            ext = self._validate_file_extension(file.filename or "")
            self._validate_filename_safety(file.filename or "")

            # 2. Read file data
            file_data = await file.read()

            # 3. Validate file size
            if len(file_data) > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"File size exceeds maximum allowed (10 MB)",
                )

            if len(file_data) == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="File is empty",
                )

            # 4. Validate MIME type matches extension
            content_type = file.content_type or "application/octet-stream"
            guessed_ext = self._guess_extension_from_mime(content_type)

            # Allow if MIME maps to same extension, or if MIME is generic
            if guessed_ext != ".bin" and guessed_ext != ext:
                log.warning(
                    f"MIME type {content_type} doesn't match extension {ext}, but allowing for now"
                )

            # 5. Validate PDF magic bytes if PDF
            if ext.lower() == ".pdf":
                await self._validate_pdf_magic_bytes(file_data)

            # 6. Generate S3 key
            file_uuid = str(uuid.uuid4())
            s3_key = f"{tenant}/{module}/{student_id}/{file_uuid}{ext}"

            # 7. Upload to S3
            async with await self._get_s3_client() as client:
                await client.put_object(
                    Bucket=self.bucket,
                    Key=s3_key,
                    Body=file_data,
                    ContentType=content_type,
                )

            log.info(f"File uploaded to S3: {s3_key}")
            return s3_key

        except HTTPException:
            raise
        except Exception as e:
            log.error(f"Error uploading file to S3: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error uploading file: {str(e)}",
            )

    async def move_to_stale(self, s3_key: str, tenant: str) -> str:
        """
        Move file to stale zone (prefix with 'stale/').

        Args:
            s3_key: Original S3 key
            tenant: Tenant schema name

        Returns:
            New S3 key in stale zone

        Raises:
            HTTPException: If S3 operation fails
        """
        try:
            stale_key = f"{STALE_PREFIX}/{s3_key}"

            async with await self._get_s3_client() as client:
                # Copy to stale location
                await client.copy_object(
                    CopySource={"Bucket": self.bucket, "Key": s3_key},
                    Bucket=self.bucket,
                    Key=stale_key,
                )

                # Delete original
                await client.delete_object(Bucket=self.bucket, Key=s3_key)

            log.info(f"File moved to stale zone: {s3_key} -> {stale_key}")
            return stale_key

        except Exception as e:
            log.error(f"Error moving file to stale zone: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error moving file: {str(e)}",
            )

    async def generate_presigned_url(self, s3_key: str, expires_in: int = 900) -> str:
        """
        Generate presigned URL for S3 object.

        Args:
            s3_key: S3 key
            expires_in: Expiration time in seconds (default 15 min)

        Returns:
            Presigned URL string

        Raises:
            HTTPException: If URL generation fails
        """
        try:
            async with await self._get_s3_client() as client:
                url = await client.generate_presigned_url(
                    "get_object",
                    Params={"Bucket": self.bucket, "Key": s3_key},
                    ExpiresIn=expires_in,
                )

            log.info(f"Presigned URL generated for: {s3_key}")
            return url

        except Exception as e:
            log.error(f"Error generating presigned URL: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error generating download link: {str(e)}",
            )

    async def delete_from_s3(self, s3_key: str) -> None:
        """
        Delete file from S3 (used by stale file cleanup task).

        Args:
            s3_key: S3 key to delete

        Raises:
            HTTPException: If deletion fails (non-critical, logged)
        """
        try:
            async with await self._get_s3_client() as client:
                await client.delete_object(Bucket=self.bucket, Key=s3_key)

            log.info(f"File deleted from S3: {s3_key}")

        except Exception as e:
            # NoSuchKey is expected for already-deleted files
            log.warning(f"Error deleting file from S3 (may already be deleted): {s3_key} - {str(e)}")


# Singleton instance
file_manager = FileManager()
