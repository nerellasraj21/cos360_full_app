from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from sqlalchemy.future import select
from app.models.student.student_transport_model import StudentTransportAssignment
from app.schemas.student.student_transport_schema import (
    StudentTransportCreate,
    StudentTransportUpdate,
)


async def add_student_transport(
    data: StudentTransportCreate,
    db: AsyncSession
):
    new_assignment = StudentTransportAssignment(**data.dict())
    db.add(new_assignment)
    await db.commit()
    await db.refresh(new_assignment)
    return new_assignment

async def get_transport_assignments(db: AsyncSession):
    result = await db.execute(select(StudentTransportAssignment))
    return result.scalars().all()

async def get_transport_by_student_id(student_id: UUID, db: AsyncSession):
    result = await db.execute(
        select(StudentTransportAssignment).where(StudentTransportAssignment.student_id == student_id)
    )
    records = result.scalars().all()
    if not records:
        raise HTTPException(status_code=404, detail="No transport assignments found for this student.")
    return records

async def update_partial_details_transport_assignment(
    transport_id: UUID,
    updates: StudentTransportUpdate,
    db: AsyncSession
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

async def unassign_transport(transport_id: UUID, db: AsyncSession):
    result = await db.execute(select(StudentTransportAssignment).where(StudentTransportAssignment.id == transport_id))
    assignment = result.scalar_one_or_none()

    if not assignment:
        raise HTTPException(status_code=404, detail="Transport assignment not found.")

    await db.delete(assignment)
    await db.commit()
