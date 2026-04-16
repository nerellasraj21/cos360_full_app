from datetime import UTC, datetime
import logging
import uuid
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.exam.exam_subject_config_model import ExamSubjectComponent, ExamSubjectConfig
from app.models.exam.mark_permission_model import ExamMarkEntryPermission
from app.models.exam.student_marks_model import StudentMark
from app.schemas.exam.mark_entry_schema import MarkEntryCreate

log = logging.getLogger("exam.mark_entry_service")


# ---------------------------------------------------------------------------
# OQ-01 BLOCKED — teacher assignment stub
# ---------------------------------------------------------------------------


async def _is_teacher_assigned(
    user_id: UUID,
    subject_id: UUID,
    class_id: UUID,
    db: AsyncSession,
) -> bool:
    """
    TODO: OQ-01 — BLOCKED. No teacher-class assignment table exists in the codebase.
    This function must be implemented once the Staff module owner creates the
    teacher-class-section-subject assignment table and provides the schema.
    DO NOT implement against a guessed schema.
    """
    raise NotImplementedError(
        "OQ-01 unresolved: teacher assignment table not yet created by Staff module. "
        "Contact Staff module owner before Sprint 3 mark entry development."
    )


# ---------------------------------------------------------------------------
# Authorization gate (Section 6.6 of EXAM_MODULE_BACKEND_DEV.md)
# ---------------------------------------------------------------------------


async def authorize_mark_entry(db, exam_id, class_id, section_id, subject_config_id, user_id) -> bool:
    perm_result = await db.execute(
        select(ExamMarkEntryPermission).where(
            ExamMarkEntryPermission.exam_id == exam_id,
            ExamMarkEntryPermission.user_id == user_id,
            ExamMarkEntryPermission.is_active,
        )
    )
    perm = perm_result.scalar_one_or_none()
    if perm:
        return True
    # Allow if no permissions set (open access)
    count_result = await db.execute(
        select(ExamMarkEntryPermission)
        .where(
            ExamMarkEntryPermission.exam_id == exam_id,
            ExamMarkEntryPermission.is_active,
        )
        .limit(1)
    )
    if count_result.scalar_one_or_none() is None:
        return True  # No permissions configured, allow all
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN, detail="You do not have mark entry permission for this exam"
    )


# ---------------------------------------------------------------------------
# Config scope resolution
# ---------------------------------------------------------------------------


async def resolve_config_scope(
    subject_config_id: UUID,
    db: AsyncSession,
) -> tuple[UUID, UUID, UUID | None]:
    """
    Resolve the (subject_id, class_id, section_id) triple for a given
    ExamSubjectConfig id.

    Returns:
        (subject_id, class_id, section_id)   — section_id may be None.

    Raises:
        HTTP 404 if the config does not exist.
    """
    result = await db.execute(select(ExamSubjectConfig).where(ExamSubjectConfig.id == subject_config_id))
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ExamSubjectConfig with id {subject_config_id} not found",
        )
    return config.subject_id, config.class_id, config.section_id


# ---------------------------------------------------------------------------
# Mark retrieval
# ---------------------------------------------------------------------------


async def get_marks(
    db: AsyncSession,
    exam_id: UUID,
    class_id: UUID = None,
    section_id: UUID = None,
    subject_config_id: UUID = None,
) -> list[StudentMark]:
    """
    Return all StudentMark rows for a given exam + subject config combination.
    Results are ordered by student_id then component_id for predictable output.
    """
    try:
        stmt = select(StudentMark).where(StudentMark.exam_id == exam_id)
        if subject_config_id is not None:
            stmt = stmt.where(StudentMark.subject_config_id == subject_config_id)
        stmt = stmt.order_by(StudentMark.student_id, StudentMark.component_id)
        result = await db.execute(stmt)
        return list(result.scalars().all())
    except Exception as e:
        log.error(
            "Error fetching marks for exam %s / config %s: %s",
            exam_id,
            subject_config_id,
            e,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while retrieving marks.",
        )


