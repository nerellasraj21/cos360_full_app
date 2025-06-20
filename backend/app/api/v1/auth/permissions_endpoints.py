from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.service.auth import create_permission, get_all_permissions
from app.schemas.auth import RoleMenuPermissionCreate, RoleMenuPermissionRead
from app.db.session import get_db

router = APIRouter()

@router.post("/permissions/", response_model=RoleMenuPermissionRead)
def create_permission_endpoint(permission: RoleMenuPermissionCreate, db: Session = Depends(get_db)):
    return create_permission(db, permission)

@router.get("/permissions/", response_model=list[RoleMenuPermissionRead])
def get_permissions_endpoint(db: Session = Depends(get_db)):
    return get_all_permissions(db)
