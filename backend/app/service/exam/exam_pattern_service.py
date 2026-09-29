from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.exam.exam_class_section_model import ExamClassSection
from app.models.exam.exam_config_template_model import ExamConfigTemplate, ExamConfigTemplateItem
from app.models.exam.exam_model import Exam
from app.models.exam.exam_subject_config_model import ExamSubjectComponent, ExamSubjectConfig
from app.models.masters.class_model import Class
from app.models.masters.class_subject_mapping_model import ClassSubjectMap
from app.models.masters.subject_model import Subject
from app.schemas.exam.exam_config_template_schema import (
    ApplyTemplateRequest,
    AutoDetectResponse,
    CopyPatternRequest,
    PatternSuggestion,
    SubjectComparisonItem,
    SubjectMismatchResponse,
    TemplateCreate,
    TemplateSaveFromExam,
)


# ── 1. compare_subjects ─────────────────────────────────────────────────────


async def compare_subjects(
    db: AsyncSession,
    exam_id: UUID,
    source_class_id: UUID,
    source_section_id: UUID | None,
    target_class_id: UUID,
    target_section_id: UUID | None,
) -> SubjectMismatchResponse:
    # Source subjects from ExamSubjectConfig
    src_stmt = select(ExamSubjectConfig.subject_id).where(
        ExamSubjectConfig.exam_id == exam_id,
        ExamSubjectConfig.class_id == source_class_id,
        ExamSubjectConfig.section_id == source_section_id,
    )
    src_rows = (await db.execute(src_stmt)).scalars().all()
    source_ids = set(src_rows)

    # Target subjects from ClassSubjectMap (exclude_marks=False)
    tgt_stmt = select(ClassSubjectMap.subject_id).where(
        ClassSubjectMap.class_id == target_class_id,
        ClassSubjectMap.section_id == target_section_id,
        or_(
            ClassSubjectMap.exclude_marks == False,  # noqa: E712
            ClassSubjectMap.exclude_marks.is_(None),
        ),
    )
    tgt_rows = (await db.execute(tgt_stmt)).scalars().all()
    target_ids = set(tgt_rows)

    common = source_ids & target_ids
    source_only = source_ids - target_ids
    target_only = target_ids - source_ids

    # Fetch subject names
    all_ids = source_ids | target_ids
    name_map: dict[UUID, str] = {}
    if all_ids:
        name_rows = (
            await db.execute(select(Subject.id, Subject.name).where(Subject.id.in_(all_ids)))
        ).all()
        name_map = {r.id: r.name for r in name_rows}

    return SubjectMismatchResponse(
        common_subjects=[SubjectComparisonItem(subject_id=s, subject_name=name_map.get(s)) for s in common],
        source_only_subjects=[SubjectComparisonItem(subject_id=s, subject_name=name_map.get(s)) for s in source_only],
        target_only_subjects=[SubjectComparisonItem(subject_id=s, subject_name=name_map.get(s)) for s in target_only],
        can_copy_all=len(source_only) == 0,
        copyable_count=len(common),
    )


# ── 2. copy_pattern ─────────────────────────────────────────────────────────


