from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.student.attendance_schema import (
    StudentAttendanceCreate,
    StudentAttendanceOut,
    StudentAttendanceUpdate
)
from app.service.student.student_attendance_service import add_attendance, get_attendance_by_id, get_attendances, delete_attendance_data, update_partial_details_attendance
from app.tools.simple_permissions import check_role_permission, get_current_user_token

router = APIRouter(prefix="/student/attendance", tags=["Student/Student Attendance"])

# Create Attendance
@router.post("/", response_model=StudentAttendanceOut, status_code=status.HTTP_201_CREATED)
async def create_attendance(attendance: StudentAttendanceCreate, request: Request, db: AsyncSession = Depends(get_db)):
    """Create student attendance - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    has_permission = await check_role_permission(db, role, 'student_attendance', 'create')
    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail=f"Insufficient permissions: {role} cannot create student_attendance"
        )
    
    try:
        return await add_attendance(attendance, db)
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating attendance: {str(e)}")

# Get All Attendance Records
@router.get("/", response_model=list[StudentAttendanceOut])
async def get_all_attendance(request: Request, db: AsyncSession = Depends(get_db)):
    """Get all attendance records - All authenticated users"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    has_permission = await check_role_permission(db, role, 'student_attendance', 'list')
    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail=f"Insufficient permissions: {role} cannot list student_attendance"
        )
    
    return await get_attendances(db)

# Get Attendance by ID
@router.get("/{attendance_id}", response_model=StudentAttendanceOut)
async def get_attendance(attendance_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    """Get attendance by ID - All authenticated users"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    has_permission = await check_role_permission(db, role, 'student_attendance', 'read')
    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail=f"Insufficient permissions: {role} cannot read student_attendance"
        )
    
    return await get_attendance_by_id(attendance_id,db)

# Update Attendance (PATCH)
@router.patch("/{attendance_id}", response_model=StudentAttendanceOut)
async def update_attendance(attendance_id: int, update_data: StudentAttendanceUpdate, request: Request, db: AsyncSession = Depends(get_db)):
    """Update attendance - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    has_permission = await check_role_permission(db, role, 'student_attendance', 'update')
    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail=f"Insufficient permissions: {role} cannot update student_attendance"
        )
    
    return await update_partial_details_attendance(attendance_id,update_data,db)

# Delete Attendance
@router.delete("/{attendance_id}")
async def delete_attendance(attendance_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    """Delete attendance - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    has_permission = await check_role_permission(db, role, 'student_attendance', 'delete')
    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail=f"Insufficient permissions: {role} cannot delete student_attendance"
        )
    
    return await delete_attendance_data(attendance_id,db)
