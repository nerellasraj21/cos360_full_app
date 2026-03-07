import logging as log
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import and_, delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from app.models.masters.admission_model import Admission
from app.models.masters.class_model import Class as ClassModel
from app.models.masters.sections_model import Section as SectionModel
from app.models.student.student_model import Student
from app.schemas.masters.class_schema import ClassCreate, ClassUpdate
from app.schemas.masters.sections_schema import ClassSectionInfo
from app.tools.cache_utils import cache_dropdown, invalidate_cache

log = log.getLogger("masters.class_service")


async def create_class_with_sections(db: AsyncSession, class_data: ClassCreate):
    try:
        db_class = ClassModel(
            name=class_data.name,
            description=class_data.description,
            is_active=class_data.is_active,
            short_code=class_data.short_code,
            academic_year_id=class_data.academic_year_id,
        )
        db.add(db_class)
        await db.flush()  # Ensure the class is created before adding sections ang get class id

        if class_data.sections:
            for section in class_data.sections:
                new_section = SectionModel(
                    name=section.name,
                    description=section.description,
                    is_active=section.is_active,
                    class_id=db_class.id,
                )
                db.add(new_section)
        await db.commit()
        await db.refresh(db_class)

        # Invalidate cache after creating new class/section
        invalidate_cache("dropdown", "classes")
        invalidate_cache("dropdown", "sections")

        return db_class
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"Error creating class with sections: {str(e)}")


async def get_class_with_sections(db: AsyncSession, class_id: UUID):
    try:
        # db_class = db.query(ClassModel).filter(ClassModel.id == class_id).first()
        result = await db.execute(select(ClassModel).where(ClassModel.id == class_id))
        db_class = result.scalar_one_or_none()
        if not db_class:
            raise HTTPException(status_code=404, detail="Class not found")

        # sections = db.query(SectionModel).filter(SectionModel.class_id == class_id).all()
        allResults = await db.execute(select(SectionModel).where(SectionModel.class_id == class_id))
        sections = allResults.unique().scalars().all()
        db_class.sections = sections
        return db_class
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error fetching class with sections: {str(e)}")


async def get_all_classes_with_sections(db: AsyncSession, academic_year_id: UUID = None):
    try:
        # classes = db.query(ClassModel).all()
        stmt = select(ClassModel)
        if academic_year_id:
            stmt = stmt.where(ClassModel.academic_year_id == academic_year_id)
        result = await db.execute(stmt)
        classes = result.unique().scalars().all()

        if not classes:
            raise HTTPException(status_code=404, detail="No classes found in the given academic year")
        # Fetch sections for each class
        for db_class in classes:
            # sections = db.query(SectionModel).filter(SectionModel.class_id == db_class.id).all()
            sectionsresult = await db.execute(select(SectionModel).where(SectionModel.class_id == db_class.id))
            sections = sectionsresult.unique().scalars().all()
            db_class.sections = sections
        return classes
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error fetching classes with sections: {str(e)}")


async def update_class_with_sections(db: AsyncSession, class_id: UUID, class_data: ClassUpdate):
    try:
        # existing_class = db.query(ClassModel).filter(ClassModel.id == class_id).first()
        result = await db.execute(select(ClassModel).where(ClassModel.id == class_id))
        existing_class = result.scalar_one_or_none()
        if not existing_class:
            raise HTTPException(status_code=404, detail="Class not found")

        # Update class fields
        for key, value in class_data.dict(exclude_unset=True, exclude={"sections"}).items():
            setattr(existing_class, key, value)

        # Handle sections update
        if class_data.sections is not None:
            # Remove existing sections
            await db.execute(delete(SectionModel).where(SectionModel.class_id == class_id))
            await db.flush()  # Ensure deletion happens before re-inserting

            # Add updated/new sections
            for sec in class_data.sections:
                new_sec = SectionModel(
                    name=sec.name, description=sec.description, is_active=sec.is_active, class_id=class_id
                )
                db.add(new_sec)

        await db.commit()

        # Invalidate cache after updating class/section
        invalidate_cache("dropdown", "classes")
        invalidate_cache("dropdown", "sections")

        return {"message": "Class and sections updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error fetching classes with sections: {str(e)}")


