from fastapi import APIRouter
from app.tools.jwt_utils import create_access_token
import logging

logger = logging.getLogger("test_jwt")
router = APIRouter(prefix="/auth/test-jwt", tags=["Test JWT"])

@router.get("/admin-token")
async def get_admin_token():
    """Get a test JWT token for Admin role"""
    token_data = {
        "sub": "550e8400-e29b-41d4-a716-446655440001",
        "username": "admin@test.com",
        "role": "Admin",
        "client_name": "test_tenant"
    }
    
    access_token = create_access_token(token_data)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": token_data,
        "instructions": "Use this token in Authorization header: Bearer <token>"
    }

@router.get("/teacher-token")
async def get_teacher_token():
    """Get a test JWT token for Teacher role"""
    token_data = {
        "sub": "550e8400-e29b-41d4-a716-446655440002",
        "username": "teacher@test.com",
        "role": "Teacher",
        "client_name": "test_tenant"
    }
    
    access_token = create_access_token(token_data)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": token_data,
        "instructions": "Use this token in Authorization header: Bearer <token>"
    }

@router.get("/student-token")
async def get_student_token():
    """Get a test JWT token for Student role"""
    token_data = {
        "sub": "550e8400-e29b-41d4-a716-446655440003",
        "username": "student@test.com",
        "role": "Student",
        "client_name": "test_tenant"
    }
    
    access_token = create_access_token(token_data)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": token_data,
        "instructions": "Use this token in Authorization header: Bearer <token>"
    }