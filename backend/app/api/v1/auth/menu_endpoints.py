from fastapi import APIRouter, Depends, Request, HTTPException, status
from sqlalchemy.orm import Session
from app.service.auth import create_menu, get_all_menus
from app.schemas.auth import MenuCreate, MenuRead
from app.db.session import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from app.tools.simple_permissions import check_role_permission, get_current_user_token

router = APIRouter()

@router.post("/menus/", response_model=MenuRead, status_code=status.HTTP_201_CREATED)
async def create_menu_endpoint(menu: MenuCreate, request: Request, db: AsyncSession = Depends(get_db)):
    """Create menu - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    has_permission = await check_role_permission(db, role, 'menu_management', 'create')
    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail=f"Insufficient permissions: {role} cannot create menu_management"
        )
    
    return await create_menu(db, menu)

@router.get("/menus/", response_model=list[MenuRead])
async def get_menus_endpoint(request: Request, db: AsyncSession = Depends(get_db)):
    """List all menus - All authenticated users"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    has_permission = await check_role_permission(db, role, 'menu_management', 'list')
    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail=f"Insufficient permissions: {role} cannot list menu_management"
        )
    
    return await get_all_menus(db)
