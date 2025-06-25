from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.masters.class_model import Class as ClassModel
from app.models.masters.sections_model import Section as SectionModel
from app.schemas.masters.class_schema import ClassCreate, ClassUpdate
import logging as log

log = log.getLogger("masters.class_service")

def create_class_with_sections(db: Session, class_data: ClassCreate):
    try:
        db_class = ClassModel(
            name = class_data.name,
            description = class_data.description,
            is_active = class_data.is_active,
            short_code = class_data.short_code,
            academic_year_id=class_data.academic_year_id
        )
        db.add(db_class)
        db.flush()  # Ensure the class is created before adding sections ang get class id

        if class_data.sections:
            for section in class_data.sections:
                new_section = SectionModel(
                    name = section.name,
                    description = section.description,
                    is_active = section.is_active,
                    class_id = db_class.id
                )
                db.add(new_section)            
        db.commit()
        db.refresh(db_class)
        return db_class
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error creating class with sections: {str(e)}")

def get_class_with_sections(db: Session, class_id: int):
    try:
        db_class = db.query(ClassModel).filter(ClassModel.id == class_id).first()
        if not db_class:
            raise HTTPException(status_code=404, detail="Class not found")
        
        sections = db.query(SectionModel).filter(SectionModel.class_id == class_id).all()
        db_class.sections = sections
        return db_class
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error fetching class with sections: {str(e)}")

def get_all_classes_with_sections(db: Session, academic_year_id: int = None):
    try:
        classes = db.query(ClassModel).all()
        if academic_year_id:
            classes = classes.filter(ClassModel.academic_year_id == academic_year_id).all()
        if not classes:
            raise HTTPException(status_code=404, detail="No classes found in the given academic year")
        # Fetch sections for each class
        for db_class in classes:
            sections = db.query(SectionModel).filter(SectionModel.class_id == db_class.id).all()
            db_class.sections = sections
        return classes
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error fetching classes with sections: {str(e)}")
    

def update_class_with_sections(db: Session, class_id: int, class_data: ClassUpdate):
    try:
        existing_class = db.query(ClassModel).filter(ClassModel.id == class_id).first()
        if not existing_class:
            raise HTTPException(status_code=404, detail="Class not found")

        # Update class fields
        for key, value in class_data.dict(exclude_unset=True, exclude={"sections"}).items():
            setattr(existing_class, key, value)

        # Handle sections update
        if class_data.sections is not None:
            # Remove existing sections
            db.query(SectionModel).filter(SectionModel.class_id == class_id).delete()
            db.flush()  # Ensure deletion happens before re-inserting

            # Add updated/new sections
            for sec in class_data.sections:
                new_sec = SectionModel(
                    name=sec.name,
                    description=sec.description,
                    is_active=sec.is_active,
                    class_id=class_id
                )
                db.add(new_sec)

        db.commit()
        return {"message": "Class and sections updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error fetching classes with sections: {str(e)}")



def delete_class_with_sections(db: Session, class_id: int):
    try:
        db_class = db.query(ClassModel).filter(ClassModel.id == class_id).first()
        if not db_class:
            raise HTTPException(status_code=404, detail="Class not found")
        
        # Delete all sections associated with the class
        db.query(SectionModel).filter(SectionModel.class_id == class_id).delete()
        
        # Delete the class itself
        db.delete(db_class)
        db.commit()
        return {"detail": "Class and associated sections deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error deleting class with sections: {str(e)}")
    