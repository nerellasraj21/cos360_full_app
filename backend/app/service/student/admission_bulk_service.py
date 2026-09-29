import difflib
import logging
from copy import copy
from datetime import date, datetime
from io import BytesIO
from pathlib import Path
from typing import Any
from uuid import UUID

import openpyxl
from fastapi import HTTPException, Request
from openpyxl.utils import get_column_letter
from openpyxl.workbook.defined_name import DefinedName
from openpyxl.worksheet.datavalidation import DataValidation
from pydantic import ValidationError
from sqlalchemy import String, extract, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.masters.academic_year_model import AcademicYear
from app.models.masters.admission_model import Admission
from app.models.masters.caste_model import Caste, SubCaste
from app.models.masters.class_model import Class
from app.models.masters.sections_model import Section
from app.models.masters.student_parent_association_model import StudentParentLink
from app.models.student.student_model import Student
from app.schemas.masters.parent_schema import ParentCreate
from app.schemas.student.admission_schema import StudentAdmissionCreate
from app.schemas.student.student_schema import StudentCreate
from app.service.student.admission_service import add_admission

logger = logging.getLogger(__name__)

SHEET_NAME = "Student Admission"

TEMPLATE_PATH = (
    Path(__file__).resolve().parents[2] / "static" / "templates" / "student_admission_bulk_upload_template.xlsx"
)

REQUIRED_HEADERS = [
    "First name",
    "joining class",
    "Father name",
    "Father phone",
    "Address Line 1",
]

SALARY_BUCKETS = [
    (100_000, "below_1l"),
    (300_000, "1l_3l"),
    (500_000, "3l_5l"),
    (1_000_000, "5l_10l"),
]
SALARY_LITERALS = {"below_1l", "1l_3l", "3l_5l", "5l_10l", "above_10l"}

DATE_FORMATS = ("%d-%m-%Y", "%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y")


