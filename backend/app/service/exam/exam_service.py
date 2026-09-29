from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.exam.exam_class_section_model import ExamClassSection
from app.models.exam.exam_date_model import ExamDate
from app.models.exam.exam_model import Exam
from app.models.exam.exam_subject_config_model import ExamSubjectComponent, ExamSubjectConfig
from app.models.masters.class_subject_mapping_model import ClassSubjectMap
from app.schemas.exam.exam_create_full_schema import ExamCreateFull, ExamCreateFullResponse
from app.schemas.exam.exam_schema import ExamUpdate

# ── Private helpers ────────────────────────────────────────────────────────────


async def _load_class_subjects(
    class_ids: list[UUID],
    db: AsyncSession,
) -> dict[tuple[UUID, UUID | None], set[UUID]]:
    """
    Returns {(class_id, section_id): {subject_id, ...}} for subjects where
    exclude_marks=False (or NULL).

    The ClassSubjectMap table always stores a concrete section_id (NOT NULL),
    so every key will have a real UUID as the second element.  The caller
    additionally checks the (class_id, None) slot for any "all-section"
    subjects — that slot will simply be empty for this schema.

    BG-02: keyed by (class_id, section_id) tuple so that per-section subject
    validation is exact.
    """
    result = await db.execute(
        select(
            ClassSubjectMap.class_id,
            ClassSubjectMap.section_id,
            ClassSubjectMap.subject_id,
        ).where(
            ClassSubjectMap.class_id.in_(class_ids),
            or_(
                ClassSubjectMap.exclude_marks == False,  # noqa: E712
                ClassSubjectMap.exclude_marks.is_(None),
            ),
        )
    )
    mapping: dict[tuple[UUID, UUID | None], set[UUID]] = {}
    for row in result:
        key = (row.class_id, row.section_id)
        mapping.setdefault(key, set()).add(row.subject_id)
    return mapping


# ── create_full ────────────────────────────────────────────────────────────────


