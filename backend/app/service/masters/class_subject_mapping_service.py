import logging
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.masters.academic_year_model import AcademicYear
from app.models.masters.class_model import Class
from app.models.masters.class_subject_mapping_model import ClassSubjectMap
from app.models.masters.sections_model import Section
from app.models.masters.subject_model import Subject
from app.schemas.masters.class_subject_mapping_schema import (
    ClassSubjectMapCreate,
    ClassSubjectMapUpdate,
)

log = logging.getLogger("masters.class_subject_mapping_service")


async def create_class_subject_mapping(db: AsyncSession, mapping_data: ClassSubjectMapCreate) -> ClassSubjectMap:
    """Create a single class-subject mapping"""
    try:
        mapping = ClassSubjectMap(**mapping_data.model_dump())
        db.add(mapping)
        await db.flush()

        result = await db.execute(
            select(ClassSubjectMap)
            .options(
                selectinload(ClassSubjectMap.class_),
                selectinload(ClassSubjectMap.section),
                selectinload(ClassSubjectMap.subject),
                selectinload(ClassSubjectMap.academic_year),
            )
            .where(ClassSubjectMap.id == mapping.id)
        )
        mapping_out = result.scalar_one()

        await db.commit()
        return mapping_out
    except Exception as e:
        await db.rollback()
        log.error(f"Failed to create class-subject mapping: {e}")
        raise HTTPException(status_code=400, detail="Class-subject mapping creation failed.")


async def _process_section_mappings(
    db: AsyncSession, class_id: UUID, section_id: UUID, academic_year_id: UUID, mappings_data: list[dict]
) -> dict:
    """
    Internal helper to process mappings for a single section.
    Returns counts and processed mapping IDs.
    """
    # Get existing mappings for this class + section + academic year
    existing_result = await db.execute(
        select(ClassSubjectMap).where(
            ClassSubjectMap.class_id == class_id,
            ClassSubjectMap.section_id == section_id,
            ClassSubjectMap.academic_year_id == academic_year_id,
        )
    )
    existing_mappings = {m.subject_id: m for m in existing_result.scalars().all()}

    # Extract subject_ids from the incoming request
    incoming_subject_ids = {mapping_data["subject_id"] for mapping_data in mappings_data}

    # Mark mappings as inactive if their subject_id is NOT in the incoming request
    deactivated_count = 0
    for subject_id, existing_mapping in existing_mappings.items():
        if subject_id not in incoming_subject_ids and existing_mapping.is_active:
            existing_mapping.is_active = False
            deactivated_count += 1

    # Process incoming mappings: create new or update existing
    created_count = 0
    updated_count = 0
    processed_mapping_ids = []

    for mapping_data in mappings_data:
        subject_id = mapping_data["subject_id"]

        # Verify subject exists
        subject_result = await db.execute(select(Subject).where(Subject.id == subject_id))
        subject = subject_result.scalar_one_or_none()
        if not subject:
            log.warning(f"Subject {subject_id} not found, skipping")
            continue

        if subject_id in existing_mappings:
            # Update existing mapping
            existing_mapping = existing_mappings[subject_id]
            existing_mapping.exclude_marks = mapping_data.get("exclude_marks", False)
            existing_mapping.order = mapping_data.get("order", None)
            existing_mapping.is_active = mapping_data.get("is_active", True)
            updated_count += 1
            processed_mapping_ids.append(existing_mapping.id)
        else:
            # Create new mapping
            new_mapping = ClassSubjectMap(
                class_id=class_id,
                section_id=section_id,
                subject_id=subject_id,
                academic_year_id=academic_year_id,
                exclude_marks=mapping_data.get("exclude_marks", False),
                order=mapping_data.get("order", None),
                is_active=mapping_data.get("is_active", True),
            )
            db.add(new_mapping)
            await db.flush()
            created_count += 1
            processed_mapping_ids.append(new_mapping.id)

    return {
        "created_count": created_count,
        "updated_count": updated_count,
        "deactivated_count": deactivated_count,
        "processed_mapping_ids": processed_mapping_ids,
    }


