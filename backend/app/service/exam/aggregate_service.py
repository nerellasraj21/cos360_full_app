"""
aggregate_service.py — Compute exam aggregate results.

Algorithm per student:
  1. Fetch all StudentMark rows for the exam.
  2. For each ExamSubjectConfig, sum component marks where include_in_total=True.
  3. Look up subject grade using SubjectGradeScheme (or fall back to ExamGradeScheme).
  4. Upsert StudentSubjectResult.
  5. Sum all subject totals → overall total/percent/grade.
  6. Compute class_rank per class-section after all students processed.
  7. Upsert StudentExamResult.
"""
import uuid
from decimal import Decimal
from uuid import UUID
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, text
from sqlalchemy.orm import selectinload

from app.models.exam.exam_model import Exam
from app.models.exam.exam_subject_config_model import ExamSubjectConfig, ExamSubjectComponent
from app.models.exam.exam_class_section_model import ExamClassSection
from app.models.exam.student_marks_model import StudentMark
from app.models.exam.student_result_model import StudentExamResult, StudentSubjectResult
from app.models.exam.grading_model import ExamGradeScheme, ExamGradeBand, SubjectGradeScheme, SubjectGradeBand
from app.service.exam.grading_service import lookup_grade, ABSENT_GRADE


async def _get_exam_bands(exam: Exam, db: AsyncSession) -> list:
    """Load ExamGradeScheme bands for the exam, or [] if not configured."""
    if not exam.exam_grade_scheme_id:
        return []
    result = await db.execute(
        select(ExamGradeBand)
        .where(ExamGradeBand.scheme_id == exam.exam_grade_scheme_id)
    )
    return result.scalars().all()


async def _get_subject_bands(subject_grade_scheme_id: Optional[UUID], db: AsyncSession) -> list:
    if not subject_grade_scheme_id:
        return []
    result = await db.execute(
        select(SubjectGradeBand)
        .where(SubjectGradeBand.scheme_id == subject_grade_scheme_id)
    )
    return result.scalars().all()


