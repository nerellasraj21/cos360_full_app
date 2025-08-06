from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.session import get_db
from app.models.masters.subject_category_model import SubjectCategory
from app.schemas.masters.subject_category_schema import SubjectCategoryCreate, SubjectCategoryOut

router = APIRouter()
router = APIRouter(prefix="/subject_categories", tags=["SubjectCategories"])

@router.post("/categories", response_model=SubjectCategoryOut)
async def create_category(data: SubjectCategoryCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(SubjectCategory).where(SubjectCategory.name == data.name))
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="Category already exists")

    new_cat = SubjectCategory(name=data.name)
    db.add(new_cat)
    await db.commit()
    await db.refresh(new_cat)
    return new_cat


@router.get("/categories", response_model=list[SubjectCategoryOut])
async def list_categories(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SubjectCategory))
    return result.scalars().all()
