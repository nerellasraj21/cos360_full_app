from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.exam.exam_model import Exam
from app.service.exam.exam_service import get_exam_or_404


async def get_exam_results(
    db: AsyncSession,
    exam_id: UUID,
    student_id: UUID | None = None,
    class_id: UUID | None = None,
    section_id: UUID | None = None,
) -> list[dict]:
    """
    Return exam results enriched with student_name, admission_number,
    and subject_name (via JOIN). Returns list of dicts — FastAPI serializes
    against StudentExamResultRead response_model.
    """
    conditions = ["ser.exam_id = :exam_id"]
    params: dict = {"exam_id": str(exam_id)}
    if student_id:
        conditions.append("ser.student_id = :student_id")
        params["student_id"] = str(student_id)
    if class_id and section_id:
        conditions.append("""EXISTS (
            SELECT 1 FROM student_admissions sa
            WHERE sa.student_id = ser.student_id
              AND sa.current_class_id = :class_id
              AND sa.current_section_id = :section_id
        )""")
        params["class_id"] = str(class_id)
        params["section_id"] = str(section_id)
    elif class_id:
        conditions.append("""EXISTS (
            SELECT 1 FROM student_admissions sa
            WHERE sa.student_id = ser.student_id
              AND sa.current_class_id = :class_id
        )""")
        params["class_id"] = str(class_id)
    elif section_id:
        conditions.append("""EXISTS (
            SELECT 1 FROM student_admissions sa
            WHERE sa.student_id = ser.student_id
              AND sa.current_section_id = :section_id
        )""")
        params["section_id"] = str(section_id)

    where_clause = " AND ".join(conditions)

    sql = text(f"""
        SELECT
            ser.id,
            ser.exam_id,
            ser.student_id,
            TRIM(COALESCE(s.first_name, '') || ' ' || COALESCE(s.last_name, '')) AS student_name,
            (
                SELECT sa2.admission_number
                FROM student_admissions sa2
                WHERE sa2.student_id = ser.student_id
                LIMIT 1
            ) AS admission_number,
            ser.total_marks_obtained,
            ser.total_max_marks,
            ser.percentage,
            ser.grade_label,
            ser.gpa,
            ser.rank,
            ser.is_passed,
            ser.computed_at
        FROM student_exam_results ser
        LEFT JOIN students s ON s.id = ser.student_id
        WHERE {where_clause}
        ORDER BY ser.rank NULLS LAST, student_name
    """)
    rows = (await db.execute(sql, params)).mappings().all()
    if not rows:
        return []

    # Fetch all subject results for this exam — group by student in Python
    # to avoid SQLAlchemy array-parameter complexity
    sub_sql = text("""
        SELECT
            ssr.id,
            ssr.student_id,
            ssr.subject_config_id,
            sub.name AS subject_name,
            ssr.marks_obtained,
            ssr.max_marks,
            ssr.percentage,
            ssr.grade_label,
            ssr.gpa,
            ssr.remark_grade,
            ssr.is_absent,
            ssr.is_passed
        FROM student_subject_results ssr
        LEFT JOIN exam_subject_config esc ON esc.id = ssr.subject_config_id
        LEFT JOIN subjects sub ON sub.id = esc.subject_id
        WHERE ssr.exam_id = :exam_id
        ORDER BY COALESCE(esc.sort_order, 999)
    """)
    sub_rows = (await db.execute(sub_sql, {"exam_id": str(exam_id)})).mappings().all()

    student_ids_in_page = {str(r["student_id"]) for r in rows}
    sub_by_student: dict = {}
    for sr in sub_rows:
        sid = str(sr["student_id"])
        if sid in student_ids_in_page:
            sub_by_student.setdefault(sid, []).append(dict(sr))

    results = []
    for row in rows:
        r = dict(row)
        r["subject_results"] = sub_by_student.get(str(r["student_id"]), [])
        results.append(r)

    return results


async def get_student_result_or_404(
    db: AsyncSession,
    exam_id: UUID,
    student_id: UUID,
) -> dict:
    results = await get_exam_results(db, exam_id, student_id=student_id)
    if not results:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No result found for student {student_id} in exam {exam_id}",
        )
    return results[0]


async def publish_exam(db: AsyncSession, exam_id: UUID) -> Exam:
    exam = await get_exam_or_404(db, exam_id)
    if exam.status not in ("locked", "active", "finalized"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Exam status '{exam.status}' cannot be published. Must be locked or active.",
        )
    exam.status = "published"
    await db.flush()
    return exam


async def get_student_raw_marks(
    db: AsyncSession,
    exam_id: UUID,
    student_id: UUID,
) -> dict:
    """
    Return raw entered marks for a student — no compute or publish required.
    Visible as soon as the teacher saves marks.
    """
    # Get student name
    name_sql = text("""
        SELECT TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) AS student_name
        FROM students WHERE id = :student_id
    """)
    name_row = (await db.execute(name_sql, {"student_id": str(student_id)})).mappings().first()

    marks_sql = text("""
        SELECT
            sm.subject_config_id,
            sub.name AS subject_name,
            COALESCE(esc.sort_order, 999) AS subject_sort,
            comp.component_name,
            comp.max_marks,
            COALESCE(comp.sort_order, 0) AS component_sort,
            sm.marks_obtained,
            sm.is_absent,
            sm.remark_grade
        FROM student_marks sm
        JOIN exam_subject_config esc ON esc.id = sm.subject_config_id
        LEFT JOIN subjects sub ON sub.id = esc.subject_id
        JOIN exam_subject_components comp ON comp.id = sm.component_id
        WHERE sm.exam_id = :exam_id AND sm.student_id = :student_id
        ORDER BY COALESCE(esc.sort_order, 999), COALESCE(comp.sort_order, 0)
    """)
    rows = (await db.execute(marks_sql, {"exam_id": str(exam_id), "student_id": str(student_id)})).mappings().all()

    subjects: dict = {}
    for row in rows:
        sid = str(row["subject_config_id"])
        if sid not in subjects:
            subjects[sid] = {
                "subject_config_id": row["subject_config_id"],
                "subject_name": row["subject_name"],
                "_sort": row["subject_sort"],
                "components": [],
            }
        subjects[sid]["components"].append({
            "component_name": row["component_name"],
            "marks_obtained": row["marks_obtained"],
            "max_marks": row["max_marks"],
            "is_absent": row["is_absent"],
            "remark_grade": row["remark_grade"],
        })

    sorted_subjects = sorted(subjects.values(), key=lambda s: s["_sort"])
    for s in sorted_subjects:
        s.pop("_sort", None)

    return {
        "exam_id": exam_id,
        "student_id": student_id,
        "student_name": name_row["student_name"] if name_row else None,
        "subjects": sorted_subjects,
    }


async def get_published_result_or_403(
    db: AsyncSession,
    exam_id: UUID,
    student_id: UUID,
) -> dict:
    """Fetch result only if exam is published/finalized (student/parent access)."""
    exam = await get_exam_or_404(db, exam_id)
    if exam.status not in ("published", "finalized"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Results are not yet published for this exam.",
        )
    return await get_student_result_or_404(db, exam_id, student_id)


async def unlock_exam(db: AsyncSession, exam_id: UUID, reason: str) -> Exam:
    exam = await get_exam_or_404(db, exam_id)
    if exam.status not in ("locked", "published", "finalized"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Exam status '{exam.status}' cannot be unlocked. Must be locked, published, or finalized.",
        )
    exam.status = "active"
    await db.flush()
    return exam