def _clean(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _parse_date(value: Any) -> date | None:
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    text = str(value).strip()
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    return None


def _map_salary(value: Any, field_label: str) -> str | None:
    text = _clean(value)
    if not text:
        return None
    if text in SALARY_LITERALS:
        return text
    try:
        amount = float(text.replace(",", ""))
    except ValueError:
        raise _RowError(
            f"Invalid {field_label} '{text}'. Enter a numeric amount or one of: "
            + ", ".join(sorted(SALARY_LITERALS))
        )
    for ceiling, bucket in SALARY_BUCKETS:
        if amount < ceiling:
            return bucket
    return "above_10l"


def _map_yes_no(value: Any) -> bool:
    text = _clean(value)
    return text is not None and text.lower() in {"yes", "y", "true", "1"}


def _map_is_primary(value: Any) -> str:
    # "Student type" column: "Pre Primary" -> primary, "Regular" -> not_primary.
    # Older "Primary"/"Not Primary" labels are still accepted for compatibility.
    text = _clean(value)
    if not text:
        return "not_primary"
    normalized = text.lower().replace("-", " ").replace("_", " ").strip()
    if normalized in {"pre primary", "preprimary", "primary"}:
        return "primary"
    return "not_primary"


class _RowError(Exception):
    pass


def _suggest(name: str, candidates: list[str]) -> str | None:
    matches = difflib.get_close_matches(name, candidates, n=1, cutoff=0.6)
    return matches[0] if matches else None


def _not_found_message(kind: str, name: str, candidates: list[str]) -> str:
    suggestion = _suggest(name, candidates)
    hint = f" — did you mean '{suggestion}'?" if suggestion else ""
    return f"{kind} '{name}' not found{hint}"


async def _get_class_id(
    db: AsyncSession, name: str | None, cache: dict[str, UUID], all_names: list[str]
) -> UUID | None:
    if not name:
        return None
    key = name.lower()
    if key in cache:
        return cache[key]
    result = await db.execute(select(Class).where(func.lower(Class.name) == key))
    cls = result.scalar_one_or_none()
    if not cls:
        raise _RowError(_not_found_message("Class", name, all_names))
    cache[key] = cls.id
    return cls.id


async def _get_section_id(
    db: AsyncSession, name: str | None, cache: dict[str, UUID], all_names: list[str]
) -> UUID | None:
    if not name:
        return None
    key = name.lower()
    if key in cache:
        return cache[key]
    result = await db.execute(select(Section).where(func.lower(Section.name) == key))
    section = result.scalar_one_or_none()
    if not section:
        raise _RowError(_not_found_message("Section", name, all_names))
    cache[key] = section.id
    return section.id


async def _get_active_academic_year_id(db: AsyncSession, cache: dict[str, UUID]) -> UUID:
    if "id" in cache:
        return cache["id"]
    result = await db.execute(select(AcademicYear).where(AcademicYear.is_active.is_(True)))
    year = result.scalars().first()
    if not year:
        raise _RowError("No active academic year configured")
    cache["id"] = year.id
    return year.id


def _build_row_lookup(header_row: list[Any]) -> dict[str, int]:
    lookup: dict[str, int] = {}
    for idx, value in enumerate(header_row):
        if value is None:
            continue
        header = str(value).strip()
        # Strip the format hint appended to the Date of birth column header.
        if header.lower().startswith("date of birth"):
            header = "Date of birth"
        if header:
            lookup[header] = idx
    return lookup


async def parse_and_bulk_create_student_admissions(
    file_bytes: bytes, db: AsyncSession, request: Request | None = None
) -> dict:
    """
    Parse the "Student Admission" sheet of the bulk-upload Excel template and
    create one admission per row via the existing `add_admission` flow, so all
    normal business rules (role lookup, duplicate admission number/email checks,
    mandatory fee auto-mapping, etc.) still apply.

    Returns {"created": [...], "errors": [...], "total_rows": int}
    """
    try:
        wb = openpyxl.load_workbook(BytesIO(file_bytes), data_only=True)
    except Exception as e:
        raise HTTPException(400, detail=f"Invalid Excel file: {str(e)}")

    ws = wb[SHEET_NAME] if SHEET_NAME in wb.sheetnames else wb.active

    header_row = [cell.value for cell in ws[1]]
    col_index = _build_row_lookup(header_row)

    missing = [h for h in REQUIRED_HEADERS if h not in col_index]
    if missing:
        raise HTTPException(400, detail=f"Missing required column(s): {', '.join(missing)}")

    def cell(row: tuple, name: str) -> Any:
        idx = col_index.get(name)
        if idx is None or idx >= len(row):
            return None
        return row[idx]

    class_cache: dict[str, UUID] = {}
    section_cache: dict[str, UUID] = {}
    year_cache: dict[str, UUID] = {}
    all_class_names = [r[0] for r in (await db.execute(select(Class.name))).all()]
    all_section_names = [r[0] for r in (await db.execute(select(Section.name))).all()]

    created: list[dict] = []
    errors: list[str] = []

    for row_idx, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
        if not any(row):
            continue
        try:
            first_name = _clean(cell(row, "First name"))
            if not first_name:
                raise _RowError("First name is required")

            raw_dob = cell(row, "Date of birth")
            date_of_birth = _parse_date(raw_dob)
            if not date_of_birth and _clean(raw_dob):
                raise _RowError(f"Date of birth '{raw_dob}' is not a valid date — use DD-MM-YYYY")

            admitted_class_id = await _get_class_id(
                db, _clean(cell(row, "joining class")), class_cache, all_class_names
            )
            admitted_section_id = await _get_section_id(
                db, _clean(cell(row, "joining section")), section_cache, all_section_names
            )
            if not admitted_class_id:
                raise _RowError("joining class is required")

            current_class_name = _clean(cell(row, "Current class"))
            current_section_name = _clean(cell(row, "Current Section"))
            current_class_id = (
                await _get_class_id(db, current_class_name, class_cache, all_class_names)
                if current_class_name
                else admitted_class_id
            )
            current_section_id = (
                await _get_section_id(db, current_section_name, section_cache, all_section_names)
                if current_section_name
                else admitted_section_id
            )

            academic_year_id = await _get_active_academic_year_id(db, year_cache)

            father_email = _clean(cell(row, "Father Email"))
            father_phone = _clean(cell(row, "Father phone"))
            father_name = _clean(cell(row, "Father name"))
            if not father_name or not father_phone:
                raise _RowError("Father name and Father phone are required")

            mother_email = _clean(cell(row, "Mother Email"))
            mother_name = _clean(cell(row, "Mother Name"))
            mother_phone = _clean(cell(row, "Mother Phone"))

            father = ParentCreate(
                name=father_name,
                email=father_email,
                phone=father_phone,
                occupation=_clean(cell(row, "Father Occupatio")),
                aadhar_number=_clean(cell(row, "Father Aadhar")),
                gender=_clean(cell(row, "Father Gender")) or "Male",
                relation_to_student="Father",
                salary_range=_map_salary(cell(row, "Father Salary"), "Father Salary"),
            )
            mother = ParentCreate(
                name=mother_name,
                email=mother_email,
                phone=mother_phone,
                occupation=_clean(cell(row, "Mother Occupation")),
                aadhar_number=_clean(cell(row, "Mother Aadhar No")),
                gender=_clean(cell(row, "Mother Gender")) or "Female",
                relation_to_student="Mother",
                salary_range=_map_salary(cell(row, "Mother Salary"), "Mother Salary"),
            )

            guardian = None
            guardian_name = _clean(cell(row, "Guardian Name"))
            if guardian_name:
                guardian = ParentCreate(
                    name=guardian_name,
                    email=_clean(cell(row, "Guardian Email")),
                    phone=_clean(cell(row, "Guardian Phone")),
                    occupation=_clean(cell(row, "Guardian Occupation")),
                    aadhar_number=_clean(cell(row, "Guardian Aadhar no")),
                    gender=_clean(cell(row, "Guardian Gender")) or "Other",
                    relation_to_student="Guardian",
                    salary_range=_map_salary(cell(row, "Guardian Salary"), "Guardian Salary"),
                )

            student = StudentCreate(
                first_name=first_name,
                last_name=_clean(cell(row, "last name")) or "",
                date_of_birth=date_of_birth,
                gender=_clean(cell(row, "Gender")),
                is_primary=_map_is_primary(cell(row, "Student type")),
                aadhar_number=_clean(cell(row, "Aadhar No")),
                apaar_number=_clean(cell(row, "Apaar no")),
                caste=_clean(cell(row, "Caste")),
                sub_caste=_clean(cell(row, "Sub caste")),
                community=_clean(cell(row, "Community")),
                nationality=_clean(cell(row, "Nationality")) or "Indian",
                mother_tongue=_clean(cell(row, "Mother Tongue")) or "Telugu",
                identification_marks=_clean(cell(row, "Identification marks")),
                father=father,
                mother=mother,
                guardian=guardian,
            )

            address_line1 = _clean(cell(row, "Address Line 1"))
            if not address_line1:
                raise _RowError("Address Line 1 is required")

            is_previous_school = _map_yes_no(cell(row, "Previous School(Yes/No)"))
            admission = StudentAdmissionCreate(
                admission_date=_parse_date(cell(row, "Admission date")),
                admission_number=_clean(cell(row, "Admission no")),
                academic_year_id=academic_year_id,
                admitted_class_id=admitted_class_id,
                admitted_section_id=admitted_section_id,
                current_class_id=current_class_id,
                current_section_id=current_section_id,
                address_line1=address_line1,
                city="",
                is_previous_school=is_previous_school,
                previous_school_name=_clean(cell(row, "Previous School Name")) if is_previous_school else None,
                previous_class=_clean(cell(row, "Previous Class")) if is_previous_school else None,
                previous_school_remark=_clean(cell(row, "Previous School Remarks")) if is_previous_school else None,
                student=student,
            )

            result = await add_admission(admission, db, request)
            created.append(
                {
                    "row": row_idx,
                    "student_id": str(result.student_id),
                    "admission_number": result.admission_number,
                    "name": f"{first_name} {student.last_name}".strip(),
                }
            )
        except _RowError as e:
            errors.append(f"Row {row_idx}: {str(e)}")
        except ValidationError as e:
            field_errors = "; ".join(
                f"{'.'.join(str(p) for p in err['loc'])}: {err['msg']}" for err in e.errors()
            )
            errors.append(f"Row {row_idx}: {field_errors}")
        except HTTPException as e:
            detail = e.detail
            if isinstance(detail, dict):
                detail = detail.get("message") or detail.get("detail") or str(detail)
            errors.append(f"Row {row_idx}: {detail}")
        except Exception as e:
            logger.error(f"Unexpected error on row {row_idx} of bulk admission upload: {str(e)}")
            errors.append(f"Row {row_idx}: {str(e)}")

    return {"created": created, "errors": errors, "total_rows": len(created) + len(errors)}


def _clear_existing_validation(ws, column: int) -> None:
    """Drop validations already covering `column`.

    Excel applies only one validation per cell, so a dropdown added on top of
    the template's existing length check is silently ignored — the length check
    wins and no list ever appears. Ranges spanning other columns are left alone
    rather than damaging their validation."""
    for dv in list(ws.data_validations.dataValidation):
        owned = [rng for rng in dv.sqref.ranges if rng.min_col == rng.max_col == column]
        if not owned:
            continue
        for rng in owned:
            dv.sqref.remove(rng)
        if not dv.sqref.ranges:
            ws.data_validations.dataValidation.remove(dv)


def _add_dropdown_list(
    ws, col_index: dict[str, int], list_ws, list_col_idx: int, values: list[str], target_headers: list[str]
) -> None:
    """Write `values` into a hidden helper sheet column and wire a list-type
    DataValidation on `target_headers` referencing that column, so the
    dropdown always reflects live master data instead of a fixed guess."""
    if not values:
        return
    for row_idx, value in enumerate(values, start=1):
        list_ws.cell(row=row_idx, column=list_col_idx, value=value)
    list_letter = get_column_letter(list_col_idx)
    dv = DataValidation(
        type="list",
        formula1=f"'{list_ws.title}'!${list_letter}$1:${list_letter}${len(values)}",
        allow_blank=True,
        showErrorMessage=True,
        showInputMessage=True,
        errorStyle="stop",
        errorTitle="Invalid value",
        error="Choose a value from the dropdown list.",
    )
    ws.add_data_validation(dv)
    for header in target_headers:
        idx = col_index.get(header)
        if idx is None:
            continue
        _clear_existing_validation(ws, idx + 1)
        letter = get_column_letter(idx + 1)
        dv.add(f"{letter}2:{letter}1000")


def _sub_caste_range_name(caste_name: str) -> str:
    """Defined-name holding one caste's sub-castes.

    The constant `sub_` prefix keeps the name legal whatever the caste is called
    — Excel rejects names that start with a digit or look like a cell reference.
    Spaces and hyphens become underscores, matching the SUBSTITUTE() calls in
    `_add_cascading_sub_caste_dropdown` so both sides rebuild the same string."""
    return "sub_" + caste_name.strip().replace(" ", "_").replace("-", "_")


def _add_cascading_sub_caste_dropdown(
    wb, ws, col_index: dict[str, int], list_ws, first_col: int, sub_castes_by_caste: dict[str, list[str]]
) -> None:
    """Give "Sub caste" a dropdown that only offers the sub-castes belonging to
    the caste picked in that row, rather than a flat list of every sub-caste.

    Each caste's sub-castes go in their own hidden column exposed as a defined
    name; the validation then resolves that name per row via INDIRECT."""
    caste_idx = col_index.get("Caste")
    sub_idx = col_index.get("Sub caste")
    if caste_idx is None or sub_idx is None or not sub_castes_by_caste:
        return

    for offset, (caste_name, names) in enumerate(sub_castes_by_caste.items()):
        if not names:
            continue
        column = first_col + offset
        for row_idx, value in enumerate(names, start=1):
            list_ws.cell(row=row_idx, column=column, value=value)
        letter = get_column_letter(column)
        wb.defined_names.add(
            DefinedName(
                _sub_caste_range_name(caste_name),
                attr_text=f"'{list_ws.title}'!${letter}$1:${letter}${len(names)}",
            )
        )

    caste_letter = get_column_letter(caste_idx + 1)
    sub_letter = get_column_letter(sub_idx + 1)
    dv = DataValidation(
        type="list",
        # Row-relative reference to the Caste cell, so every row resolves its own
        # caste. Anchored at row 2 because that is where the range starts.
        formula1=f'INDIRECT("sub_"&SUBSTITUTE(SUBSTITUTE(${caste_letter}2," ","_"),"-","_"))',
        allow_blank=True,
        showErrorMessage=True,
        showInputMessage=True,
        errorStyle="stop",
        errorTitle="Invalid sub caste",
        error="Pick a Caste first, then choose one of its sub-castes.",
        promptTitle="Sub caste",
        prompt="Choose the Caste first — this list then shows only that caste's sub-castes.",
    )
    ws.add_data_validation(dv)
    _clear_existing_validation(ws, sub_idx + 1)
    dv.add(f"{sub_letter}2:{sub_letter}1000")


async def _add_master_data_dropdowns(wb, ws, col_index: dict[str, int], db: AsyncSession) -> None:
    """Populate live Class/Section/Caste/Sub caste dropdowns on their columns,
    sourced from this tenant's current master data."""
    class_names = [row[0] for row in (await db.execute(select(Class.name).order_by(Class.name))).all()]
    section_names = [row[0] for row in (await db.execute(select(Section.name).order_by(Section.name))).all()]
    caste_rows = (await db.execute(select(Caste.id, Caste.name).order_by(Caste.name))).all()
    sub_caste_rows = (
        await db.execute(select(SubCaste.caste_id, SubCaste.name).order_by(SubCaste.name))
    ).all()

    caste_names = [row.name for row in caste_rows]
    sub_castes_by_caste: dict[str, list[str]] = {row.name: [] for row in caste_rows}
    names_by_id = {row.id: row.name for row in caste_rows}
    for caste_id, sub_name in sub_caste_rows:
        caste_name = names_by_id.get(caste_id)
        if caste_name:
            sub_castes_by_caste[caste_name].append(sub_name)

    list_ws = wb["Lists"] if "Lists" in wb.sheetnames else wb.create_sheet("Lists")
    list_ws.sheet_state = "hidden"

    _add_dropdown_list(ws, col_index, list_ws, 1, class_names, ["joining class", "Current class"])
    _add_dropdown_list(ws, col_index, list_ws, 2, section_names, ["joining section", "Current Section"])
    _add_dropdown_list(ws, col_index, list_ws, 3, caste_names, ["Caste"])
    # Columns 1-3 are taken above, so each caste's sub-castes start at column 4.
    _add_cascading_sub_caste_dropdown(wb, ws, col_index, list_ws, 4, sub_castes_by_caste)


async def _admission_number_bases(db: AsyncSession) -> tuple[int, int]:
    """Current sequence bases for the two admission-number series, mirroring
    `generate_admission_number`: the pre-primary sequence is scoped to the
    admission year, the regular sequence is global and never resets."""
    year = date.today().year
    pre_count = (
        await db.execute(
            select(func.count(Admission.id)).where(
                extract("year", Admission.admission_date) == year,
                func.cast(Admission.admission_type, String) == "pre_primary",
            )
        )
    ).scalar() or 0
    regular_count = (
        await db.execute(
            select(func.count(Admission.id)).where(
                func.cast(Admission.admission_type, String) == "regular",
            )
        )
    ).scalar() or 0
    return pre_count, regular_count


def _set_input_message(ws, col_index: dict[str, int], header: str, title: str, prompt: str) -> None:
    """Point the hover hint on `header`'s column at a new message. Excel allows
    only one validation per cell, so the template's existing rule for that
    column is updated in place — adding a second one would silently lose it."""
    idx = col_index.get(header)
    if idx is None:
        return
    column = idx + 1
    for dv in ws.data_validations.dataValidation:
        if any(rng.min_col <= column <= rng.max_col for rng in dv.sqref.ranges):
            dv.showInputMessage = True
            dv.promptTitle = title[:32]  # Excel caps the title at 32 chars
            dv.prompt = prompt[:255]  # ...and the body at 255
            return


async def _add_admission_number_suggestion(ws, col_index: dict[str, int], db: AsyncSession) -> None:
    """Show the next admission number for each type in the "Admission no" hover
    hint, using the formats from `generate_admission_number` (Pre Primary ->
    {YEAR}{SEQ:04d}, Regular -> {SEQ:03d}).

    This is a suggestion only — nothing is written into the sheet, so a blank
    "Admission no" still means the server generates it."""
    pre_base, regular_base = await _admission_number_bases(db)
    year = date.today().year

    _set_input_message(
        ws,
        col_index,
        "Admission no",
        "Admission no",
        f"Up to 50 characters. Leave blank to auto-generate. "
        f"Next number — Regular: {regular_base + 1:03d} | "
        f"Pre Primary: {year}{pre_base + 1:04d}.",
    )


async def generate_blank_template(db: AsyncSession) -> bytes:
    """
    Load the blank bulk-upload template with live Class/Section dropdowns
    wired in, so uploaders can only pick class/section names that currently
    exist for this tenant instead of mistyping a name that will fail on upload.
    """
    wb = openpyxl.load_workbook(TEMPLATE_PATH)
    ws = wb[SHEET_NAME] if SHEET_NAME in wb.sheetnames else wb.active

    header_row = [cell.value for cell in ws[1]]
    col_index = _build_row_lookup(header_row)

    await _add_master_data_dropdowns(wb, ws, col_index, db)
    await _add_admission_number_suggestion(ws, col_index, db)

    output = BytesIO()
    wb.save(output)
    return output.getvalue()


async def generate_prefilled_template(db: AsyncSession) -> bytes:
    """
    Load the blank bulk-upload template and fill it with one row per existing
    admission, so an admin can "auto fetch" current data instead of starting
    from a blank sheet (e.g. to review/export, or to re-upload after edits).
    """
    wb = openpyxl.load_workbook(TEMPLATE_PATH)
    ws = wb[SHEET_NAME] if SHEET_NAME in wb.sheetnames else wb.active

    header_row = [cell.value for cell in ws[1]]
    col_index = _build_row_lookup(header_row)

    await _add_master_data_dropdowns(wb, ws, col_index, db)

    class_names = {row.id: row.name for row in (await db.execute(select(Class.id, Class.name))).all()}
    section_names = {row.id: row.name for row in (await db.execute(select(Section.id, Section.name))).all()}

    result = await db.execute(
        select(Admission)
        .options(
            selectinload(Admission.student).selectinload(Student.parent_links).selectinload(StudentParentLink.parent)
        )
        .order_by(Admission.admission_date)
    )
    admissions = result.scalars().all()

    for row_idx, admission in enumerate(admissions, start=2):
        student = admission.student
        father = mother = guardian = None
        if student and student.parent_links:
            for link in student.parent_links:
                relation = (link.parent.relation_to_student or "").lower()
                if relation == "father":
                    father = link.parent
                elif relation == "mother":
                    mother = link.parent
                elif relation == "guardian":
                    guardian = link.parent

        values = {
            "Sno": row_idx - 1,
            "Admission no": admission.admission_number,
            "Admission date": admission.admission_date.strftime("%d-%m-%Y") if admission.admission_date else None,
            "First name": student.first_name if student else None,
            "last name": student.last_name if student else None,
            "joining class": class_names.get(admission.admitted_class_id),
            "joining section": section_names.get(admission.admitted_section_id),
            "Current class": class_names.get(admission.current_class_id),
            "Current Section": section_names.get(admission.current_section_id),
            "Date of birth": student.date_of_birth.strftime("%d-%m-%Y")
            if student and student.date_of_birth
            else None,
            "Gender": student.gender if student else None,
            "Student type": "Pre Primary" if student and student.is_primary == "primary" else "Regular",
            "Nationality": student.nationality if student else None,
            "Mother Tongue": student.mother_tongue if student else None,
            "Apaar no": student.apaar_number if student else None,
            "Aadhar No": student.aadhar_number if student else None,
            "Caste": student.caste if student else None,
            "Sub caste": student.sub_caste if student else None,
            "Community": student.community if student else None,
            "Identification marks": student.identification_marks if student else None,
            "Father name": father.name if father else None,
            "Father Email": father.email if father else None,
            "Father phone": father.phone if father else None,
            "Father Gender": father.gender if father else None,
            "Father Aadhar": father.aadhar_number if father else None,
            "Father Occupatio": father.occupation if father else None,
            "Father Salary": father.salary_range if father else None,
            "Mother Name": mother.name if mother else None,
            "Mother Email": mother.email if mother else None,
            "Mother Phone": mother.phone if mother else None,
            "Mother Gender": mother.gender if mother else None,
            "Mother Occupation": mother.occupation if mother else None,
            "Mother Salary": mother.salary_range if mother else None,
            "Mother Aadhar No": mother.aadhar_number if mother else None,
            "Guardian Name": guardian.name if guardian else None,
            "Guardian Email": guardian.email if guardian else None,
            "Guardian Phone": guardian.phone if guardian else None,
            "Guardian Occupation": guardian.occupation if guardian else None,
            "Guardian Salary": guardian.salary_range if guardian else None,
            "Guardian Aadhar no": guardian.aadhar_number if guardian else None,
            "Guardian Gender": guardian.gender if guardian else None,
            "Address Line 1": admission.address_line1,
            "Previous School(Yes/No)": "Yes" if admission.is_previous_school else "No",
            "Previous School Name": admission.previous_school_name,
            "Previous Class": admission.previous_class,
            "Previous School Remarks": admission.previous_school_remark,
        }

        for header, value in values.items():
            idx = col_index.get(header)
            if idx is not None and value is not None:
                ws.cell(row=row_idx, column=idx + 1, value=value)

    output = BytesIO()
    wb.save(output)
    return output.getvalue()
