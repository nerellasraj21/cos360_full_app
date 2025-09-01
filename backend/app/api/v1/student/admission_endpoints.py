from fastapi import APIRouter, Depends,Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.student.admission_schema import StudentAdmissionCreate, StudentAdmissionUpdate
from app.schemas.student.student_schema import StudentOut
from app.db.session import get_db
from typing import List
from app.service.student.admission_service import add_admission, update_partial_details_admission, get_admission_by_id,get_student_by_admission_id,search_students

router = APIRouter(prefix="/students/admission", tags=["Student/Student Admission"])

@router.post("/")
async def create_admission(admission: StudentAdmissionCreate, db: AsyncSession = Depends(get_db)):

    admission_respose = await add_admission(admission,db)
    return admission_respose

@router.get("/id/{student_id}")
async def get_admission(student_id: int, db: AsyncSession = Depends(get_db)):
    admission_details = await get_admission_by_id(student_id,db)
    return admission_details

@router.patch("/{student_id}")
async def update_admission(student_id: int, data: StudentAdmissionUpdate, db: AsyncSession = Depends(get_db)):
    updated_data = await update_partial_details_admission(student_id,data,db)
    return updated_data

# Get student by admission ID 
@router.get("/by-admission/{admission_id}")
async def fetch_student_by_admission(admission_id: int, db: AsyncSession = Depends(get_db)):
    return await get_student_by_admission_id(admission_id, db)

# Search (get while typing)
@router.get("/search")
async def search_student_by_text(query: str = Query(..., min_length=1), db: AsyncSession = Depends(get_db)):
    return await search_students(query, db)