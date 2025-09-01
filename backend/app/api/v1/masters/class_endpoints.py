from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from typing import List
from app.service.masters.class_service import create_class_with_sections,get_all_classes_with_sections,update_class_with_sections,delete_class_with_sections,get_class_with_sections,get_class_section_list,get_all_classes_data,get_all_sections_data,get_sections_by_class_name,get_students_by_class_section
from app.schemas.masters.class_schema import ClassCreate, ClassRead, ClassUpdate,ClassOut
from app.schemas.masters.sections_schema import ClassSectionInfo,SectionOut
from app.schemas.student.student_schema import StudentOut
from app.db.session import get_db
from app.middleware.rate_limit_middleware import rate_limit_dropdown, rate_limit_api, rate_limit_create
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/masters/class_sections", tags=["Masters/Class & Sections"])

# Create Class with Sections
@router.post("/", response_model=ClassRead, status_code=status.HTTP_201_CREATED)
@rate_limit_create("30 per minute")
async def create_class(request: Request, class_data: ClassCreate, db: AsyncSession = Depends(get_db)):
    return await create_class_with_sections(db, class_data)

# Read Single Class with Sections
@router.get("/by_class_id/{class_id}", response_model=ClassRead)
async def get_class(class_id: int, db: AsyncSession = Depends(get_db)):
    db_class = await get_class_with_sections(db, class_id)
    if not db_class:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")
    return db_class

# Read All Classes with Sections
@router.get("/read_all", response_model=List[ClassRead])
async def get_classes_with_sections(db: AsyncSession = Depends(get_db)):
    return await get_all_classes_with_sections(db)

# Update Class and Replace Sections
@router.put("/{class_id}", response_model=dict)
async def update_class(class_id: int, class_data: ClassUpdate, db: AsyncSession = Depends(get_db)):
    updated = await update_class_with_sections(db, class_id, class_data)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")
    return updated

# Delete Class
@router.delete("/{class_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_class(class_id: int, db: AsyncSession = Depends(get_db)):
    deleted = await delete_class_with_sections(db, class_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")
    return {"detail": "Class deleted successfully"}

@router.get("/class-section-list", response_model=list[ClassSectionInfo])
async def list_class_sections(db: AsyncSession = Depends(get_db)):
    return await get_class_section_list(db)

@router.get("/class-list", response_model=List[ClassOut])
@rate_limit_dropdown("100 per minute")
async def get_all_classes(request: Request, db: AsyncSession = Depends(get_db)):
    return await get_all_classes_data(db)

@router.get("/section-list", response_model=List[SectionOut])
@rate_limit_dropdown("100 per minute")
async def get_all_sections(request: Request, db: AsyncSession = Depends(get_db)):
    return await get_all_sections_data(db)

@router.get("/sections-by-class-name", response_model=List[SectionOut])
@rate_limit_dropdown("100 per minute")
async def fetch_sections_by_class_name(request: Request, class_name: str = Query(..., description="Name of the class"), db: AsyncSession = Depends(get_db)):
    return await get_sections_by_class_name(db, class_name)

@router.get("/by-class-section")
async def list_students_by_class_section(
    class_name: str = Query(..., description="Class name (e.g., 'UKG')"),
    section_name: str = Query(..., description="Section name (e.g., 'A')"),
    db: AsyncSession = Depends(get_db)
):
    return await get_students_by_class_section(class_name, section_name, db)