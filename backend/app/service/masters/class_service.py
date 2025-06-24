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

def get_all_classes_with_sections(db: Session):
    try:
        classes = db.query(ClassModel).all()
        for db_class in classes:
            sections = db.query(SectionModel).filter(SectionModel.class_id == db_class.id).all()
            db_class.sections = sections
        return classes
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error fetching classes with sections: {str(e)}")
    

def update_class_with_sections(db: Session, class_id: int, class_data: ClassUpdate):
    try:
        db_class = db.query(ClassModel).filter(ClassModel.id == class_id).first()
        if not db_class:
            raise HTTPException(status_code=404, detail="Class not found")
        
        update_data = class_data.model_dump(exclude_unset=True)
        for var, value in update_data.items():
            setattr(db_class, var, value)
        db.commit()
        db.refresh(db_class)
        # Update sections
        if class_data.sections:
            # Clear existing sections
            db.query(SectionModel).filter(SectionModel.class_id == class_id).delete()
            # Add new sections
            for section in class_data.sections:
                new_section = SectionModel(
                    name=section.name,
                    description=section.description,
                    is_active=section.is_active,
                    class_id=db_class.id
                )
                db.add(new_section)
        db.commit()
        return db_class
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error updating class with sections: {str(e)}")
    