from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.db.session import get_db
from app.schemas.masters.subject_category_schema import SubjectCategoryCreate, SubjectCategoryOut, SubjectCategoryDropdown
from app.service.masters.subject_category_service import create_subject_category, get_all_subject_categories, get_subject_categories_dropdown
from app.middleware.rate_limit_middleware import rate_limit_dropdown, rate_limit_create

router = APIRouter()
router = APIRouter(prefix="/masters/subject_categories", tags=["Masters/SubjectCategories"])

@router.post("/categories", response_model=SubjectCategoryOut)
@rate_limit_create("30 per minute")
async def create_category(request: Request, data: SubjectCategoryCreate, db: AsyncSession = Depends(get_db)):
    """Create a new subject category. Rate limited to 30 creates per minute."""
    return await create_subject_category(db, data)

@router.get("/categories", response_model=List[SubjectCategoryOut])
async def list_categories(db: AsyncSession = Depends(get_db)):
    """Get all subject categories"""
    return await get_all_subject_categories(db)

@router.get("/categories/dropdown", response_model=List[SubjectCategoryDropdown])
@rate_limit_dropdown("100 per minute")
async def get_categories_dropdown(request: Request, db: AsyncSession = Depends(get_db)):
    """Get subject categories for dropdown (id + name only). Rate limited to 100 requests per minute."""
    return await get_subject_categories_dropdown(db)
