from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update, delete
from app.db.session import get_db
from app.models.masters.student_transport_model import StudentTransportAssignment
from app.schemas.masters.student_transport_schema import (
    StudentTransportCreate,
    StudentTransportUpdate,
    StudentTransportOut,
)

router = APIRouter(prefix="/student-transport", tags=["Student Transport"])


@router.post("/", response_model=StudentTransportOut, status_code=status.HTTP_201_CREATED)
async def create_student_transport(
    data: StudentTransportCreate,
    db: AsyncSession = Depends(get_db)
):
    new_assignment = StudentTransportAssignment(**data.dict())
    db.add(new_assignment)
    await db.commit()
    await db.refresh(new_assignment)
    return new_assignment


@router.get("/", response_model=list[StudentTransportOut])
async def get_all_transport_assignments(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(StudentTransportAssignment))
    return result.scalars().all()


@router.get("/student/{student_id}", response_model=list[StudentTransportOut])
async def get_transport_by_student(student_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(StudentTransportAssignment).where(StudentTransportAssignment.student_id == student_id)
    )
    records = result.scalars().all()
    if not records:
        raise HTTPException(status_code=404, detail="No transport assignments found for this student.")
    return records


@router.patch("/{transport_id}", response_model=StudentTransportOut)
async def update_transport_assignment(
    transport_id: int,
    updates: StudentTransportUpdate,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(StudentTransportAssignment).where(StudentTransportAssignment.id == transport_id))
    assignment = result.scalar_one_or_none()

    if not assignment:
        raise HTTPException(status_code=404, detail="Transport assignment not found.")

    for field, value in updates.dict(exclude_unset=True).items():
        setattr(assignment, field, value)

    await db.commit()
    await db.refresh(assignment)
    return assignment


@router.delete("/{transport_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transport_assignment(transport_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(StudentTransportAssignment).where(StudentTransportAssignment.id == transport_id))
    assignment = result.scalar_one_or_none()

    if not assignment:
        raise HTTPException(status_code=404, detail="Transport assignment not found.")

    await db.delete(assignment)
    await db.commit()
