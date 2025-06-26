from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.service.auth import create_role, get_all_roles
from app.schemas.auth import RoleCreate, RoleRead
from app.db.session import get_db
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/auth/roles", tags=["Auth/Roles"])

@router.post("/roles/", response_model=RoleRead)
async def create_role_endpoint(role: RoleCreate, db: AsyncSession = Depends(get_db)):
    return await create_role(db, role)

@router.get("/roles/", response_model=list[RoleRead])
async def get_roles_endpoint(db: AsyncSession = Depends(get_db)):
    return await get_all_roles(db)
