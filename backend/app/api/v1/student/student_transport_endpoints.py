from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.student.student_transport_schema import (
    StudentTransportCreate,
    StudentTransportUpdate,
    StudentTransportOut,
)

from app.service.student.student_transport_service import get_transport_assignments,get_transport_by_student_id,update_partial_details_transport_assignment,add_student_transport,unassign_transport

router = APIRouter(prefix="/students/student-transport", tags=["Student/Student Transport"])


@router.post("/", response_model=StudentTransportOut, status_code=status.HTTP_201_CREATED)
async def create_student_transport(
    data: StudentTransportCreate,
    db: AsyncSession = Depends(get_db)
):
    return await add_student_transport(data,db)

@router.get("/", response_model=list[StudentTransportOut])
async def get_all_transport_assignments(db: AsyncSession = Depends(get_db)):
    return await get_transport_assignments(db)


@router.get("/student/{student_id}", response_model=list[StudentTransportOut])
async def get_transport_by_student(student_id: int, db: AsyncSession = Depends(get_db)):
    return await get_transport_by_student_id(student_id,db)


@router.patch("/{transport_id}", response_model=StudentTransportOut)
async def update_transport_assignment(
    transport_id: int,
    updates: StudentTransportUpdate,
    db: AsyncSession = Depends(get_db)
):
    return await update_partial_details_transport_assignment(transport_id,updates,db)


@router.delete("/{transport_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transport_assignment(transport_id: int, db: AsyncSession = Depends(get_db)):
    return await unassign_transport(transport_id,db)