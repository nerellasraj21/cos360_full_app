from fastapi import APIRouter, Depends, status, Request, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.tools.simple_permissions import check_role_permission, get_current_user_token, check_role_plan_permission_with_error
from app.schemas.student.student_transport_schema import (
    StudentTransportCreate,
    StudentTransportUpdate,
    StudentTransportOut,
)
from uuid import UUID

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
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'student_transport', 'create')
    
    return await add_student_transport(data,db)

@router.get("/", response_model=list[StudentTransportOut])
async def get_all_transport_assignments(request: Request, db: AsyncSession = Depends(get_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'student_transport', 'list')
    
    return await get_transport_assignments(db)


@router.get("/student/{student_id}", response_model=list[StudentTransportOut])
async def get_transport_by_student(request: Request, student_id: UUID, db: AsyncSession = Depends(get_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'student_transport', 'read')
    
    return await get_transport_by_student_id(student_id,db)


@router.patch("/{transport_id}", response_model=StudentTransportOut)
async def update_transport_assignment(
    request: Request,
    transport_id: UUID,
    updates: StudentTransportUpdate,
    db: AsyncSession = Depends(get_db)
):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'student_transport', 'update')
    
    return await update_partial_details_transport_assignment(transport_id,updates,db)


@router.delete("/{transport_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transport_assignment(request: Request, transport_id: UUID, db: AsyncSession = Depends(get_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'student_transport', 'delete')
    
    return await unassign_transport(transport_id,db)