# app/api/v1/exam/mark_entry_endpoints.py
from fastapi import APIRouter, Depends, Request, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import uuid

from app.db.tenant_session import get_tenant_db
from app.tools.simple_permissions import check_role_plan_permission_with_error
from app.tools.simple_permissions import get_current_user_token
from app.schemas.exam.mark_entry_schema import MarkEntryCreate, MarkEntryRead
from app.service.exam.mark_entry_service import (
    authorize_mark_entry,
    get_marks,
    get_marks_grid,
    upsert_marks,
)
from app.service.exam.excel_service import (
    generate_excel_template,
    parse_excel_upload,
)

router = APIRouter(prefix="/exams/{exam_id}/marks", tags=["Mark Entry"])


@router.get("/template")
async def download_mark_template(
    exam_id: uuid.UUID,
    class_id: uuid.UUID,
    section_id: uuid.UUID,
    subject_config_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Download Excel template for bulk mark entry."""
    from fastapi.responses import StreamingResponse
    import io
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    await check_role_plan_permission_with_error(db, request, role, 'exam_marks', 'read')
    # Pass class_id/section_id so the template pre-populates student rows
    resolved_section = section_id if str(section_id) != '00000000-0000-0000-0000-000000000000' else None
    xlsx_bytes = await generate_excel_template(exam_id, subject_config_id, db, class_id=class_id, section_id=resolved_section)
    return StreamingResponse(
        io.BytesIO(xlsx_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=marks_template_{exam_id}.xlsx"},
    )


@router.get("")
async def get_marks_endpoint(
    exam_id: uuid.UUID,
    class_id: uuid.UUID,
    section_id: uuid.UUID,
    subject_config_id: uuid.UUID,
    request: Request,
    page: int = 1,
    page_size: int = 50,
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Return a student-grouped mark grid for the given class/section/subject.
    Includes ALL enrolled students even if no marks have been entered yet.
    """
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    await check_role_plan_permission_with_error(db, request, role, 'exam_marks', 'read')
    teacher_user_id = uuid.UUID(current_user.get('sub') or current_user.get('id'))
    await authorize_mark_entry(db, exam_id, class_id, section_id, subject_config_id, teacher_user_id)
    # section_id may come in as a nil UUID when there is no section
    resolved_section = section_id if str(section_id) != '00000000-0000-0000-0000-000000000000' else None
    return await get_marks_grid(
        db, exam_id, class_id, resolved_section, subject_config_id, page, page_size
    )


@router.post("", response_model=List[MarkEntryRead])
async def save_marks(
    exam_id: uuid.UUID,
    payload: MarkEntryCreate,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Save / update marks for a batch of students (online entry)."""
    from app.service.exam.mark_entry_service import resolve_config_scope
    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    await check_role_plan_permission_with_error(db, request, role, 'exam_marks', 'create')
    teacher_user_id = uuid.UUID(current_user.get('sub') or current_user.get('id'))
    _subject_id, class_id, section_id = await resolve_config_scope(payload.subject_config_id, db)
    await authorize_mark_entry(
        db, exam_id, class_id, section_id, payload.subject_config_id, teacher_user_id,
    )
    await upsert_marks(db, exam_id, payload, uploaded_by=teacher_user_id)
    await db.commit()
    return await get_marks(db, exam_id, subject_config_id=payload.subject_config_id)


@router.post("/upload")
async def upload_marks_excel(
    exam_id: uuid.UUID,
    class_id: uuid.UUID,
    section_id: uuid.UUID,
    subject_config_id: uuid.UUID,
    file: UploadFile = File(...),
    request: Request = None,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Upload marks via Excel file — processes synchronously."""
    from sqlalchemy import select
    from app.models.exam.exam_subject_config_model import ExamSubjectComponent
    from app.schemas.exam.mark_entry_schema import MarkEntryCreate, MarkEntryItem

    current_user = await get_current_user_token(request)
    role = current_user.get('role')
    await check_role_plan_permission_with_error(db, request, role, 'exam_marks', 'create')
    teacher_user_id = uuid.UUID(current_user.get('sub') or current_user.get('id'))

    contents = await file.read()

    # Parse the Excel file
    parse_result = await parse_excel_upload(
        file_bytes=contents,
        exam_id=exam_id,
        subject_config_id=subject_config_id,
        entered_by=teacher_user_id,
        db=db,
    )

    # Get components to resolve header names → component IDs
    comp_result = await db.execute(
        select(ExamSubjectComponent)
        .where(ExamSubjectComponent.subject_config_id == subject_config_id)
    )
    components = comp_result.scalars().all()
    # Map "ComponentName (Max: X)" → component id
    comp_header_map = {
        f"{c.component_name} (Max: {c.max_marks})": c.id
        for c in components
    }

    # Build mark items from parsed rows
    mark_items = []
    errors = list(parse_result.get("errors", []))

    for mark_row in parse_result.get("marks", []):
        try:
            sid = uuid.UUID(str(mark_row["student_id"]))
            for header, raw_val in mark_row.get("row_data", {}).items():
                comp_id = comp_header_map.get(header)
                if comp_id is None:
                    continue
                try:
                    val_str = str(raw_val).strip() if raw_val is not None else ''
                    marks_obtained = float(val_str) if val_str != '' else None
                except (ValueError, TypeError):
                    marks_obtained = None
                if marks_obtained is None:
                    continue  # Skip empty cells — mark not entered
                mark_items.append(MarkEntryItem(
                    student_id=sid,
                    component_id=comp_id,
                    marks_obtained=marks_obtained,
                    is_absent=False,
                ))
        except Exception as e:
            errors.append(f"Student {mark_row.get('student_id')}: {e}")

    if not mark_items:
        return {
            "status": "done",
            "written": 0,
            "errors": errors,
            "total_rows": parse_result.get("total_rows", 0),
        }

    payload = MarkEntryCreate(
        exam_id=exam_id,
        subject_config_id=subject_config_id,
        marks=mark_items,
        attempt_number=1,
    )
    written = await upsert_marks(db, exam_id, payload, uploaded_by=teacher_user_id)
    await db.commit()

    return {
        "status": "done",
        "written": written,
        "errors": errors,
        "total_rows": parse_result.get("total_rows", 0),
    }
