from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.service.auth import create_role, get_all_roles
from app.schemas.auth import RoleCreate, RoleRead
from app.db.session import get_db

router = APIRouter(prefix="/auth/roles", tags=["Auth/Roles"])

@router.post("/roles/", response_model=RoleRead)
def create_role_endpoint(role: RoleCreate, db: Session = Depends(get_db)):
    return create_role(db, role)

@router.get("/roles/", response_model=list[RoleRead])
def get_roles_endpoint(db: Session = Depends(get_db)):
    return get_all_roles(db)
