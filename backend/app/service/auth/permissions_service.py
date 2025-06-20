from sqlalchemy.orm import Session
from app.models.auth import RoleMenuPermission
from app.schemas.auth import RoleMenuPermissionCreate

def create_permission(db: Session, permission: RoleMenuPermissionCreate):
    db_permission = RoleMenuPermission(**permission.dict())
    db.add(db_permission)
    db.commit()
    db.refresh(db_permission)
    return db_permission

def get_all_permissions(db: Session):
    return db.query(RoleMenuPermission).all()