async def copy_pattern(
    db: AsyncSession,
    exam_id: UUID,
    request: CopyPatternRequest,
) -> dict:
    # Validate target class is in exam_class_sections
    cs_check = await db.execute(
        select(ExamClassSection.id).where(
            ExamClassSection.exam_id == exam_id,
            ExamClassSection.class_id == request.target_class_id,
            ExamClassSection.section_id == request.target_section_id,
        )
    )
    if cs_check.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target class/section is not part of this exam's class_sections.",
        )

    # Validate target has NO existing configs
    existing = await db.execute(
        select(func.count(ExamSubjectConfig.id)).where(
            ExamSubjectConfig.exam_id == exam_id,
            ExamSubjectConfig.class_id == request.target_class_id,
            ExamSubjectConfig.section_id == request.target_section_id,
        )
    )
    if existing.scalar() > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Target class/section already has subject configs for this exam.",
        )

    # Load source configs with components
    src_stmt = (
        select(ExamSubjectConfig)
        .options(selectinload(ExamSubjectConfig.components))
        .where(
            ExamSubjectConfig.exam_id == exam_id,
            ExamSubjectConfig.class_id == request.source_class_id,
            ExamSubjectConfig.section_id == request.source_section_id,
        )
    )
    src_configs = (await db.execute(src_stmt)).scalars().all()

    if not src_configs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No subject configs found for source class/section in this exam.",
        )

    # Compare subjects
    mismatch = await compare_subjects(
        db, exam_id,
        request.source_class_id, request.source_section_id,
        request.target_class_id, request.target_section_id,
    )

    if not request.skip_missing_subjects and mismatch.source_only_subjects:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "message": "Some source subjects are not mapped to the target class/section.",
                "source_only": [
                    {"subject_id": str(s.subject_id), "subject_name": s.subject_name}
                    for s in mismatch.source_only_subjects
                ],
            },
        )

    common_ids = {s.subject_id for s in mismatch.common_subjects}
    skipped = []
    created = 0

    for cfg in src_configs:
        if cfg.subject_id not in common_ids:
            skipped.append(str(cfg.subject_id))
            continue

        new_cfg = ExamSubjectConfig(
            exam_id=exam_id,
            class_id=request.target_class_id,
            section_id=request.target_section_id,
            subject_id=cfg.subject_id,
            subject_grade_scheme_id=cfg.subject_grade_scheme_id,
            credit_hours=cfg.credit_hours,
            has_internal_external_split=cfg.has_internal_external_split,
            internal_max_marks=cfg.internal_max_marks,
            internal_min_pass=cfg.internal_min_pass,
            external_max_marks=cfg.external_max_marks,
            external_min_pass=cfg.external_min_pass,
            sort_order=cfg.sort_order,
        )
        db.add(new_cfg)
        await db.flush()

        for comp in cfg.components:
            new_comp = ExamSubjectComponent(
                subject_config_id=new_cfg.id,
                component_name=comp.component_name,
                entry_type=comp.entry_type,
                max_marks=comp.max_marks,
                min_pass_marks=comp.min_pass_marks,
                include_in_total=comp.include_in_total,
                is_internal=comp.is_internal,
                remark_grade_set_id=comp.remark_grade_set_id,
                sort_order=comp.sort_order,
            )
            db.add(new_comp)

        created += 1

    await db.flush()
    return {"configs_created": created, "skipped_subjects": skipped}


# ── 3. save_template_from_exam ───────────────────────────────────────────────


async def save_template_from_exam(
    db: AsyncSession,
    payload: TemplateSaveFromExam,
    created_by: UUID,
) -> ExamConfigTemplate:
    # Load configs + components
    stmt = (
        select(ExamSubjectConfig)
        .options(selectinload(ExamSubjectConfig.components))
        .where(
            ExamSubjectConfig.exam_id == payload.exam_id,
            ExamSubjectConfig.class_id == payload.class_id,
            ExamSubjectConfig.section_id == payload.section_id,
        )
    )
    configs = (await db.execute(stmt)).scalars().all()
    if not configs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No subject configs found for this exam/class/section.",
        )

    # Check name uniqueness
    dup = await db.execute(
        select(ExamConfigTemplate.id).where(
            ExamConfigTemplate.template_name == payload.template_name,
            ExamConfigTemplate.is_active == True,  # noqa: E712
        )
    )
    if dup.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Template named '{payload.template_name}' already exists.",
        )

    template = ExamConfigTemplate(
        template_name=payload.template_name,
        description=payload.description,
        source_exam_id=payload.exam_id,
        source_class_id=payload.class_id,
        created_by=created_by,
    )
    db.add(template)
    await db.flush()

    for cfg in configs:
        comp_data = [
            {
                "component_name": c.component_name,
                "entry_type": c.entry_type,
                "max_marks": str(c.max_marks) if c.max_marks is not None else None,
                "min_pass_marks": str(c.min_pass_marks) if c.min_pass_marks is not None else None,
                "include_in_total": c.include_in_total,
                "is_internal": c.is_internal,
                "remark_grade_set_id": str(c.remark_grade_set_id) if c.remark_grade_set_id else None,
                "sort_order": c.sort_order,
            }
            for c in cfg.components
        ]

        item = ExamConfigTemplateItem(
            template_id=template.id,
            subject_id=cfg.subject_id,
            subject_grade_scheme_id=cfg.subject_grade_scheme_id,
            credit_hours=cfg.credit_hours,
            has_internal_external_split=cfg.has_internal_external_split,
            internal_max_marks=cfg.internal_max_marks,
            internal_min_pass=cfg.internal_min_pass,
            external_max_marks=cfg.external_max_marks,
            external_min_pass=cfg.external_min_pass,
            sort_order=cfg.sort_order,
            components_json=comp_data,
        )
        db.add(item)

    await db.flush()
    return template


