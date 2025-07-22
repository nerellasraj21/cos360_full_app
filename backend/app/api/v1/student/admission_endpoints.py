from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.student.admission_schema import StudentAdmissionCreate, StudentAdmissionUpdate
from app.db.session import get_db
from app.service.student.admission_service import add_admission, update_partial_details_admission, get_admission_by_id

router = APIRouter(prefix="/students/admission", tags=["Student Admission"])

@router.post("/")
async def create_admission(admission: StudentAdmissionCreate, db: AsyncSession = Depends(get_db)):

    admission_respose = await add_admission(admission,db)
    return admission_respose

@router.get("/{student_id}")
async def get_admission(student_id: int, db: AsyncSession = Depends(get_db)):
    admission_details = await get_admission_by_id(student_id,db)
    return admission_details

@router.patch("/{student_id}")
async def update_admission(student_id: int, data: StudentAdmissionUpdate, db: AsyncSession = Depends(get_db)):
    updated_data = await update_partial_details_admission(student_id,data,db)
    return updated_data
