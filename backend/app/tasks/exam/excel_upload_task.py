# app/tasks/exam/excel_upload_task.py
"""
Celery task for async Excel mark upload processing.
Sprint 4 · BG-01: celery_app imported from app.celery_app
"""

import io
import logging

from app.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(
    name="exam.excel_upload",
    bind=True,
    max_retries=3,
    default_retry_delay=30,
    acks_late=True,
)
def process_excel_upload(
    self,
    *,
    exam_id: str,
    class_id: str,
    section_id: str,
    subject_config_id: str,
    teacher_user_id: str,
    file_bytes: bytes,
    tenant_id: str,
):
    """
    Parse an uploaded Excel file and persist marks for each student row.

    Args:
        exam_id: UUID of the exam
        class_id: UUID of the class
        section_id: UUID of the section
        subject_config_id: UUID of the ExamSubjectConfig
        teacher_user_id: UUID of the uploading teacher
        file_bytes: Raw bytes of the .xlsx file
        tenant_id: UUID of the tenant the exam belongs to
    """
    import asyncio
    import uuid

    from app.service.exam.excel_service import parse_excel_upload
    from app.service.exam.mark_entry_service import upsert_marks
    from app.tasks.tenant_context import task_tenant_session

    try:
        logger.info(
            "Processing Excel upload for exam=%s class=%s section=%s subject_config=%s",
            exam_id,
            class_id,
            section_id,
            subject_config_id,
        )

        async def _run():
            async with task_tenant_session(tenant_id) as db:
                payload = await parse_excel_upload(
                    db,
                    file_bytes=io.BytesIO(file_bytes),
                    exam_id=exam_id,
                    class_id=class_id,
                    section_id=section_id,
                    subject_config_id=subject_config_id,
                )
                await upsert_marks(
                    db,
                    exam_id=exam_id,
                    payload=payload,
                    uploaded_by=uuid.UUID(teacher_user_id),
                    upload_method="excel_upload",
                )
                await db.commit()

        asyncio.run(_run())
        logger.info("Excel upload processed successfully for exam=%s", exam_id)
        return {"status": "success", "exam_id": exam_id}

    except Exception as exc:
        logger.error("Excel upload task failed: %s", exc, exc_info=True)
        raise self.retry(exc=exc)