async def bulk_create_or_update_class_subject_mappings(
    db: AsyncSession, class_id: UUID, section_id: UUID | None, academic_year_id: UUID, mappings_data: list[dict]
) -> dict:
    """
    Bulk create or update class-subject mappings for a specific class and section.
    Implements upsert behavior: marks existing mappings as is_active=false if NOT in the bulk request.

    Args:
        class_id: The class ID
        section_id: The section ID. If None, mappings are applied to ALL sections in the class.
        academic_year_id: The academic year ID
        mappings_data: List of dictionaries containing subject_id, exclude_marks, order

    Returns:
        Dictionary with success status, counts, and created/updated mappings
    """
    try:
        # First, verify class exists
        class_result = await db.execute(select(Class).where(Class.id == class_id))
        class_obj = class_result.scalar_one_or_none()
        if not class_obj:
            raise HTTPException(status_code=404, detail="Class not found")

        # Verify academic year exists
        ay_result = await db.execute(select(AcademicYear).where(AcademicYear.id == academic_year_id))
        ay_obj = ay_result.scalar_one_or_none()
        if not ay_obj:
            raise HTTPException(status_code=404, detail="Academic year not found")

        # Determine which sections to process
        if section_id is not None:
            # Verify section exists and belongs to the class
            section_result = await db.execute(
                select(Section).where(Section.id == section_id, Section.class_id == class_id)
            )
            section_obj = section_result.scalar_one_or_none()
            if not section_obj:
                raise HTTPException(
                    status_code=404, detail="Section not found or does not belong to the specified class"
                )
            sections_to_process = [section_obj]
        else:
            # Get ALL active sections for this class
            sections_result = await db.execute(select(Section).where(Section.class_id == class_id, Section.is_active))
            sections_to_process = sections_result.scalars().all()
            if not sections_to_process:
                raise HTTPException(status_code=404, detail="No active sections found for this class")

        # Aggregate counts across all sections
        total_created = 0
        total_updated = 0
        total_deactivated = 0
        all_processed_ids = []

        # Process each section
        for section in sections_to_process:
            result = await _process_section_mappings(db, class_id, section.id, academic_year_id, mappings_data)
            total_created += result["created_count"]
            total_updated += result["updated_count"]
            total_deactivated += result["deactivated_count"]
            all_processed_ids.extend(result["processed_mapping_ids"])

        # Fetch all processed mappings with relationships before commit
        processed_mappings = []
        if all_processed_ids:
            result = await db.execute(
                select(ClassSubjectMap)
                .options(
                    selectinload(ClassSubjectMap.class_),
                    selectinload(ClassSubjectMap.section),
                    selectinload(ClassSubjectMap.subject),
                    selectinload(ClassSubjectMap.academic_year),
                )
                .where(ClassSubjectMap.id.in_(all_processed_ids))
            )
            processed_mappings = result.scalars().all()

        await db.commit()

        # Build message
        sections_count = len(sections_to_process)
        if section_id is None:
            message = f"Successfully processed class-subject mappings for {sections_count} sections: {total_created} created, {total_updated} updated, {total_deactivated} deactivated"
        else:
            message = f"Successfully processed class-subject mappings: {total_created} created, {total_updated} updated, {total_deactivated} deactivated"

        return {
            "success": True,
            "message": message,
            "created_count": total_created,
            "updated_count": total_updated,
            "deactivated_count": total_deactivated,
            "sections_processed": sections_count,
            "mappings": processed_mappings,
        }

    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        log.error(f"Failed to bulk create/update class-subject mappings: {e}")
        raise HTTPException(status_code=400, detail=f"Bulk operation failed: {str(e)}")


