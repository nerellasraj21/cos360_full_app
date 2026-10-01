# app/tasks/exam/aggregate_compute_task.py
"""
Celery task to compute aggregated exam results (totals, grades, rank).
Sprint 5 · BG-01: celery_app imported from app.celery_app
"""

import logging

from app.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(
    name="exam.aggregate_compute",
    bind=True,
    max_retries=2,
    default_retry_delay=120,
    acks_late=True,
)
def compute_exam_aggregates(
    self,
    *,
    exam_id: str,
    class_id: str | None = None,
    section_id: str | None = None,
    tenant_id: str,
):
    """
    Compute total marks, grades, and ranks for an exam.

    Triggered when exam status transitions to 'published'.

    Args:
        exam_id: UUID of the exam
        class_id: Scope to a specific class (or None for all)
        section_id: Scope to a specific section (or None for all)
        tenant_id: UUID of the tenant the exam belongs to
    """
    import asyncio

    from app.tasks.tenant_context import task_tenant_session

    try:
        logger.info(
            "Computing aggregates for exam=%s class=%s section=%s",
            exam_id,
            class_id,
            section_id,
        )

        async def _run():
            async with task_tenant_session(tenant_id) as db:
                # TODO Sprint 5: Implement aggregate computation.
                # Steps:
                # 1. Load all StudentMark rows for this exam (optionally filtered)
                # 2. For each student: sum component marks → subject total
                # 3. Lookup grade via grading_service.lookup_grade()
                # 4. Upsert StudentSubjectResult rows
                # 5. Sum subject totals → exam grand total
                # 6. Compute ranks per class/section
                # 7. Upsert StudentExamResult rows
                logger.warning("Aggregate compute not yet implemented (Sprint 5 placeholder)")
                await db.commit()

        asyncio.run(_run())
        logger.info("Aggregate compute completed for exam=%s", exam_id)
        return {"status": "success", "exam_id": exam_id}

    except Exception as exc:
        logger.error("Aggregate compute task failed: %s", exc, exc_info=True)
        raise self.retry(exc=exc)
