from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from app.service.masters import class_service
from app.schemas.masters.class_schema import ClassCreate, ClassRead, ClassUpdate
from app.db.session import get_db
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/masters/class_sections", tags=["Masters/Class & Sections"])

# Create Class with Sections
@router.post("/", response_model=ClassRead, status_code=status.HTTP_201_CREATED)
async def create_class(class_data: ClassCreate, db: AsyncSession = Depends(get_db)):
    return await class_service.create_class_with_sections(db, class_data)

# Read Single Class with Sections
@router.get("/{class_id}", response_model=ClassRead)
async def get_class(class_id: int, db: AsyncSession = Depends(get_db)):
    db_class = await class_service.get_class_with_sections(db, class_id)
    if not db_class:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")
    return db_class

# Read All Classes with Sections
@router.get("/", response_model=List[ClassRead])
async def get_all_classes(db: AsyncSession = Depends(get_db)):
    return await class_service.get_all_classes_with_sections(db)

# Update Class and Replace Sections
@router.put("/{class_id}", response_model=dict)
async def update_class(class_id: int, class_data: ClassUpdate, db: AsyncSession = Depends(get_db)):
    updated = await class_service.update_class_with_sections(db, class_id, class_data)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")
    return updated

# Delete Class
@router.delete("/{class_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_class(class_id: int, db: AsyncSession = Depends(get_db)):
    deleted = await class_service.delete_class_with_sections(db, class_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")
    return {"detail": "Class deleted successfully"}