async def create_full_exam(
    db: AsyncSession,
    payload: ExamCreateFull,
    created_by: UUID,
) -> ExamCreateFullResponse:
    """
    Single-operation exam creation.

    BEGIN -> insert exam -> insert class_sections -> auto-load subjects from
    ClassSubjectMap -> insert subject_config -> insert components ->
    insert exam_dates -> set status=active -> COMMIT (caller commits).

    Full rollback on any failure.
    """

    # ── Step 1: Insert exam record ─────────────────────────────────────────────
    exam = Exam(
        **payload.exam.model_dump(),
        status="active",
        created_by=created_by,
    )
    db.add(exam)
    await db.flush()  # Generates exam.id without committing

    # ── Step 2: Insert class_sections (bulk) ───────────────────────────────────
    cs_objects = []
    for cs in payload.class_sections:
        obj = ExamClassSection(
            exam_id=exam.id,
            class_id=cs.class_id,
            section_id=cs.section_id,
        )
        db.add(obj)
        cs_objects.append(obj)
    await db.flush()

    # ── Step 3: Auto-load subjects from ClassSubjectMap ────────────────────────
    # For each class_id in class_sections, fetch subjects where exclude_marks=False.
    # This gives the canonical subject list; subject_configs payload may OVERRIDE
    # or extend it.  The rule: every subject in the payload must exist in
    # ClassSubjectMap for that (class_id, section_id) combination.
    loaded_subject_ids = await _load_class_subjects([cs.class_id for cs in payload.class_sections], db)

    # ── Step 4 + 5: Insert subject_config + components ─────────────────────────
    config_count = 0
    for sc_payload in payload.subject_configs:
        key = (sc_payload.class_id, sc_payload.section_id)
        # Also check the (class_id, None) key for subjects assigned to all sections
        valid_subjects = loaded_subject_ids.get(key, set()) | loaded_subject_ids.get((sc_payload.class_id, None), set())
        if sc_payload.subject_id not in valid_subjects:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    f"Subject {sc_payload.subject_id} is not mapped to "
                    f"class {sc_payload.class_id} / section {sc_payload.section_id} "
                    f"or has exclude_marks=true"
                ),
            )

        config = ExamSubjectConfig(
            exam_id=exam.id,
            class_id=sc_payload.class_id,
            section_id=sc_payload.section_id,
            subject_id=sc_payload.subject_id,
            subject_grade_scheme_id=sc_payload.subject_grade_scheme_id,
            credit_hours=sc_payload.credit_hours,
            has_internal_external_split=sc_payload.has_internal_external_split,
            internal_max_marks=sc_payload.internal_max_marks,
            internal_min_pass=sc_payload.internal_min_pass,
            external_max_marks=sc_payload.external_max_marks,
            external_min_pass=sc_payload.external_min_pass,
            sort_order=sc_payload.sort_order,
        )
        db.add(config)
        await db.flush()  # Need config.id for components FK

        for idx, comp_payload in enumerate(sc_payload.components):
            comp = ExamSubjectComponent(
                subject_config_id=config.id,
                component_name=comp_payload.component_name,
                entry_type=comp_payload.entry_type,
                max_marks=comp_payload.max_marks,
                min_pass_marks=comp_payload.min_pass_marks,
                include_in_total=comp_payload.include_in_total,
                is_internal=comp_payload.is_internal,
                remark_grade_set_id=comp_payload.remark_grade_set_id,
                sort_order=comp_payload.sort_order if comp_payload.sort_order else idx,
            )
            db.add(comp)

        config_count += 1

    await db.flush()

    # ── Step 6: Insert exam_dates (bulk) ───────────────────────────────────────
    date_count = 0
    for d in payload.exam_dates:
        ed = ExamDate(
            exam_id=exam.id,
            class_id=d.class_id,
            section_id=d.section_id,
            subject_id=d.subject_id,
            exam_date=d.exam_date,
            start_time=d.start_time,
            end_time=d.end_time,
            venue=d.venue,
            notes=d.notes,
            created_by=created_by,
        )
        db.add(ed)
        date_count += 1

    # ── Step 7: exam.status is already 'active' (set in Step 1) ───────────────
    # Caller (endpoint) calls await db.commit() after this function returns.

    return ExamCreateFullResponse(
        exam_id=exam.id,
        exam_name=exam.exam_name,
        status=exam.status,
        class_sections_created=len(cs_objects),
        subject_configs_created=config_count,
        exam_dates_created=date_count,
    )


# ── list_exams ─────────────────────────────────────────────────────────────────


async def list_exams(
    db: AsyncSession,
    academic_year_id: UUID | None = None,
    status: str | None = None,
    nature: str | None = None,
) -> list[Exam]:
    """Return exams, optionally filtered by academic_year, status, or nature.

    Attaches `subject_config_count` to each Exam object so ExamListItem
    can serialize it without an extra round-trip per exam.
    """
    stmt = select(Exam)
    if academic_year_id is not None:
        stmt = stmt.where(Exam.academic_year_id == academic_year_id)
    if status is not None:
        stmt = stmt.where(Exam.status == status)
    if nature is not None:
        stmt = stmt.where(Exam.nature == nature)
    stmt = stmt.order_by(Exam.created_at.desc())
    exams = (await db.execute(stmt)).scalars().all()

    if exams:
        exam_ids = [e.id for e in exams]
        count_rows = (
            await db.execute(
                select(
                    ExamSubjectConfig.exam_id,
                    func.count(ExamSubjectConfig.id).label("cnt"),
                )
                .where(ExamSubjectConfig.exam_id.in_(exam_ids))
                .group_by(ExamSubjectConfig.exam_id)
            )
        ).all()
        counts = {row.exam_id: row.cnt for row in count_rows}
        for exam in exams:
            exam.subject_config_count = counts.get(exam.id, 0)

    return exams


# ── get_exam_or_404 ────────────────────────────────────────────────────────────


async def get_exam_or_404(db: AsyncSession, exam_id: UUID) -> Exam:
    """Fetch a single exam by id; raise HTTP 404 if not found."""
    result = await db.execute(select(Exam).where(Exam.id == exam_id))
    exam = result.scalar_one_or_none()
    if exam is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Exam {exam_id} not found",
        )
    return exam


