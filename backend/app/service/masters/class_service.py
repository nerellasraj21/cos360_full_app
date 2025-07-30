from fastapi import HTTPException
from sqlalchemy.orm import Session,joinedload,selectinload
from sqlalchemy import select, delete
from app.models.masters.class_model import Class as ClassModel
from app.models.masters.sections_model import Section as SectionModel
from app.models.student.student_model import Student
from app.models.masters.admission_model import Admission
from app.schemas.masters.class_schema import ClassCreate, ClassUpdate
from app.schemas.masters.sections_schema import ClassSectionInfo
import logging as log
from sqlalchemy.ext.asyncio import AsyncSession

log = log.getLogger("masters.class_service")

async def create_class_with_sections(db: AsyncSession, class_data: ClassCreate):
    try:
        db_class = ClassModel(
            name = class_data.name,
            description = class_data.description,
            is_active = class_data.is_active,
            short_code = class_data.short_code,
            academic_year_id=class_data.academic_year_id 
        )
        db.add(db_class)
        await db.flush()  # Ensure the class is created before adding sections ang get class id

        if class_data.sections:
            for section in class_data.sections:
                new_section = SectionModel(
                    name = section.name,
                    description = section.description,
                    is_active = section.is_active,
                    class_id = db_class.id
                )
                db.add(new_section)            
        await db.commit()
        await db.refresh(db_class)
        return db_class
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"Error creating class with sections: {str(e)}")

async def get_class_with_sections(db: AsyncSession, class_id: int):
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

async def get_all_classes_with_sections(db: AsyncSession, academic_year_id: int = None):
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
    

async def update_class_with_sections(db: AsyncSession, class_id: int, class_data: ClassUpdate):
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
                    name=sec.name,
                    description=sec.description,
                    is_active=sec.is_active,
                    class_id=class_id
                )
                db.add(new_sec)

        await db.commit()
        return {"message": "Class and sections updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error fetching classes with sections: {str(e)}")



async def delete_class_with_sections(db: AsyncSession, class_id: int):
    try:
        # db_class = db.query(ClassModel).filter(ClassModel.id == class_id).first()
        result = await db.execute(select(ClassModel).where(ClassModel.id == class_id))
        db_class = result.scalar_one_or_none()
        if not db_class:
            raise HTTPException(status_code=404, detail="Class not found")
        
        # Delete all sections associated with the class
        # db.query(SectionModel).filter(SectionModel.class_id == class_id).delete()
        await db.execute(delete(SectionModel).where(SectionModel.class_id == class_id))
        
        # Delete the class itself
        # db.delete(db_class)
        await db.delete(db_class)
        await db.commit()
        return {"detail": "Class and associated sections deleted successfully"}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"Error deleting class with sections: {str(e)}")
    
async def get_class_section_list(db: AsyncSession) -> list[ClassSectionInfo]:
    stmt = select(SectionModel).options(joinedload(SectionModel.class_)).order_by(SectionModel.class_id, SectionModel.name)
    result = await db.execute(stmt)
    sections = result.scalars().all()

    return [
        ClassSectionInfo(
            section_id=section.id,
            class_section_name=f"{section.class_.name} - {section.name}"
        )
        for section in sections
    ]

async def get_all_classes_data(db: AsyncSession):
    result = await db.execute(select(ClassModel))
    return result.scalars().all()

async def get_all_sections_data(db: AsyncSession):
    result = await db.execute(select(SectionModel))
    return result.scalars().all()

async def get_sections_by_class_name(db, class_name: str):
    result = await db.execute(
        select(ClassModel).where(ClassModel.name == class_name).options(selectinload(ClassModel.sections))
    )
    class_obj = result.scalars().first()

    if not class_obj:
        raise HTTPException(status_code=404, detail="Class not found")

    return class_obj.sections

async def get_students_by_class_section(class_name: str, section_name: str, db):
    # Fetch class
    class_result = await db.execute(select(ClassModel).where(ClassModel.name == class_name))
    class_obj = class_result.scalars().first()
    if not class_obj:
        raise HTTPException(status_code=404, detail="Class not found")

    # Fetch section
    section_result = await db.execute(
        select(SectionModel).where(SectionModel.name == section_name, SectionModel.class_id == class_obj.id)
    )
    section_obj = section_result.scalars().first()
    if not section_obj:
        raise HTTPException(status_code=404, detail="Section not found for given class")

    # Get students with current class and section
    stmt = (
        select(Student)
        .join(Admission)
        .where(
            Admission.current_class_id == class_obj.id,
            Admission.current_section_id == section_obj.id
        )
        .options(selectinload(Student.admissions))
    )
    result = await db.execute(stmt)
    students = result.scalars().all()
    return students
    