# ── 4. create_template_manual ────────────────────────────────────────────────


async def create_template_manual(
    db: AsyncSession,
    payload: TemplateCreate,
    created_by: UUID,
) -> ExamConfigTemplate:
    # Check name uniqueness
    dup = await db.execute(
        select(ExamConfigTemplate.id).where(
            ExamConfigTemplate.template_name == payload.template_name,
            ExamConfigTemplate.is_active == True,  # noqa: E712
        )
    )
    if dup.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Template named '{payload.template_name}' already exists.",
        )

    template = ExamConfigTemplate(
        template_name=payload.template_name,
        description=payload.description,
        board=payload.board,
        level=payload.level,
        created_by=created_by,
    )
    db.add(template)
    await db.flush()

    for item_payload in payload.items:
        comp_data = [c.model_dump(mode="json") for c in item_payload.components]

        item = ExamConfigTemplateItem(
            template_id=template.id,
            subject_id=item_payload.subject_id,
            subject_grade_scheme_id=item_payload.subject_grade_scheme_id,
            credit_hours=item_payload.credit_hours,
            has_internal_external_split=item_payload.has_internal_external_split,
            internal_max_marks=item_payload.internal_max_marks,
            internal_min_pass=item_payload.internal_min_pass,
            external_max_marks=item_payload.external_max_marks,
            external_min_pass=item_payload.external_min_pass,
            sort_order=item_payload.sort_order,
            components_json=comp_data,
        )
        db.add(item)

    await db.flush()
    return template


# ── 5. list_templates ────────────────────────────────────────────────────────


async def list_templates(
    db: AsyncSession,
    board: str | None = None,
    level: str | None = None,
) -> list:
    stmt = select(ExamConfigTemplate).where(ExamConfigTemplate.is_active == True)  # noqa: E712
    if board:
        stmt = stmt.where(ExamConfigTemplate.board == board)
    if level:
        stmt = stmt.where(ExamConfigTemplate.level == level)
    stmt = stmt.order_by(ExamConfigTemplate.created_at.desc())
    templates = (await db.execute(stmt)).scalars().all()

    if templates:
        tmpl_ids = [t.id for t in templates]
        count_rows = (
            await db.execute(
                select(
                    ExamConfigTemplateItem.template_id,
                    func.count(ExamConfigTemplateItem.id).label("cnt"),
                )
                .where(ExamConfigTemplateItem.template_id.in_(tmpl_ids))
                .group_by(ExamConfigTemplateItem.template_id)
            )
        ).all()
        counts = {row.template_id: row.cnt for row in count_rows}
        for tmpl in templates:
            tmpl.item_count = counts.get(tmpl.id, 0)

    return templates


# ── 6. get_template_or_404 ──────────────────────────────────────────────────