async def get_marks_grid(
    db: AsyncSession,
    exam_id: UUID,
    class_id: UUID,
    section_id: UUID | None,
    subject_config_id: UUID,
    page: int = 1,
    page_size: int = 50,
) -> list[dict]:
    """
    Return a student-grouped mark grid for the MarkEntryGrid UI.

    Each item:
      {student_id, student_name, admission_number,
       marks: {component_id: {marks_obtained, is_absent}}}

    ALL students enrolled in the class-section are included, even those with
    no marks entered yet (so the grid always shows full roster).
    """
    from sqlalchemy import text

    # 1. Get components for this subject config
    from app.models.exam.exam_subject_config_model import ExamSubjectComponent

    comp_result = await db.execute(
        select(ExamSubjectComponent)
        .where(ExamSubjectComponent.subject_config_id == subject_config_id)
        .order_by(ExamSubjectComponent.sort_order)
    )
    components = comp_result.scalars().all()
    component_ids = [str(c.id) for c in components]

    # 2. Get all enrolled students for this class/section (deduplicated per student)
    section_filter = "AND sa.current_section_id = :section_id" if section_id else ""
    student_sql = text(f"""
        SELECT student_id, student_name, admission_number
        FROM (
            SELECT DISTINCT ON (sa.student_id)
                sa.student_id,
                TRIM(COALESCE(s.first_name, '') || ' ' || COALESCE(s.last_name, '')) AS student_name,
                sa.admission_number
            FROM student_admissions sa
            JOIN students s ON s.id = sa.student_id
            WHERE sa.current_class_id = :class_id
              {section_filter}
            ORDER BY sa.student_id, sa.admission_number
        ) sub
        ORDER BY admission_number
        LIMIT :limit OFFSET :offset
    """)
    params: dict = {
        "class_id": str(class_id),
        "limit": page_size,
        "offset": (page - 1) * page_size,
    }
    if section_id:
        params["section_id"] = str(section_id)
    student_rows = (await db.execute(student_sql, params)).fetchall()

    if not student_rows:
        return []

    student_ids = [str(r[0]) for r in student_rows]

    # 3. Fetch existing marks for these students
    marks_result = await db.execute(
        select(StudentMark).where(
            StudentMark.exam_id == exam_id,
            StudentMark.subject_config_id == subject_config_id,
            StudentMark.student_id.in_([uuid.UUID(sid) for sid in student_ids]),
        )
    )
    mark_rows = marks_result.scalars().all()

    # Build lookup: student_id -> component_id -> mark
    mark_lookup: dict[str, dict[str, StudentMark]] = {}
    for m in mark_rows:
        sid = str(m.student_id)
        cid = str(m.component_id)
        if sid not in mark_lookup:
            mark_lookup[sid] = {}
        mark_lookup[sid][cid] = m

    # 4. Build grouped response
    grid = []
    for sid, name, adm_no in student_rows:
        sid_str = str(sid)
        marks_dict: dict[str, dict] = {}
        for cid in component_ids:
            existing = mark_lookup.get(sid_str, {}).get(cid)
            if existing:
                marks_dict[cid] = {
                    "mark_id": str(existing.id),
                    "marks_obtained": float(existing.marks_obtained) if existing.marks_obtained is not None else None,
                    "is_absent": existing.is_absent,
                    "remark_grade": existing.remark_grade,
                    "updated_at": existing.updated_at.isoformat() if existing.updated_at else None,
                }
            else:
                marks_dict[cid] = {
                    "mark_id": None,
                    "marks_obtained": None,
                    "is_absent": False,
                    "remark_grade": None,
                    "updated_at": None,
                }
        grid.append(
            {
                "student_id": sid_str,
                "student_name": name or "—",
                "admission_number": adm_no or "—",
                "marks": marks_dict,
            }
        )

    return grid


# ---------------------------------------------------------------------------
# Mark upsert
# ---------------------------------------------------------------------------


async def upsert_marks(
    db: AsyncSession,
    exam_id: UUID,
    payload: MarkEntryCreate,
    entered_by: UUID = None,
    uploaded_by: UUID = None,
) -> int:
    """
    Upsert mark entries for a batch of students and components.

    For each MarkEntryItem in payload.marks:
    - If a StudentMark already exists for (exam_id, student_id, component_id,
      attempt_number), update its mutable fields.
    - Otherwise, insert a new row.

    Returns the total number of rows written (created + updated).

    Commit is intentionally NOT performed here — the endpoint is responsible
    for committing the transaction after calling this service function.
    """
    entered_by = entered_by or uploaded_by
    now_utc = datetime.now(UTC).replace(tzinfo=None)
    written = 0

    try:
        # Build component max_marks lookup to validate before saving
        component_ids = list({item.component_id for item in payload.marks})
        comp_result = await db.execute(
            select(ExamSubjectComponent).where(ExamSubjectComponent.id.in_(component_ids))
        )
        comp_max: dict[UUID, float | None] = {
            c.id: (float(c.max_marks) if c.max_marks is not None else None)
            for c in comp_result.scalars().all()
        }

        for item in payload.marks:
            if item.marks_obtained is not None:
                max_allowed = comp_max.get(item.component_id)
                if max_allowed is not None and float(item.marks_obtained) > max_allowed:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail=(
                            f"marks_obtained ({item.marks_obtained}) exceeds the component "
                            f"maximum ({max_allowed}) for component {item.component_id}."
                        ),
                    )

        for item in payload.marks:
            # Look up existing row for this student/component/attempt
            existing_result = await db.execute(
                select(StudentMark).where(
                    StudentMark.exam_id == payload.exam_id,
                    StudentMark.student_id == item.student_id,
                    StudentMark.component_id == item.component_id,
                    StudentMark.attempt_number == payload.attempt_number,
                )
            )
            existing = existing_result.scalar_one_or_none()

            if existing is not None:
                # Update mutable fields
                existing.marks_obtained = item.marks_obtained
                existing.remark_grade = item.remark_grade
                existing.is_absent = item.is_absent
                existing.updated_by = entered_by
                existing.updated_at = now_utc
                existing.entry_source = "manual"
            else:
                mark = StudentMark(
                    id=uuid.uuid4(),
                    exam_id=payload.exam_id,
                    student_id=item.student_id,
                    subject_config_id=payload.subject_config_id,
                    component_id=item.component_id,
                    marks_obtained=item.marks_obtained,
                    remark_grade=item.remark_grade,
                    is_absent=item.is_absent,
                    attempt_number=payload.attempt_number,
                    entry_source="manual",
                    entered_by=entered_by,
                )
                db.add(mark)

            written += 1

        await db.flush()
        return written

    except HTTPException:
        raise
    except IntegrityError as e:
        await db.rollback()
        log.error("IntegrityError upserting marks for exam %s: %s", payload.exam_id, e)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A data conflict occurred while saving marks. Check for duplicate entries.",
        )
    except Exception as e:
        await db.rollback()
        log.error("Error upserting marks for exam %s: %s", payload.exam_id, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while saving marks.",
        )
