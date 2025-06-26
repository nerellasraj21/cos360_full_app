from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.service.auth import create_menu, get_all_menus
from app.schemas.auth import MenuCreate, MenuRead
from app.db.session import get_db
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()

@router.post("/menus/", response_model=MenuRead)
async def create_menu_endpoint(menu: MenuCreate, db: AsyncSession = Depends(get_db)):
    return await create_menu(db, menu)

@router.get("/menus/", response_model=list[MenuRead])
async def get_menus_endpoint(db: AsyncSession = Depends(get_db)):
    return await get_all_menus(db)