async def compute_exam_aggregate(
    db: AsyncSession,
    exam_id: UUID,
    force: bool = False,
) -> int:
    """
    Compute and upsert results for all students in the exam.
    Returns the count of students processed.
    Caller commits.
    """
    # 1. Load exam
    exam_result = await db.execute(select(Exam).where(Exam.id == exam_id))
    exam = exam_result.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Exam {exam_id} not found")

    if not force:
        existing = await db.execute(
            select(StudentExamResult).where(StudentExamResult.exam_id == exam_id).limit(1)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Results already computed. Pass force=true to recompute."
            )

    # 2. Load subject configs with components
    sc_result = await db.execute(
        select(ExamSubjectConfig)
        .options(selectinload(ExamSubjectConfig.components))
        .where(ExamSubjectConfig.exam_id == exam_id)
    )
    configs: list[ExamSubjectConfig] = sc_result.scalars().all()
    if not configs:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail="No subject configs found for this exam.")

    # 3. Load all marks for the exam
    marks_result = await db.execute(
        select(StudentMark).where(StudentMark.exam_id == exam_id)
    )
    all_marks: list[StudentMark] = marks_result.scalars().all()

    # Index marks: {(student_id, component_id): StudentMark}
    mark_index: dict[tuple, StudentMark] = {
        (m.student_id, m.component_id): m for m in all_marks
    }

    # 4. Collect all student_ids from marks
    student_ids: set[UUID] = {m.student_id for m in all_marks}
    if not student_ids:
        return 0

    # 5. Load exam-level grade bands
    exam_bands = await _get_exam_bands(exam, db)

    # 6. If force, delete existing results first
    if force:
        await db.execute(delete(StudentSubjectResult).where(StudentSubjectResult.exam_id == exam_id))
        await db.execute(delete(StudentExamResult).where(StudentExamResult.exam_id == exam_id))
        await db.flush()

    # 7. Load class-section map: config_id -> (class_id, section_id)
    config_map = {c.id: c for c in configs}

    # 8. Build student → (class_id, section_id) map via student_admissions JOIN exam_class_sections.
    # This correctly assigns each student to their class-section within this exam,
    # enabling accurate per-class ranking for multi-class exams.
    sa_sql = text("""
        SELECT DISTINCT ON (sa.student_id)
            sa.student_id,
            ecs.class_id,
            ecs.section_id
        FROM student_admissions sa
        JOIN exam_class_sections ecs
          ON ecs.class_id = sa.current_class_id
         AND (ecs.section_id IS NULL OR ecs.section_id = sa.current_section_id)
        WHERE ecs.exam_id = :exam_id
        ORDER BY sa.student_id
    """)
    sa_rows = (await db.execute(sa_sql, {"exam_id": str(exam_id)})).fetchall()
    student_class_map: dict[UUID, tuple] = {row[0]: (row[1], row[2]) for row in sa_rows}

    # Process each student
    # Collect (student_id, overall_percent, class_id, section_id) for ranking
    ranking_data: list[tuple] = []

    for student_id in student_ids:
        total_obtained = Decimal("0")
        total_max = Decimal("0")
        all_passed = True

        for config in configs:
            subject_bands = await _get_subject_bands(config.subject_grade_scheme_id, db)
            sub_obtained = Decimal("0")
            sub_max = Decimal("0")
            student_absent = False

            for comp in config.components:
                mark_obj = mark_index.get((student_id, comp.id))
                if mark_obj is None:
                    continue
                if mark_obj.is_absent:
                    student_absent = True
                    break
                if comp.include_in_total and mark_obj.marks_obtained is not None:
                    sub_obtained += mark_obj.marks_obtained
                    if comp.max_marks:
                        sub_max += comp.max_marks

            if student_absent:
                grade = ABSENT_GRADE
                sub_obtained = Decimal("0")
            elif sub_max > 0:
                grade = lookup_grade(sub_obtained, sub_max, subject_bands or exam_bands) or ABSENT_GRADE
            else:
                grade = ABSENT_GRADE

            is_pass = grade.is_pass if not student_absent else False
            if not is_pass:
                all_passed = False

            sub_percent = (sub_obtained / sub_max * 100) if sub_max > 0 else Decimal("0")

            sub_result = StudentSubjectResult(
                id=uuid.uuid4(),
                exam_id=exam_id,
                student_id=student_id,
                subject_config_id=config.id,
                marks_obtained=sub_obtained,
                max_marks=sub_max if sub_max > 0 else None,
                percentage=round(sub_percent, 2) if sub_max > 0 else None,
                grade_label=grade.grade_label,
                gpa=grade.gpa,
                is_absent=student_absent,
                is_passed=is_pass,
            )
            db.add(sub_result)

            if not student_absent and sub_max > 0:
                total_obtained += sub_obtained
                total_max += sub_max

        overall_percent = (total_obtained / total_max * 100) if total_max > 0 else Decimal("0")
        overall_grade = (lookup_grade(total_obtained, total_max, exam_bands)
                         if exam_bands and total_max > 0 else None)

        # Look up this student's actual class-section for per-class ranking
        cls_sec = student_class_map.get(student_id)
        class_id = cls_sec[0] if cls_sec else None
        section_id = cls_sec[1] if cls_sec else None

        exam_result_row = StudentExamResult(
            id=uuid.uuid4(),
            exam_id=exam_id,
            student_id=student_id,
            total_marks_obtained=round(total_obtained, 2),
            total_max_marks=round(total_max, 2) if total_max > 0 else None,
            percentage=round(overall_percent, 2) if total_max > 0 else None,
            grade_label=overall_grade.grade_label if overall_grade else None,
            gpa=overall_grade.gpa if overall_grade else None,
            is_passed=all_passed,
        )
        db.add(exam_result_row)
        ranking_data.append((student_id, overall_percent, class_id, section_id))

    await db.flush()

    # 9. Compute ranks per class-section and update
    from itertools import groupby
    ranking_data.sort(key=lambda r: (str(r[2]), str(r[3])))
    for (cls, sec), group in groupby(ranking_data, key=lambda r: (r[2], r[3])):
        sorted_group = sorted(group, key=lambda r: r[1], reverse=True)
        for rank, (sid, _, _, _) in enumerate(sorted_group, start=1):
            row = await db.execute(
                select(StudentExamResult)
                .where(StudentExamResult.exam_id == exam_id,
                       StudentExamResult.student_id == sid)
            )
            r = row.scalar_one_or_none()
            if r:
                r.rank = rank

    await db.flush()
    return len(student_ids)
