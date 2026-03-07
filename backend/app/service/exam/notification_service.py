"""
notification_service.py

Stub notification service. Counts eligible recipients and queues
notifications for delivery via the school's notification infrastructure.
Real push/SMS/email dispatch is handled by background tasks.
"""

from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def queue_notifications(
    db: AsyncSession,
    exam_id: UUID,
    notification_type: str,
    message: str,
    target_audience: str = "students",
    send_push: bool = True,
    send_sms: bool = False,
    send_email: bool = True,
) -> int:
    """
    Count eligible recipients and return the count.
    In production this would insert rows into a notifications queue table.
    """
    if target_audience == "students":
        sql = text("""
            SELECT COUNT(DISTINCT sa.student_id)
            FROM exam_class_sections ecs
            JOIN student_admissions sa
              ON sa.current_class_id = ecs.class_id
             AND (ecs.section_id IS NULL OR sa.current_section_id = ecs.section_id)
            WHERE ecs.exam_id = :exam_id
        """)
    elif target_audience == "parents":
        sql = text("""
            SELECT COUNT(DISTINCT sp.parent_id)
            FROM exam_class_sections ecs
            JOIN student_admissions sa
              ON sa.current_class_id = ecs.class_id
             AND (ecs.section_id IS NULL OR sa.current_section_id = ecs.section_id)
            JOIN student_parent_links sp ON sp.student_id = sa.student_id
            WHERE ecs.exam_id = :exam_id
        """)
    else:  # "all" — students + parents
        sql = text("""
            SELECT (
                (SELECT COUNT(DISTINCT sa.student_id)
                 FROM exam_class_sections ecs
                 JOIN student_admissions sa
                   ON sa.current_class_id = ecs.class_id
                  AND (ecs.section_id IS NULL OR sa.current_section_id = ecs.section_id)
                 WHERE ecs.exam_id = :exam_id)
                +
                (SELECT COUNT(DISTINCT sp.parent_id)
                 FROM exam_class_sections ecs
                 JOIN student_admissions sa
                   ON sa.current_class_id = ecs.class_id
                  AND (ecs.section_id IS NULL OR sa.current_section_id = ecs.section_id)
                 JOIN student_parent_links sp ON sp.student_id = sa.student_id
                 WHERE ecs.exam_id = :exam_id)
            ) AS total
        """)

    row = (await db.execute(sql, {"exam_id": str(exam_id)})).fetchone()
    count = int(row[0]) if row and row[0] else 0
    # TODO: Insert into notifications queue table once that table exists
    return count