async def get_template_or_404(
    db: AsyncSession,
    template_id: UUID,
) -> ExamConfigTemplate:
    result = await db.execute(
        select(ExamConfigTemplate)
        .options(selectinload(ExamConfigTemplate.items))
        .where(ExamConfigTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    if template is None or not template.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template {template_id} not found or inactive.",
        )
    return template


# ── 7. update_template ──────────────────────────────────────────────────────


async def update_template(
    db: AsyncSession,
    template_id: UUID,
    payload: dict,
) -> ExamConfigTemplate:
    template = await get_template_or_404(db, template_id)
    allowed = {"template_name", "description", "board", "level", "is_active"}
    for field, value in payload.items():
        if field in allowed:
            setattr(template, field, value)
    await db.flush()
    return template


# ── 8. delete_template ──────────────────────────────────────────────────────


async def delete_template(
    db: AsyncSession,
    template_id: UUID,
) -> None:
    template = await get_template_or_404(db, template_id)
    template.is_active = False
    await db.flush()


# ── 9. apply_template ───────────────────────────────────────────────────────


async def apply_template(
    db: AsyncSession,
    exam_id: UUID,
    request: ApplyTemplateRequest,
) -> dict:
    template = await get_template_or_404(db, request.template_id)

    # Validate target in exam_class_sections
    cs_check = await db.execute(
        select(ExamClassSection.id).where(
            ExamClassSection.exam_id == exam_id,
            ExamClassSection.class_id == request.target_class_id,
            ExamClassSection.section_id == request.target_section_id,
        )
    )
    if cs_check.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target class/section is not part of this exam's class_sections.",
        )

    # Validate no existing configs
    existing = await db.execute(
        select(func.count(ExamSubjectConfig.id)).where(
            ExamSubjectConfig.exam_id == exam_id,
            ExamSubjectConfig.class_id == request.target_class_id,
            ExamSubjectConfig.section_id == request.target_section_id,
        )
    )
    if existing.scalar() > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Target class/section already has subject configs for this exam.",
        )

    # Get valid subjects from ClassSubjectMap
    valid_stmt = select(ClassSubjectMap.subject_id).where(
        ClassSubjectMap.class_id == request.target_class_id,
        ClassSubjectMap.section_id == request.target_section_id,
        or_(
            ClassSubjectMap.exclude_marks == False,  # noqa: E712
            ClassSubjectMap.exclude_marks.is_(None),
        ),
    )
    valid_ids = set((await db.execute(valid_stmt)).scalars().all())

    skipped = []
    created = 0

    for item in template.items:
        if item.subject_id not in valid_ids:
            if not request.skip_missing_subjects:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Template subject {item.subject_id} is not mapped to target class/section.",
                )
            skipped.append(str(item.subject_id))
            continue

        new_cfg = ExamSubjectConfig(
            exam_id=exam_id,
            class_id=request.target_class_id,
            section_id=request.target_section_id,
            subject_id=item.subject_id,
            subject_grade_scheme_id=item.subject_grade_scheme_id,
            credit_hours=item.credit_hours,
            has_internal_external_split=item.has_internal_external_split,
            internal_max_marks=item.internal_max_marks,
            internal_min_pass=item.internal_min_pass,
            external_max_marks=item.external_max_marks,
            external_min_pass=item.external_min_pass,
            sort_order=item.sort_order,
        )
        db.add(new_cfg)
        await db.flush()

        # Create components from components_json
        for comp_data in (item.components_json or []):
            remark_id = comp_data.get("remark_grade_set_id")
            new_comp = ExamSubjectComponent(
                subject_config_id=new_cfg.id,
                component_name=comp_data["component_name"],
                entry_type=comp_data.get("entry_type", "marks"),
                max_marks=comp_data.get("max_marks"),
                min_pass_marks=comp_data.get("min_pass_marks"),
                include_in_total=comp_data.get("include_in_total", True),
                is_internal=comp_data.get("is_internal", True),
                remark_grade_set_id=remark_id if remark_id else None,
                sort_order=comp_data.get("sort_order", 0),
            )
            db.add(new_comp)

        created += 1

    await db.flush()
    return {"configs_created": created, "skipped_subjects": skipped}


