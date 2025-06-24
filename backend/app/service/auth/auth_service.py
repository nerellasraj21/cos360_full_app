from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.auth import User
from app.tools.jwt_utils import create_access_token
from app.tools.password_util import verify_password

def authenticate_user(db: Session, username: str, password: str):
    user = db.query(User).filter(User.username == username).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    return user

def login_user(db: Session, username: str, password: str):
    user = authenticate_user(db, username, password)
    access_token = create_access_token({
        "sub": str(user.id),
        "username": user.username,
        "role": user.role.name
    })
    return access_token 
