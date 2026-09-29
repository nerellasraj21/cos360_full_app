from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auth import User
from app.tools.jwt_utils import create_access_token
from app.tools.password_util import verify_password


async def authenticate_user(db: AsyncSession, username: str, password: str):
    # user = db.query(User).filter(User.username == username).first()
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()

    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")
    return user


async def login_user(db: AsyncSession, username: str, password: str):
    user = await authenticate_user(db, username, password)
    access_token = create_access_token({"sub": str(user.id), "username": user.username, "role": user.role.name})
    return access_token
