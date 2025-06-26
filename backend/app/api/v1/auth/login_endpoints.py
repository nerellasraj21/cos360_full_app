from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.auth.login_schema import LoginRequest, LoginResponse
from app.service.auth.auth_service import login_user
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/auth/login", tags=["Auth/Login"])

@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    access_token = await login_user(db, request.username, request.password)
    return LoginResponse(access_token=access_token)