async def get_class_subject_mapping_by_id(db: AsyncSession, mapping_id: UUID) -> ClassSubjectMap:
    """Get a single class-subject mapping by ID"""
    result = await db.execute(
        select(ClassSubjectMap)
        .options(
            selectinload(ClassSubjectMap.class_),
            selectinload(ClassSubjectMap.section),
            selectinload(ClassSubjectMap.subject),
            selectinload(ClassSubjectMap.academic_year),
        )
        .where(ClassSubjectMap.id == mapping_id)
    )
    mapping = result.scalar_one_or_none()
    if not mapping:
        raise HTTPException(status_code=404, detail="Class-subject mapping not found")
    return mapping


async def get_class_subject_mappings_by_class(
    db: AsyncSession,
    class_id: UUID,
    section_id: UUID | None = None,
    academic_year_id: UUID | None = None,
    active_only: bool = True,
) -> list[ClassSubjectMap]:
    """Get all subject mappings for a specific class and optionally section"""
    query = (
        select(ClassSubjectMap)
        .options(
            selectinload(ClassSubjectMap.class_),
            selectinload(ClassSubjectMap.section),
            selectinload(ClassSubjectMap.subject),
            selectinload(ClassSubjectMap.academic_year),
        )
        .where(ClassSubjectMap.class_id == class_id)
    )

    if section_id:
        query = query.where(ClassSubjectMap.section_id == section_id)

    if academic_year_id:
        query = query.where(ClassSubjectMap.academic_year_id == academic_year_id)

    if active_only:
        query = query.where(ClassSubjectMap.is_active)

    # Order by the 'order' field
    query = query.order_by(ClassSubjectMap.order.asc().nullsfirst())

    result = await db.execute(query)
    return result.scalars().all()


async def get_class_subject_mappings_by_classes(
    db: AsyncSession,
    class_ids: list[UUID],
    academic_year_id: UUID | None = None,
    active_only: bool = True,
) -> dict[str, list[ClassSubjectMap]]:
    """Get subject mappings for multiple class_ids in one query, grouped by class_id string."""
    if not class_ids:
        return {}

    query = (
        select(ClassSubjectMap)
        .options(
            selectinload(ClassSubjectMap.class_),
            selectinload(ClassSubjectMap.section),
            selectinload(ClassSubjectMap.subject),
            selectinload(ClassSubjectMap.academic_year),
        )
        .where(ClassSubjectMap.class_id.in_(class_ids))
    )

    if academic_year_id:
        query = query.where(ClassSubjectMap.academic_year_id == academic_year_id)

    if active_only:
        query = query.where(ClassSubjectMap.is_active)

    query = query.order_by(ClassSubjectMap.order.asc().nullsfirst())

    result = await db.execute(query)
    mappings = result.scalars().all()

    grouped: dict[str, list[ClassSubjectMap]] = {str(cid): [] for cid in class_ids}
    for mapping in mappings:
        grouped[str(mapping.class_id)].append(mapping)

    return grouped


async def get_all_class_subject_mappings(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 100,
    class_id: UUID | None = None,
    section_id: UUID | None = None,
    academic_year_id: UUID | None = None,
    active_only: bool = True,
):
    """Get all class-subject mappings with pagination metadata"""
    # Build base query with filters
    base_query = select(ClassSubjectMap).options(
        selectinload(ClassSubjectMap.class_),
        selectinload(ClassSubjectMap.section),
        selectinload(ClassSubjectMap.subject),
        selectinload(ClassSubjectMap.academic_year),
    )

    # Build count query with same filters
    count_query = select(func.count(ClassSubjectMap.id))

    if class_id:
        base_query = base_query.where(ClassSubjectMap.class_id == class_id)
        count_query = count_query.where(ClassSubjectMap.class_id == class_id)

    if section_id:
        base_query = base_query.where(ClassSubjectMap.section_id == section_id)
        count_query = count_query.where(ClassSubjectMap.section_id == section_id)

    if academic_year_id:
        base_query = base_query.where(ClassSubjectMap.academic_year_id == academic_year_id)
        count_query = count_query.where(ClassSubjectMap.academic_year_id == academic_year_id)

    if active_only:
        base_query = base_query.where(ClassSubjectMap.is_active)
        count_query = count_query.where(ClassSubjectMap.is_active)

    total_count_result = await db.execute(count_query)
    total_count = total_count_result.scalar()

    # Get paginated items
    items_query = (
        base_query.order_by(
            ClassSubjectMap.class_id, ClassSubjectMap.section_id, ClassSubjectMap.order.asc().nullsfirst()
        )
        .offset(skip)
        .limit(limit)
    )

    items_result = await db.execute(items_query)
    items = items_result.unique().scalars().all()

    # Calculate has_next
    has_next = (skip + limit) < total_count

    return {"items": items, "total_count": total_count, "has_next": has_next}


