from fastapi import APIRouter, Depends, status, Request, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from sqlalchemy.future import select as sa_select
from app.db.tenant_session import get_tenant_db
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
    db: AsyncSession = Depends(get_tenant_db)
):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'student_transport', 'create')
    
    return await add_student_transport(data, db, request)

@router.get("/", response_model=list[StudentTransportOut])
async def get_all_transport_assignments(request: Request, db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'student_transport', 'list')
    
    return await get_transport_assignments(db, request)


@router.get("/student/{student_id}", response_model=list[StudentTransportOut])
async def get_transport_by_student(request: Request, student_id: UUID, db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    user_id = current_user.get('sub')

    if role == "Student":
        # Student may only view their own transport assignment
        from app.models.student.student_model import Student
        stu_result = await db.execute(sa_select(Student).where(Student.user_id == user_id))
        student = stu_result.scalar_one_or_none()
        if not student or str(student.id) != str(student_id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail="You can only view your own transport assignment")

    elif role == "Parent":
        # Parent may only view transport for their linked children
        r = await db.execute(
            text("""SELECT spl.student_id FROM student_parent_links spl
                    JOIN parents p ON p.id = spl.parent_id
                    WHERE p.user_id = :uid AND spl.student_id = :sid"""),
            {"uid": user_id, "sid": str(student_id)}
        )
        if not r.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail="You can only view transport for your own children")
    else:
        await check_role_plan_permission_with_error(db, request, role, 'student_transport', 'read')

    return await get_transport_by_student_id(student_id, db, request)


@router.patch("/{transport_id}", response_model=StudentTransportOut)
async def update_transport_assignment(
    request: Request,
    transport_id: UUID,
    updates: StudentTransportUpdate,
    db: AsyncSession = Depends(get_tenant_db)
):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'student_transport', 'update')
    
    return await update_partial_details_transport_assignment(transport_id, updates, db, request)


@router.delete("/{transport_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transport_assignment(request: Request, transport_id: UUID, db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    
    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, 'student_transport', 'delete')
    
    await unassign_transport(transport_id, db, request)