from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.db.tenant_session import get_tenant_db
from app.tools.simple_permissions import check_role_permission, get_current_user_token, check_role_plan_permission_with_error
from app.schemas.masters.subject_category_schema import SubjectCategoryCreate, SubjectCategoryOut, SubjectCategoryDropdown
from app.service.masters.subject_category_service import create_subject_category, get_all_subject_categories, get_subject_categories_dropdown
from app.middleware.rate_limit_middleware import rate_limit_dropdown, rate_limit_create

router = APIRouter()
router = APIRouter(prefix="/masters/subject_categories", tags=["Masters/SubjectCategories"])

@router.post("/categories", response_model=SubjectCategoryOut)
@rate_limit_create("30 per minute")
async def create_category(request: Request, data: SubjectCategoryCreate, db: AsyncSession = Depends(get_tenant_db)):
    """Create a new subject category. Rate limited to 30 creates per minute."""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'subject_categories', 'create')
    
    return await create_subject_category(db, data)

@router.get("/categories", response_model=List[SubjectCategoryOut])
async def list_categories(request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """Get all subject categories"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'subject_categories', 'list')
    
    return await get_all_subject_categories(db)

@router.get("/categories/dropdown", response_model=List[SubjectCategoryDropdown])
@rate_limit_dropdown("100 per minute")
async def get_categories_dropdown(request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """Get subject categories for dropdown (id + name only). Rate limited to 100 requests per minute."""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'subject_categories', 'list')
    
    return await get_subject_categories_dropdown(db)