async def update_class_subject_mapping(
    db: AsyncSession, mapping_id: UUID, mapping_update: ClassSubjectMapUpdate
) -> ClassSubjectMap:
    """Update a single class-subject mapping"""
    try:
        result = await db.execute(select(ClassSubjectMap).where(ClassSubjectMap.id == mapping_id))
        mapping = result.scalar_one_or_none()

        if not mapping:
            raise HTTPException(status_code=404, detail="Class-subject mapping not found")

        # Update fields
        update_data = mapping_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(mapping, field, value)

        await db.flush()

        # Load relationships before commit
        result = await db.execute(
            select(ClassSubjectMap)
            .options(
                selectinload(ClassSubjectMap.class_),
                selectinload(ClassSubjectMap.section),
                selectinload(ClassSubjectMap.subject),
                selectinload(ClassSubjectMap.academic_year),
            )
            .where(ClassSubjectMap.id == mapping_id)
        )
        mapping_out = result.scalar_one()

        await db.commit()
        return mapping_out

    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        log.error(f"Failed to update class-subject mapping: {e}")
        raise HTTPException(status_code=400, detail="Update failed")


async def delete_class_subject_mapping(db: AsyncSession, mapping_id: UUID) -> bool:
    """Delete a class-subject mapping"""
    try:
        result = await db.execute(select(ClassSubjectMap).where(ClassSubjectMap.id == mapping_id))
        mapping = result.scalar_one_or_none()

        if not mapping:
            raise HTTPException(status_code=404, detail="Class-subject mapping not found")

        await db.delete(mapping)
        await db.commit()
        return True

    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        log.error(f"Failed to delete class-subject mapping: {e}")
        raise HTTPException(status_code=400, detail="Delete failed")


async def get_class_subject_mappings_dropdown(
    db: AsyncSession, class_id: UUID | None = None, section_id: UUID | None = None, academic_year_id: UUID | None = None
) -> list[dict]:
    """Get class-subject mappings for dropdown"""
    query = (
        select(ClassSubjectMap)
        .options(
            selectinload(ClassSubjectMap.class_),
            selectinload(ClassSubjectMap.section),
            selectinload(ClassSubjectMap.subject),
        )
        .where(ClassSubjectMap.is_active)
    )

    if class_id:
        query = query.where(ClassSubjectMap.class_id == class_id)

    if section_id:
        query = query.where(ClassSubjectMap.section_id == section_id)

    if academic_year_id:
        query = query.where(ClassSubjectMap.academic_year_id == academic_year_id)

    query = query.order_by(ClassSubjectMap.order.asc().nullsfirst())

    result = await db.execute(query)
    mappings = result.scalars().all()

    return [
        {
            "id": mapping.id,
            "class_name": mapping.class_.name if mapping.class_ else None,
            "section_name": mapping.section.name if mapping.section else None,
            "subject_name": mapping.subject.name if mapping.subject else None,
            "exclude_marks": mapping.exclude_marks,
            "order": mapping.order,
        }
        for mapping in mappings
    ]
