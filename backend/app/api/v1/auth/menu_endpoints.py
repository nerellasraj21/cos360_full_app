from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.service.auth import create_menu, get_all_menus
from app.schemas.auth import MenuCreate, MenuRead
from app.db.session import get_db

router = APIRouter()

@router.post("/menus/", response_model=MenuRead)
def create_menu_endpoint(menu: MenuCreate, db: Session = Depends(get_db)):
    return create_menu(db, menu)

@router.get("/menus/", response_model=list[MenuRead])
def get_menus_endpoint(db: Session = Depends(get_db)):
    return get_all_menus(db)