async def get_class_sections_for_exam(
    db: AsyncSession,
    exam_id: UUID,
) -> list[ExamClassSection]:
    """Return all class-section rows for a given exam."""
    await get_exam_or_404(db, exam_id)  # 404 if exam doesn't exist
    result = await db.execute(
        select(ExamClassSection).where(ExamClassSection.exam_id == exam_id).order_by(ExamClassSection.created_at)
    )
    return result.scalars().all()


# ── update_exam ────────────────────────────────────────────────────────────────


async def update_exam(db: AsyncSession, exam_id: UUID, payload: ExamUpdate) -> Exam:
    """
    Partial update of an exam record.
    Only fields explicitly provided in the payload are changed.
    Caller commits.
    """
    exam = await get_exam_or_404(db, exam_id)
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(exam, field, value)
    await db.flush()
    return exam


# ── delete_exam ────────────────────────────────────────────────────────────────


async def delete_exam(db: AsyncSession, exam_id: UUID) -> None:
    """
    Hard-delete an exam.  Only permitted when status == 'draft'.
    Cascades to class_sections, subject_configs, and exam_dates via DB cascade.
    Caller commits.
    """
    exam = await get_exam_or_404(db, exam_id)
    if exam.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Exam '{exam.exam_name}' cannot be deleted because its status "
                f"is '{exam.status}'. Only draft exams can be deleted."
            ),
        )
    await db.delete(exam)
    await db.flush()


# ── clone_exam ─────────────────────────────────────────────────────────────────


async def clone_exam(
    db: AsyncSession,
    exam_id: UUID,
    created_by: UUID,
    new_name: str | None = None,
) -> Exam:
    """
    Shallow clone: copies the exam header row only (no class_sections,
    subject_configs, or exam_dates).  The clone starts in 'draft' status
    so the caller can build it out incrementally.
    Caller commits.
    """
    source = await get_exam_or_404(db, exam_id)

    if new_name is None:
        new_name = f"Copy of {source.exam_name}"

    # Check the new name does not already exist in the same academic year
    conflict_result = await db.execute(
        select(Exam).where(
            Exam.exam_name == new_name,
            Exam.academic_year_id == source.academic_year_id,
        )
    )
    if conflict_result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(f"An exam named '{new_name}' already exists in academic year " f"{source.academic_year_id}."),
        )

    cloned = Exam(
        exam_name=new_name,
        board=source.board,
        custom_board_name=source.custom_board_name,
        level=source.level,
        exam_type=source.exam_type,
        nature=source.nature,
        is_internal=source.is_internal,
        weightage_percent=source.weightage_percent,
        academic_year_id=source.academic_year_id,
        exam_grade_scheme_id=source.exam_grade_scheme_id,
        status="draft",
        mark_entry_deadline=source.mark_entry_deadline,
        publish_rank=source.publish_rank,
        hall_ticket_min_attendance=source.hall_ticket_min_attendance,
        attendance_from_date=source.attendance_from_date,
        attendance_to_date=source.attendance_to_date,
        attendance_mode=source.attendance_mode,
        term=source.term,
        cloned_from_exam_id=source.id,
        created_by=created_by,
    )
    db.add(cloned)
    await db.flush()
    return cloned


# ── deactivate_exam ────────────────────────────────────────────────────────────


async def deactivate_exam(db: AsyncSession, exam_id: UUID) -> Exam:
    """Transition an active exam back to draft. Caller commits."""
    exam = await get_exam_or_404(db, exam_id)
    if exam.status != "active":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Exam status '{exam.status}' cannot be deactivated. Only active exams can be set to draft.",
        )
    exam.status = "draft"
    await db.flush()
    return exam


async def activate_exam(db: AsyncSession, exam_id: UUID) -> Exam:
    """Transition a draft exam to active. Caller commits."""
    exam = await get_exam_or_404(db, exam_id)
    if exam.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Exam status '{exam.status}' cannot be activated. Only draft exams can be set to active.",
        )
    exam.status = "active"
    await db.flush()
    return exam
