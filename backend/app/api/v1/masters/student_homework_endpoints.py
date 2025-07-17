# from fastapi import APIRouter, Depends, HTTPException
# from sqlalchemy.ext.asyncio import AsyncSession
# from app.schemas.masters. import StudentHomeworkCreate, StudentHomeworkOut
# from app.models.student.homework import StudentHomework
# from app.database import get_db
# from sqlalchemy.future import select

# router = APIRouter(prefix="/students/homework", tags=["Student Homework"])

# @router.post("/", response_model=StudentHomeworkOut)
# async def submit_homework(data: StudentHomeworkCreate, db: AsyncSession = Depends(get_db)):
#     homework = StudentHomework(**data.dict())
#     db.add(homework)
#     await db.commit()
#     await db.refresh(homework)
#     return homework

# @router.get("/{student_id}", response_model=list[StudentHomeworkOut])
# async def get_homeworks(student_id: int, db: AsyncSession = Depends(get_db)):
#     result = await db.execute(select(StudentHomework).where(StudentHomework.student_id == student_id))
#     return result.scalars().all()
