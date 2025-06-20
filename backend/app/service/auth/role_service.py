from sqlalchemy.orm import Session
from app.models.auth import Role
from app.schemas.auth import RoleCreate

def create_role(db: Session, role: RoleCreate):
    db_role = Role(**role.dict())
    db.add(db_role)
    db.commit()
    db.refresh(db_role)
    return db_role

def get_all_roles(db: Session):
    return db.query(Role).all()
