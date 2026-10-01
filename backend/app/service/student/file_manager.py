"""
Local File Management Service for Student Certificates

Handles file upload, stale file movement, and URL generation using local disk storage.
Files are stored under media/{tenant_id}/{module}/{student_id}/{uuid}.{ext}
"""

import logging
import os
import shutil
import uuid

from fastapi import UploadFile, status
from fastapi.exceptions import HTTPException

log = logging.getLogger("student.file_manager")

ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".docx"}

MIME_TO_EXT = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
}

MAX_FILE_SIZE = 10 * 1024 * 1024
PDF_MAGIC_BYTES = b"%PDF"
STALE_PREFIX = "stale"
MEDIA_ROOT = "media"


class FileManager:
    """Local disk file management for certificates"""

    def _validate_file_extension(self, filename: str) -> str:
        _, ext = os.path.splitext(filename)
        ext_lower = ext.lower()
        if ext_lower not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File extension '{ext_lower}' not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
            )
        return ext_lower

    def _validate_filename_safety(self, filename: str) -> None:
        if ".." in filename or "/" in filename or "\\" in filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Filename contains invalid characters",
            )

    def _guess_extension_from_mime(self, content_type: str) -> str:
        return MIME_TO_EXT.get(content_type, ".bin")

    async def _validate_pdf_magic_bytes(self, data: bytes) -> None:
        if not data.startswith(PDF_MAGIC_BYTES):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="PDF file is corrupted or not a valid PDF",
            )

    async def upload_file(
        self, tenant_id: str, module: str, student_id: str, file: UploadFile
    ) -> str:
        """
        Save uploaded file to local disk.
        Returns the file key (relative path without media/ prefix).
        """
        try:
            ext = self._validate_file_extension(file.filename or "")
            self._validate_filename_safety(file.filename or "")

            file_data = await file.read()

            if len(file_data) > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail="File size exceeds maximum allowed (10 MB)",
                )

            if len(file_data) == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="File is empty",
                )

            content_type = file.content_type or "application/octet-stream"
            guessed_ext = self._guess_extension_from_mime(content_type)
            if guessed_ext != ".bin" and guessed_ext != ext:
                log.warning(f"MIME type {content_type} doesn't match extension {ext}")

            if ext == ".pdf":
                await self._validate_pdf_magic_bytes(file_data)

            file_uuid = str(uuid.uuid4())
            save_dir = os.path.join(MEDIA_ROOT, tenant_id, module, student_id)
            os.makedirs(save_dir, exist_ok=True)

            filename = f"{file_uuid}{ext}"
            abs_path = os.path.join(save_dir, filename)
            with open(abs_path, "wb") as f:
                f.write(file_data)

            file_key = f"{tenant_id}/{module}/{student_id}/{filename}"
            log.info(f"File saved locally: {file_key}")
            return file_key

        except HTTPException:
            raise
        except Exception as e:
            log.error(f"Error uploading file: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error uploading file: {str(e)}",
            )

    async def upload_bytes(
        self, tenant_id: str, module: str, student_id: str, data: bytes, ext: str, content_type: str
    ) -> str:
        """
        Save raw bytes to local disk (used for signatures and other pre-read data).
        Returns the file key.
        """
        try:
            save_dir = os.path.join(MEDIA_ROOT, tenant_id, module, student_id)
            os.makedirs(save_dir, exist_ok=True)

            filename = f"{uuid.uuid4()}{ext}"
            abs_path = os.path.join(save_dir, filename)
            with open(abs_path, "wb") as f:
                f.write(data)

            file_key = f"{tenant_id}/{module}/{student_id}/{filename}"
            log.info(f"File saved locally: {file_key}")
            return file_key

        except Exception as e:
            log.error(f"Error saving bytes to disk: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error uploading file: {str(e)}",
            )

    async def move_to_stale(self, file_key: str, tenant_id: str) -> str:
        """Move file to stale zone by prefixing with 'stale/'."""
        try:
            stale_key = f"{STALE_PREFIX}/{file_key}"
            src = os.path.join(MEDIA_ROOT, file_key)
            dst = os.path.join(MEDIA_ROOT, stale_key)
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            if os.path.exists(src):
                shutil.move(src, dst)
            log.info(f"File moved to stale: {file_key} -> {stale_key}")
            return stale_key

        except Exception as e:
            log.error(f"Error moving file to stale: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error moving file: {str(e)}",
            )

    async def generate_presigned_url(self, file_key: str, expires_in: int = 900) -> str:
        """Return the local media URL for the file."""
        url = f"/media/{file_key}"
        log.info(f"File URL generated for: {file_key}")
        return url

    async def delete_from_s3(self, file_key: str) -> None:
        """Delete file from local disk."""
        try:
            abs_path = os.path.join(MEDIA_ROOT, file_key)
            if os.path.exists(abs_path):
                os.remove(abs_path)
                log.info(f"File deleted: {file_key}")
        except Exception as e:
            log.warning(f"Error deleting file (may already be deleted): {file_key} - {str(e)}")


file_manager = FileManager()