# ── 10. auto_detect_patterns ────────────────────────────────────────────────


async def auto_detect_patterns(
    db: AsyncSession,
    exam_id: UUID,
    target_class_id: UUID,
    target_section_id: UUID | None,
) -> AutoDetectResponse:
    # Find all OTHER class-section rows for this exam
    cs_stmt = select(ExamClassSection).where(
        ExamClassSection.exam_id == exam_id,
        ExamClassSection.class_id != target_class_id,
    )
    other_sections = (await db.execute(cs_stmt)).scalars().all()

    # Also include same class but different section
    cs_stmt2 = select(ExamClassSection).where(
        ExamClassSection.exam_id == exam_id,
        ExamClassSection.class_id == target_class_id,
        ExamClassSection.section_id != target_section_id,
    )
    same_class_diff_section = (await db.execute(cs_stmt2)).scalars().all()
    other_sections = list(other_sections) + list(same_class_diff_section)

    # Get class names
    class_ids = list({cs.class_id for cs in other_sections})
    class_names: dict[UUID, str] = {}
    if class_ids:
        cn_rows = (await db.execute(select(Class.id, Class.name).where(Class.id.in_(class_ids)))).all()
        class_names = {r.id: r.name for r in cn_rows}

    # Get target subject count
    tgt_stmt = select(func.count(ClassSubjectMap.subject_id)).where(
        ClassSubjectMap.class_id == target_class_id,
        ClassSubjectMap.section_id == target_section_id,
        or_(
            ClassSubjectMap.exclude_marks == False,  # noqa: E712
            ClassSubjectMap.exclude_marks.is_(None),
        ),
    )
    target_subject_count = (await db.execute(tgt_stmt)).scalar() or 0

    suggestions: list[PatternSuggestion] = []

    for cs in other_sections:
        # Check if this section has configs
        cfg_count = (
            await db.execute(
                select(func.count(ExamSubjectConfig.id)).where(
                    ExamSubjectConfig.exam_id == exam_id,
                    ExamSubjectConfig.class_id == cs.class_id,
                    ExamSubjectConfig.section_id == cs.section_id,
                )
            )
        ).scalar()

        if not cfg_count:
            continue

        mismatch = await compare_subjects(
            db, exam_id,
            cs.class_id, cs.section_id,
            target_class_id, target_section_id,
        )

        if mismatch.copyable_count > 0:
            suggestions.append(
                PatternSuggestion(
                    source_class_id=cs.class_id,
                    source_section_id=cs.section_id,
                    source_class_name=class_names.get(cs.class_id),
                    overlap_subject_count=mismatch.copyable_count,
                    total_source_configs=cfg_count,
                    total_target_subjects=target_subject_count,
                    mismatch=mismatch,
                )
            )

    suggestions.sort(key=lambda s: s.overlap_subject_count, reverse=True)

    return AutoDetectResponse(
        suggestions=suggestions,
        has_suggestions=len(suggestions) > 0,
    )


# ── 11. add_class_section_to_exam ───────────────────────────────────────────


async def add_class_section_to_exam(
    db: AsyncSession,
    exam_id: UUID,
    class_id: UUID,
    section_id: UUID | None,
) -> ExamClassSection:
    # Validate exam exists and status
    exam = (await db.execute(select(Exam).where(Exam.id == exam_id))).scalar_one_or_none()
    if exam is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Exam {exam_id} not found.",
        )
    if exam.status not in ("draft", "active"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot add class-sections to exam with status '{exam.status}'.",
        )

    # Check uniqueness
    existing = await db.execute(
        select(ExamClassSection.id).where(
            ExamClassSection.exam_id == exam_id,
            ExamClassSection.class_id == class_id,
            ExamClassSection.section_id == section_id,
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This class/section is already part of the exam.",
        )

    cs = ExamClassSection(
        exam_id=exam_id,
        class_id=class_id,
        section_id=section_id,
    )
    db.add(cs)
    await db.flush()
    return cs
