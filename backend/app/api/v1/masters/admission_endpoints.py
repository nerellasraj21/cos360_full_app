from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.masters.admission_schema import StudentAdmissionCreate, StudentAdmissionResponse, StudentAdmissionUpdate
from app.schemas.masters.student_schema import StudentOut
from app.schemas.masters.parent_schema import ParentOut
from app.models.masters.admission_model import Admission
from app.models.masters.student_model import Student
from app.models.masters.parent_model import Parent
from app.models.masters.student_parent_association_model import StudentParentLink
from sqlalchemy.orm import selectinload
from app.models.auth.user_model import User
from app.db.session import get_db
from sqlalchemy.future import select
from app.tools.password_util import hash_password

router = APIRouter(prefix="/students/admission", tags=["Student Admission"])

@router.post("/")
async def create_admission(admission: StudentAdmissionCreate, db: AsyncSession = Depends(get_db)):

    admission_dict = admission.dict(exclude={"student"})

    # Convert student fields, excluding the nested ones
    student_data = admission.student.dict(exclude={"father", "mother"})
    
    student_dict = Student(**student_data)
    student_user_data = User(
        username = student_dict.first_name,
        password_hash = hash_password("student@123"),
        is_active = True,
        role_id= 3 #static value
    )

    db.add(student_user_data)
    await db.flush()

    student_dict.user_id=student_user_data.id
    db.add(student_dict)
    await db.flush()

    # Convert nested models directly
    father_dict = Parent(**admission.student.father.dict())
    father_user_data = User(
        username = father_dict.name,
        email = father_dict.email,
        password_hash = hash_password("parent@123"),
        is_active = True,
        role_id= 6 #static value
    )
    db.add(father_user_data)
    await db.flush()

    mother_dict = Parent(**admission.student.mother.dict())
    mother_user_data = User(
        username = mother_dict.name,
        email = mother_dict.email,
        password_hash = hash_password("parent@123"),
        is_active = True,
        role_id= 6 #static value
    )
    db.add(mother_user_data)
    await db.flush()

    father_dict.user_id=father_user_data.id
    db.add(father_dict)
    await db.flush()

    mother_dict.user_id=mother_user_data.id
    db.add(mother_dict)
    await db.flush()

    student_parent_link= StudentParentLink(student_id = student_dict.id, parent_id = father_dict.id)
    db.add(student_parent_link)
    await db.flush()

    student_parent_link= StudentParentLink(student_id = student_dict.id, parent_id = mother_dict.id)
    db.add(student_parent_link)
    await db.flush()

    new_admission = Admission(
        student_id=student_dict.id,
        **admission_dict
    )
    
    db.add(new_admission)
    await db.commit()

    result = await db.execute(
        select(Admission)
        .options(
            selectinload(Admission.student)
            .selectinload(Student.parent_links)
            .selectinload(StudentParentLink.parent)
        )
        .where(Admission.id == new_admission.id)
    )
    admission_out = result.scalar_one()

    return admission_out

@router.get("/{student_id}")
async def get_admission(student_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Admission).options(
            selectinload(Admission.student)
            .selectinload(Student.parent_links)
            .selectinload(StudentParentLink.parent)
        ).where(Admission.student_id == student_id))
    admission = result.scalar_one_or_none()
    if not admission:
        raise HTTPException(status_code=404, detail="Admission not found")
    return admission

@router.patch("/{student_id}")
async def update_admission(student_id: int, data: StudentAdmissionUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Admission).where(Admission.student_id == student_id))
    admission = result.scalar_one_or_none()
    if not admission:
        raise HTTPException(status_code=404, detail="Admission not found")
    for field, value in data.dict(exclude_unset=True).items():
        setattr(admission, field, value)
    await db.commit()
    await db.refresh(admission)
    return admission
