# app/tasks/exam/pdf_generation_task.py
"""
Celery task for async PDF generation (result reports, hall tickets).
Sprint 5 · BG-01: celery_app imported from app.celery_app
"""

import logging

from app.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(
    name="exam.pdf_generation",
    bind=True,
    max_retries=2,
    default_retry_delay=60,
    acks_late=True,
)
def generate_exam_pdf(
    self,
    *,
    exam_id: str,
    report_type: str,  # "result_card" | "hall_ticket" | "marksheet"
    student_ids: list | None = None,  # None = all students
    class_id: str | None = None,
    section_id: str | None = None,
    tenant_schema: str | None = None,
):
    """
    Generate PDF reports for an exam.

    Args:
        exam_id: UUID of the exam
        report_type: Type of PDF to generate — "result_card", "hall_ticket", "marksheet"
        student_ids: Specific student UUIDs, or None for all
        class_id: Filter by class UUID
        section_id: Filter by section UUID
        tenant_schema: PostgreSQL search_path schema for multi-tenant
    """
    try:
        logger.info(
            "Generating %s PDF for exam=%s class=%s section=%s",
            report_type,
            exam_id,
            class_id,
            section_id,
        )

        # TODO Sprint 5: Implement PDF generation using reportlab or weasyprint.
        # Steps:
        # 1. Load StudentExamResult + StudentSubjectResult from DB
        # 2. Render Jinja2 HTML template
        # 3. Convert to PDF
        # 4. Upload to S3 / local storage
        # 5. Store download URL in a PDFReport table
        # 6. Optionally send notification to staff/students

        logger.warning("PDF generation not yet implemented (Sprint 5 placeholder)")
        return {
            "status": "not_implemented",
            "exam_id": exam_id,
            "report_type": report_type,
        }

    except Exception as exc:
        logger.error("PDF generation task failed: %s", exc, exc_info=True)
        raise self.retry(exc=exc)