async def delete_class_with_sections(db: AsyncSession, class_id: UUID):
    try:
        # db_class = db.query(ClassModel).filter(ClassModel.id == class_id).first()
        result = await db.execute(select(ClassModel).where(ClassModel.id == class_id))
        db_class = result.scalar_one_or_none()
        if not db_class:
            raise HTTPException(status_code=404, detail="Class not found")

        # Check if class is in use by student admissions
        from sqlalchemy import func, or_

        from app.models.masters.admission_model import Admission

        admissions_count = await db.execute(
            select(func.count(Admission.id)).where(
                or_(Admission.admitted_class_id == class_id, Admission.current_class_id == class_id)
            )
        )
        admission_dependencies = admissions_count.scalar()

        # Check if class is in use by fee class mappings
        from app.models.fee.fee_class_mapping_model import FeeClassMapping

        fee_class_count = await db.execute(
            select(func.count(FeeClassMapping.id)).where(FeeClassMapping.class_id == class_id)
        )
        fee_class_dependencies = fee_class_count.scalar()

        # Check if class is in use by fee student mappings
        from app.models.fee.fee_student_mapping_model import FeeStudentMapping

        fee_student_count = await db.execute(
            select(func.count(FeeStudentMapping.id)).where(FeeStudentMapping.class_id == class_id)
        )
        fee_student_dependencies = fee_student_count.scalar()

        # Check if class is in use by class-subject mappings
        from app.models.masters.class_subject_mapping_model import ClassSubjectMap

        subject_mappings_count = await db.execute(
            select(func.count(ClassSubjectMap.id)).where(ClassSubjectMap.class_id == class_id)
        )
        subject_mapping_dependencies = subject_mappings_count.scalar()

        # Check sections for dependencies before deleting class
        sections_result = await db.execute(select(SectionModel.id).where(SectionModel.class_id == class_id))
        section_ids = [row[0] for row in sections_result.all()]

        total_section_dependencies = 0
        if section_ids:
            # Check sections in student admissions
            section_admissions_count = await db.execute(
                select(func.count(Admission.id)).where(
                    or_(Admission.admitted_section_id.in_(section_ids), Admission.current_section_id.in_(section_ids))
                )
            )
            section_admission_deps = section_admissions_count.scalar()

            # Check sections in fee student mappings
            section_fee_count = await db.execute(
                select(func.count(FeeStudentMapping.id)).where(FeeStudentMapping.section_id.in_(section_ids))
            )
            section_fee_deps = section_fee_count.scalar()

            # Check sections in timetables
            from app.models.masters.timetable_model import Timetable

            timetable_count = await db.execute(
                select(func.count(Timetable.id)).where(Timetable.section_id.in_(section_ids))
            )
            timetable_deps = timetable_count.scalar()

            total_section_dependencies = section_admission_deps + section_fee_deps + timetable_deps

        # Calculate total dependencies
        total_dependencies = (
            admission_dependencies
            + fee_class_dependencies
            + fee_student_dependencies
            + subject_mapping_dependencies
            + total_section_dependencies
        )

        if total_dependencies > 0:
            dependency_details = []
            if admission_dependencies > 0:
                dependency_details.append(f"{admission_dependencies} student admission(s)")
            if fee_class_dependencies > 0:
                dependency_details.append(f"{fee_class_dependencies} fee class mapping(s)")
            if fee_student_dependencies > 0:
                dependency_details.append(f"{fee_student_dependencies} fee student mapping(s)")
            if subject_mapping_dependencies > 0:
                dependency_details.append(f"{subject_mapping_dependencies} subject mapping(s)")
            if total_section_dependencies > 0:
                dependency_details.append(f"{total_section_dependencies} section-related record(s)")

            raise HTTPException(
                status_code=400,
                detail=f"Cannot delete class '{db_class.name}' because it is being used by {total_dependencies} record(s): {', '.join(dependency_details)}. Please reassign or delete the dependent records first.",
            )

        # Delete all sections associated with the class (safe since we checked dependencies)
        # db.query(SectionModel).filter(SectionModel.class_id == class_id).delete()
        await db.execute(delete(SectionModel).where(SectionModel.class_id == class_id))

        # Delete the class itself
        # db.delete(db_class)
        await db.delete(db_class)
        await db.commit()

        # Invalidate cache after deleting class/section
        invalidate_cache("dropdown", "classes")
        invalidate_cache("dropdown", "sections")

        return {"detail": "Class and associated sections deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"Error deleting class with sections: {str(e)}")


async def get_class_section_list(db: AsyncSession) -> list[ClassSectionInfo]:
    stmt = (
        select(SectionModel).options(joinedload(SectionModel.class_)).order_by(SectionModel.class_id, SectionModel.name)
    )
    result = await db.execute(stmt)
    sections = result.scalars().all()

    return [
        ClassSectionInfo(section_id=section.id, class_section_name=f"{section.class_.name} - {section.name}")
        for section in sections
    ]


@cache_dropdown(ttl=300)  # Cache for 5 minutes
async def get_all_classes_data(db: AsyncSession):
    """Get all classes for dropdown - Cached"""
    result = await db.execute(select(ClassModel))
    classes = result.scalars().all()

    log.debug(f"Retrieved {len(classes)} classes from database")
    return classes


@cache_dropdown(ttl=300)  # Cache for 5 minutes
async def get_all_sections_data(db: AsyncSession):
    """Get all sections for dropdown - Cached"""
    result = await db.execute(select(SectionModel))
    sections = result.scalars().all()

    log.debug(f"Retrieved {len(sections)} sections from database")
    return sections


@cache_dropdown(ttl=300)  # Cache for 5 minutes
async def get_sections_by_class_name(db, class_name: str):
    """Get sections by class name for dropdown - Cached"""
    result = await db.execute(
        select(ClassModel).where(ClassModel.name == class_name).options(selectinload(ClassModel.sections))
    )
    class_obj = result.scalars().first()

    if not class_obj:
        raise HTTPException(status_code=404, detail="Class not found")

    log.debug(f"Retrieved {len(class_obj.sections)} sections for class {class_name} from database")
    return class_obj.sections


async def get_students_by_class_section(class_name: str, section_name: str, db):
    # Fetch class
    class_result = await db.execute(select(ClassModel).where(ClassModel.name == class_name))
    class_obj = class_result.scalars().first()
    if not class_obj:
        raise HTTPException(status_code=404, detail="Class not found")

    # Fetch section
    section_result = await db.execute(
        select(SectionModel).where(and_(SectionModel.name == section_name, SectionModel.class_id == class_obj.id))
    )
    section_obj = section_result.scalars().first()
    if not section_obj:
        raise HTTPException(status_code=404, detail="Section not found for given class")

    # Get students with current class and section
    stmt = (
        select(Student)
        .join(Admission)
        .where(and_(Admission.current_class_id == class_obj.id, Admission.current_section_id == section_obj.id))
        .options(selectinload(Student.admissions))
    )
    result = await db.execute(stmt)
    students = result.scalars().all()
    return students


@cache_dropdown(ttl=300)  # Cache for 5 minutes
async def get_classes_dropdown(db: AsyncSession, active_only: bool = True):
    """Get classes for dropdown (id + name only) - Cached"""
    try:
        query = select(ClassModel.id, ClassModel.name)
        if active_only:
            query = query.where(ClassModel.is_active)
        result = await db.execute(query.order_by(ClassModel.name))
        classes = result.all()

        log.debug(f"Retrieved {len(classes)} classes for dropdown from database")
        return [{"id": cls.id, "name": cls.name} for cls in classes]
    except Exception as e:
        log.error(f"Error fetching classes dropdown: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Fetching classes dropdown failed: {str(e)}")


@cache_dropdown(ttl=300)  # Cache for 5 minutes
async def get_sections_by_class_id(db: AsyncSession, class_id: UUID):
    """Get sections by class ID for dropdown - Cached"""
    try:
        result = await db.execute(
            select(SectionModel.id, SectionModel.name)
            .where(and_(SectionModel.class_id == class_id, SectionModel.is_active))
            .order_by(SectionModel.name)
        )
        sections = result.all()

        log.debug(f"Retrieved {len(sections)} sections for class {class_id} from database")
        return [{"id": sec.id, "name": sec.name} for sec in sections]
    except Exception as e:
        log.error(f"Error fetching sections by class ID: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Fetching sections by class ID failed: {str(e)}")


async def update_section(db: AsyncSession, section_id: UUID, section_data: dict):
    try:
        result = await db.execute(select(SectionModel).where(SectionModel.id == section_id))
        section = result.scalar_one_or_none()

        if not section:
            raise HTTPException(status_code=404, detail="Section not found")

        for key, value in section_data.items():
            if hasattr(section, key) and value is not None:
                setattr(section, key, value)

        await db.flush()

        result = await db.execute(select(SectionModel).where(SectionModel.id == section_id))
        updated_section = result.scalar_one()

        await db.commit()
        return updated_section

    except Exception as e:
        await db.rollback()
        log.error(f"Error updating section: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating section: {str(e)}")


async def delete_section(db: AsyncSession, section_id: UUID):
    try:
        result = await db.execute(select(SectionModel).where(SectionModel.id == section_id))
        section = result.scalar_one_or_none()

        if not section:
            raise HTTPException(status_code=404, detail="Section not found")

        await db.execute(delete(SectionModel).where(SectionModel.id == section_id))
        await db.commit()

        return {"message": "Section deleted successfully"}

    except Exception as e:
        await db.rollback()
        log.error(f"Error deleting section: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting section: {str(e)}")


async def get_section_by_id(db: AsyncSession, section_id: UUID):
    try:
        result = await db.execute(
            select(SectionModel).options(selectinload(SectionModel.class_)).where(SectionModel.id == section_id)
        )
        section = result.scalar_one_or_none()

        if not section:
            raise HTTPException(status_code=404, detail="Section not found")

        return section

    except Exception as e:
        log.error(f"Error retrieving section: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving section: {str(e)}")
