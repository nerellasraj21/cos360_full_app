
from sqlalchemy.orm import Session
from app.models.auth import Menu
from app.schemas.auth import MenuCreate

def create_menu(db: Session, menu: MenuCreate):
    db_menu = Menu(**menu.dict())
    db.add(db_menu)
    db.commit()
    db.refresh(db_menu)
    return db_menu

def get_all_menus(db: Session):
    return db.query(Menu).all()
