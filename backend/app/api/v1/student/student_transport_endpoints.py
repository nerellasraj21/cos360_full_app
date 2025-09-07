from fastapi import APIRouter, Depends, status, Request, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.tools.simple_permissions import check_role_permission, get_current_user_token
from app.schemas.student.student_transport_schema import (
    StudentTransportCreate,
    StudentTransportUpdate,
    StudentTransportOut,
)

from app.service.student.student_transport_service import get_transport_assignments,get_transport_by_student_id,update_partial_details_transport_assignment,add_student_transport,unassign_transport

router = APIRouter(prefix="/students/student-transport", tags=["Student/Student Transport"])


@router.post("/", response_model=StudentTransportOut, status_code=status.HTTP_201_CREATED)
async def create_student_transport(
    request: Request,
    data: StudentTransportCreate,
    db: AsyncSession = Depends(get_db)
):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    has_permission = await check_role_permission(db, role, 'student_transport', 'create')
    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions: {role} cannot create student_transport"
        )
    
    return await add_student_transport(data,db)

@router.get("/", response_model=list[StudentTransportOut])
async def get_all_transport_assignments(request: Request, db: AsyncSession = Depends(get_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    has_permission = await check_role_permission(db, role, 'student_transport', 'list')
    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions: {role} cannot list student_transport"
        )
    
    return await get_transport_assignments(db)


@router.get("/student/{student_id}", response_model=list[StudentTransportOut])
async def get_transport_by_student(request: Request, student_id: int, db: AsyncSession = Depends(get_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    has_permission = await check_role_permission(db, role, 'student_transport', 'read')
    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions: {role} cannot read student_transport"
        )
    
    return await get_transport_by_student_id(student_id,db)


@router.patch("/{transport_id}", response_model=StudentTransportOut)
async def update_transport_assignment(
    request: Request,
    transport_id: int,
    updates: StudentTransportUpdate,
    db: AsyncSession = Depends(get_db)
):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    has_permission = await check_role_permission(db, role, 'student_transport', 'update')
    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions: {role} cannot update student_transport"
        )
    
    return await update_partial_details_transport_assignment(transport_id,updates,db)


@router.delete("/{transport_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transport_assignment(request: Request, transport_id: int, db: AsyncSession = Depends(get_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    has_permission = await check_role_permission(db, role, 'student_transport', 'delete')
    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions: {role} cannot delete student_transport"
        )
    
    return await unassign_transport(transport_id,db)