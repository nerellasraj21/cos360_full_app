from datetime import date, datetime
import logging
from uuid import UUID

from fastapi import HTTPException, Request
from sqlalchemy import String, and_, delete, extract, func, or_
from sqlalchemy.exc import IntegrityError, OperationalError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.auth.role_model import Role
from app.models.auth.user_model import User
from app.models.exam.student_marks_model import StudentMark
from app.models.exam.student_result_model import StudentExamResult, StudentSubjectResult
from app.models.fee.fee_concession_model import FeeConcession
from app.models.fee.fee_old_model import FeeOld
from app.models.fee.fee_student_map_term_amount_model import FeeStudentMapTermAmount
from app.models.fee.fee_student_mapping_model import FeeStudentMapping
from app.models.fee.fee_transaction_model import FeeTransaction
from app.models.masters.admission_model import Admission
from app.models.masters.attendance_model import StudentAttendance
from app.models.masters.parent_model import Parent
from app.models.masters.student_parent_association_model import StudentParentLink
from app.models.masters.transport.student_trip_model import StudentTrip
from app.models.student.issuable_certificate_model import GeneratedCertificate
from app.models.student.student_certificate_model import CertificateIssue
from app.models.student.student_document_model import StudentDocument
from app.models.student.student_homework_model import StudentHomework
from app.models.student.student_model import Student
from app.models.student.student_transport_model import StudentTransportAssignment
from app.schemas.student.admission_schema import StudentAdmissionCreate, StudentAdmissionUpdate
from app.schemas.student.student_schema import PLACEHOLDER_DATE_OF_BIRTH
from app.tools.database_error_mapper import map_database_error
from app.tools.error_handler import (
    ErrorCategory,
    create_business_rule_error,
    create_database_error,
    create_error_response,
    create_not_found_error,
    create_validation_error,
)
from app.tools.password_util import hash_password


async def _generate_unique_username(base: str, db: AsyncSession) -> str:
    """
    Generate a unique username from a base string.
    Tries: base → base1 → base2 → ...
    base is already lowercased and sanitized by the caller.
    """
    candidate = base
    counter = 1
    while True:
        result = await db.execute(select(User).where(User.username == candidate))
        if result.scalar_one_or_none() is None:
            return candidate
        candidate = f"{base}{counter}"
        counter += 1


# Import user context components
from app.schemas.auth.user_context_schema import UserContext  # noqa: E402
from app.service.base.user_scoped_service import UserScopedService  # noqa: E402

logger = logging.getLogger(__name__)


async def generate_admission_number(db: AsyncSession, admission_date, admission_type: str = "regular") -> str:
    """
    Generate admission number without prefix:
    - Pre-Primary: {YEAR}{SEQUENCE:04d} (e.g., 20260001), sequence resets every year
    - Regular: {SEQUENCE:03d} (e.g., 001), sequence increments globally and never resets
    """
    year = admission_date.year
    is_pre_primary = admission_type == "pre_primary"

    if is_pre_primary:
        # Pre-primary sequence is scoped to the admission year
        count_stmt = select(func.count(Admission.id)).where(
            and_(
                extract("year", Admission.admission_date) == year,
                func.cast(Admission.admission_type, String) == admission_type,
            )
        )
    else:
        # Regular sequence is global (no year prefix, so it must never repeat)
        count_stmt = select(func.count(Admission.id)).where(
            func.cast(Admission.admission_type, String) == admission_type,
        )
    result = await db.execute(count_stmt)
    count = result.scalar() or 0

    # 4-digit sequence for pre_primary, 3-digit for regular
    sequence = count + 1
    admission_number = f"{year}{sequence:04d}" if is_pre_primary else f"{sequence:03d}"

    # Check if admission number already exists (for safety)
    existing_stmt = select(Admission).where(Admission.admission_number == admission_number)
    existing_result = await db.execute(existing_stmt)
    existing = existing_result.scalar_one_or_none()

    if existing:
        while existing:
            sequence += 1
            admission_number = f"{year}{sequence:04d}" if is_pre_primary else f"{sequence:03d}"
            existing_stmt = select(Admission).where(Admission.admission_number == admission_number)
            existing_result = await db.execute(existing_stmt)
            existing = existing_result.scalar_one_or_none()

    return admission_number


async def get_role_by_name(db: AsyncSession, role_name: str) -> UUID:
    """Get role ID by role name"""
    result = await db.execute(select(Role).where(Role.name == role_name))
    role = result.scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=404, detail=f"Role '{role_name}' not found")
    return role.id


async def add_admission(admission: StudentAdmissionCreate, db: AsyncSession, request: Request | None = None):
    """
    Create a new student admission with comprehensive error handling

    Args:
        admission: Admission data including student and parent information
        db: Database session
        request: FastAPI request object for context

    Returns:
        Created admission with all relationships

    Raises:
        HTTPException: For validation, business rule, or database errors
    """
    try:
        # Default admission date to today if the client omitted it
        if admission.admission_date is None:
            admission.admission_date = datetime.now().date()

        # Validate admission date
        if admission.admission_date > datetime.now().date():
            raise create_validation_error(
                message="Admission date cannot be in the future",
                field="admission_date",
                value=str(admission.admission_date),
                request=request,
            )

        # Get role IDs dynamically with error handling
        try:
            student_role_id = await get_role_by_name(db, "Student")
            parent_role_id = await get_role_by_name(db, "Parent")
        except HTTPException as e:
            if e.status_code == 404:
                raise create_business_rule_error(
                    message="Required roles (Student/Parent) not found in system",
                    rule="role_validation",
                    request=request,
                )
            raise

        # Generate admission number
        # Determine admission_type from admission or student.is_primary
        admission_type = admission.admission_type or (
            "pre_primary" if admission.student.is_primary == "primary" else "regular"
        )

        # Admission number can be entered manually (free text, but must be unique
        # since it doubles as the student's login username); if left blank it is
        # auto-generated the same way the "next admission number" preview does.
        manual_number = (admission.admission_number or "").strip()
        if manual_number:
            dup_admission = await db.execute(
                select(Admission).where(Admission.admission_number == manual_number)
            )
            if dup_admission.scalar_one_or_none():
                raise create_business_rule_error(
                    message=f"Admission number '{manual_number}' is already in use",
                    rule="duplicate_admission_number",
                    request=request,
                )
            dup_user = await db.execute(select(User).where(User.username == manual_number))
            if dup_user.scalar_one_or_none():
                raise create_business_rule_error(
                    message=f"Admission number '{manual_number}' is already in use as a login",
                    rule="duplicate_admission_number",
                    request=request,
                )
            admission_number = manual_number
        else:
            admission_number = await generate_admission_number(db, admission.admission_date, admission_type)

        admission_dict = admission.dict(exclude={"student"})
        admission_dict["admission_number"] = admission_number
        admission_dict["admission_type"] = admission_type

        # Validate student data
        if not admission.student.first_name or not admission.student.first_name.strip():
            raise create_validation_error(
                message="Student first name is required", field="student.first_name", request=request
            )

        # Validate parent data
        if not admission.student.father or not admission.student.mother:
            raise create_validation_error(
                message="Both father and mother information are required", field="student.parents", request=request
            )

        # Father/Mother email are optional; when blank, that parent's login
        # username falls back to "{admission_number}.father"/".mother" instead.
        father_email = admission.student.father.email
        mother_email = admission.student.mother.email

        if father_email and mother_email and father_email == mother_email:
            raise create_validation_error(
                message="Father and mother cannot have the same email address",
                field="student.parents.email",
                request=request,
            )

        provided_emails = [e for e in (father_email, mother_email) if e]

        # Check if emails already exist and get existing parent users
        # IMPORTANT: Filter by Parent role to avoid conflicts with other roles
        existing_emails: dict[str, User] = {}
        all_users: list[User] = []
        if provided_emails:
            existing_users_result = await db.execute(
                select(User)
                .options(selectinload(User.role))
                .join(Role)
                .where(and_(User.email.in_(provided_emails), Role.name == "Parent"))
            )
            existing_users = existing_users_result.scalars().all()

            # Create dictionaries for easy lookup
            existing_emails = {user.email: user for user in existing_users}

            # Check if emails exist with non-parent roles (blocked scenario)
            all_users_result = await db.execute(
                select(User).options(selectinload(User.role)).where(User.email.in_(provided_emails))
            )
            all_users = all_users_result.scalars().all()

        # Allow reuse of parent emails, but prevent conflicts with non-parent users
        for email in provided_emails:
            non_parent_users = [u for u in all_users if u.email == email and u.role.name != "Parent"]
            if non_parent_users:
                user = non_parent_users[0]
                raise create_business_rule_error(
                    message=f"Email {email} is already registered to a {user.role.name}, not a parent",
                    rule="email_role_conflict",
                    request=request,
                )

        # Convert student fields, excluding the nested ones
        student_data = admission.student.dict(exclude={"father", "mother", "guardian"})
        # last_name is optional on the admission form; the DB column is NOT NULL,
        # so a missing value is stored as an empty string rather than None.
        student_data["last_name"] = (student_data.get("last_name") or "").strip()

        # Validate student data before creating objects
        try:
            student_dict = Student(**student_data)
        except Exception as e:
            raise create_validation_error(message=f"Invalid student data: {str(e)}", field="student", request=request)

        # Create student user — username: admission_number (guaranteed unique)
        try:
            student_user_data = User(
                username=admission_number,
                password_hash=hash_password("student@123"),
                is_active=True,
                role_id=student_role_id,
            )
        except Exception:
            raise create_error_response(
                error_code=ErrorCategory.SYSTEM_ERROR,
                message="Failed to create student user account",
                status_code=500,
                request=request,
            )

        db.add(student_user_data)
        await db.flush()

        # Mark as first login (student must set a new password on first login)
        try:
            from sqlalchemy import text as _text

            await db.execute(_text("UPDATE users SET is_first_login = TRUE WHERE id = :id"), {"id": str(student_user_data.id)})
        except Exception:
            pass  # column not yet added — apply script adds it

        student_dict.user_id = student_user_data.id
        db.add(student_dict)
        await db.flush()

        # Handle father - reuse existing user if email exists, create new if not
        try:
            if father_email in existing_emails:
                father_user_data = existing_emails[father_email]
                # Get existing parent record
                logger.info(f"Reusing existing father with user_id: {father_user_data.id}, email: {father_email}")
                existing_father_result = await db.execute(select(Parent).where(Parent.user_id == father_user_data.id))
                father_dict = existing_father_result.scalar_one_or_none()

                if not father_dict:
                    logger.error(f"No parent record found for existing father user_id: {father_user_data.id}")
                    raise create_not_found_error(
                        message=f"Parent record not found for existing father user {father_email}",
                        resource_type="parent",
                        resource_id=str(father_user_data.id),
                        request=request,
                    )

                # Update existing parent data with new information
                logger.info(f"Updating existing father data for parent_id: {father_dict.id}")
                father_data = admission.student.father.dict()
                for field, value in father_data.items():
                    # Don't update email (it's the lookup key) or relation_to_student
                    if field not in ["email"] and hasattr(father_dict, field):
                        old_value = getattr(father_dict, field)
                        if old_value != value:
                            logger.info(f"Updating father.{field}: '{old_value}' -> '{value}'")
                            setattr(father_dict, field, value)
                await db.flush()
            else:
                # Create new father user and parent
                try:
                    father_dict = Parent(**admission.student.father.dict())
                except Exception as e:
                    raise create_validation_error(
                        message=f"Invalid father data: {str(e)}", field="student.father", request=request
                    )

                father_user_data = User(
                    username=father_dict.email or f"{admission_number}.father",
                    email=father_dict.email,
                    password_hash=hash_password("parent@123"),
                    is_active=True,
                    role_id=parent_role_id,
                )
                db.add(father_user_data)
                await db.flush()

                # Mark as first login (parent must set a new password on first login)
                try:
                    from sqlalchemy import text as _text

                    await db.execute(_text("UPDATE users SET is_first_login = TRUE WHERE id = :id"), {"id": str(father_user_data.id)})
                except Exception:
                    pass

                father_dict.user_id = father_user_data.id
                db.add(father_dict)
                await db.flush()
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error handling father data: {str(e)}")
            raise create_error_response(
                error_code=ErrorCategory.SYSTEM_ERROR,
                message="Failed to process father information",
                status_code=500,
                request=request,
            )

        # Handle mother - reuse existing user if email exists, create new if not
        try:
            if mother_email in existing_emails:
                mother_user_data = existing_emails[mother_email]
                # Get existing parent record
                logger.info(f"Reusing existing mother with user_id: {mother_user_data.id}, email: {mother_email}")
                existing_mother_result = await db.execute(select(Parent).where(Parent.user_id == mother_user_data.id))
                mother_dict = existing_mother_result.scalar_one_or_none()

                if not mother_dict:
                    logger.error(f"No parent record found for existing mother user_id: {mother_user_data.id}")
                    raise create_not_found_error(
                        message=f"Parent record not found for existing mother user {mother_email}",
                        resource_type="parent",
                        resource_id=str(mother_user_data.id),
                        request=request,
                    )

                # Update existing parent data with new information
                logger.info(f"Updating existing mother data for parent_id: {mother_dict.id}")
                mother_data = admission.student.mother.dict()
                if mother_data.get("name") is None:
                    mother_data["name"] = ""
                for field, value in mother_data.items():
                    # Don't update email (it's the lookup key) or relation_to_student
                    if field not in ["email"] and hasattr(mother_dict, field):
                        old_value = getattr(mother_dict, field)
                        if old_value != value:
                            logger.info(f"Updating mother.{field}: '{old_value}' -> '{value}'")
                            setattr(mother_dict, field, value)
                await db.flush()
            else:
                # Create new mother user and parent
                try:
                    mother_create_data = admission.student.mother.dict()
                    if mother_create_data.get("name") is None:
                        mother_create_data["name"] = ""
                    mother_dict = Parent(**mother_create_data)
                except Exception as e:
                    raise create_validation_error(
                        message=f"Invalid mother data: {str(e)}", field="student.mother", request=request
                    )

                mother_user_data = User(
                    username=mother_dict.email or f"{admission_number}.mother",
                    email=mother_dict.email,
                    password_hash=hash_password("parent@123"),
                    is_active=True,
                    role_id=parent_role_id,
                )
                db.add(mother_user_data)
                await db.flush()

                # Mark as first login (parent must set a new password on first login)
                try:
                    from sqlalchemy import text as _text

                    await db.execute(_text("UPDATE users SET is_first_login = TRUE WHERE id = :id"), {"id": str(mother_user_data.id)})
                except Exception:
                    pass

                mother_dict.user_id = mother_user_data.id
                db.add(mother_dict)
                await db.flush()
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error handling mother data: {str(e)}")
            raise create_error_response(
                error_code=ErrorCategory.SYSTEM_ERROR,
                message="Failed to process mother information",
                status_code=500,
                request=request,
            )

        # Handle guardian (optional) - reuse existing user if email exists, create new if not
        guardian_dict = None
        if admission.student.guardian:
            guardian_email = admission.student.guardian.email
            try:
                if guardian_email and guardian_email.strip():
                    # Check if guardian email already exists
                    existing_guardian_result = await db.execute(
                        select(User)
                        .options(selectinload(User.role))
                        .join(Role)
                        .where(and_(User.email == guardian_email, Role.name == "Parent"))
                    )
                    existing_guardian_user = existing_guardian_result.scalar_one_or_none()

                    if existing_guardian_user:
                        # Reuse existing guardian user
                        guardian_user_data = existing_guardian_user
                        logger.info(f"Reusing existing guardian with user_id: {guardian_user_data.id}, email: {guardian_email}")
                        existing_guardian_parent_result = await db.execute(
                            select(Parent).where(Parent.user_id == guardian_user_data.id)
                        )
                        guardian_dict = existing_guardian_parent_result.scalar_one_or_none()

                        if not guardian_dict:
                            logger.error(f"No parent record found for existing guardian user_id: {guardian_user_data.id}")
                            raise create_not_found_error(
                                message=f"Parent record not found for existing guardian user {guardian_email}",
                                resource_type="parent",
                                resource_id=str(guardian_user_data.id),
                                request=request,
                            )

                        # Update existing guardian data
                        logger.info(f"Updating existing guardian data for parent_id: {guardian_dict.id}")
                        guardian_data = admission.student.guardian.dict()
                        if guardian_data.get("name") is None:
                            guardian_data["name"] = ""
                        for field, value in guardian_data.items():
                            if field not in ["email"] and hasattr(guardian_dict, field):
                                old_value = getattr(guardian_dict, field)
                                if old_value != value:
                                    logger.info(f"Updating guardian.{field}: '{old_value}' -> '{value}'")
                                    setattr(guardian_dict, field, value)
                        await db.flush()
                    else:
                        # Create new guardian user and parent
                        try:
                            guardian_create_data = admission.student.guardian.dict()
                            if guardian_create_data.get("name") is None:
                                guardian_create_data["name"] = ""
                            guardian_dict = Parent(**guardian_create_data)
                        except Exception as e:
                            raise create_validation_error(
                                message=f"Invalid guardian data: {str(e)}", field="student.guardian", request=request
                            )

                        guardian_user_data = User(
                            username=guardian_dict.email,
                            email=guardian_dict.email,
                            password_hash=hash_password("parent@123"),
                            is_active=True,
                            role_id=parent_role_id,
                        )
                        db.add(guardian_user_data)
                        await db.flush()

                        # Mark as first login
                        try:
                            from sqlalchemy import text as _text

                            await db.execute(_text("UPDATE users SET is_first_login = TRUE WHERE id = :id"), {"id": str(guardian_user_data.id)})
                        except Exception:
                            pass

                        guardian_dict.user_id = guardian_user_data.id
                        db.add(guardian_dict)
                        await db.flush()
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Error handling guardian data: {str(e)}")
                raise create_error_response(
                    error_code=ErrorCategory.SYSTEM_ERROR,
                    message="Failed to process guardian information",
                    status_code=500,
                    request=request,
                )

        # Check if father-student link already exists
        try:
            existing_father_link_result = await db.execute(
                select(StudentParentLink).where(
                    and_(StudentParentLink.student_id == student_dict.id, StudentParentLink.parent_id == father_dict.id)
                )
            )
            existing_father_links = existing_father_link_result.scalars().all()
            if len(existing_father_links) == 0:
                student_parent_link_father = StudentParentLink(student_id=student_dict.id, parent_id=father_dict.id)
                db.add(student_parent_link_father)
                await db.flush()
        except Exception as e:
            logger.error(f"Error creating father-student link: {str(e)}")
            raise create_error_response(
                error_code=ErrorCategory.SYSTEM_ERROR,
                message="Failed to create father-student relationship",
                status_code=500,
                request=request,
            )

        # Check if mother-student link already exists
        try:
            existing_mother_link_result = await db.execute(
                select(StudentParentLink).where(
                    and_(StudentParentLink.student_id == student_dict.id, StudentParentLink.parent_id == mother_dict.id)
                )
            )
            existing_mother_links = existing_mother_link_result.scalars().all()
            if len(existing_mother_links) == 0:
                student_parent_link_mother = StudentParentLink(student_id=student_dict.id, parent_id=mother_dict.id)
                db.add(student_parent_link_mother)
                await db.flush()
        except Exception as e:
            logger.error(f"Error creating mother-student link: {str(e)}")
            raise create_error_response(
                error_code=ErrorCategory.SYSTEM_ERROR,
                message="Failed to create mother-student relationship",
                status_code=500,
                request=request,
            )

        # Check if guardian-student link already exists (if guardian provided)
        if guardian_dict:
            try:
                existing_guardian_link_result = await db.execute(
                    select(StudentParentLink).where(
                        and_(StudentParentLink.student_id == student_dict.id, StudentParentLink.parent_id == guardian_dict.id)
                    )
                )
                existing_guardian_links = existing_guardian_link_result.scalars().all()
                if len(existing_guardian_links) == 0:
                    student_parent_link_guardian = StudentParentLink(student_id=student_dict.id, parent_id=guardian_dict.id)
                    db.add(student_parent_link_guardian)
                    await db.flush()
            except Exception as e:
                logger.error(f"Error creating guardian-student link: {str(e)}")
                raise create_error_response(
                    error_code=ErrorCategory.SYSTEM_ERROR,
                    message="Failed to create guardian-student relationship",
                    status_code=500,
                    request=request,
                )

        # Create admission record
        try:
            new_admission = Admission(student_id=student_dict.id, **admission_dict)
            db.add(new_admission)
            await db.flush()
        except Exception as e:
            logger.error(f"Error creating admission record: {str(e)}")
            raise create_error_response(
                error_code=ErrorCategory.SYSTEM_ERROR,
                message="Failed to create admission record",
                status_code=500,
                request=request,
            )

        # Auto-apply any mandatory (all_by_default) class fees to the newly admitted student.
        # A failure here must never block admission, so it is logged and swallowed.
        try:
            from app.service.fee.fee_class_mapping_service import auto_apply_mandatory_fees_to_admission

            await auto_apply_mandatory_fees_to_admission(db, new_admission)
        except Exception as e:
            logger.error(f"Error auto-applying mandatory fees to admission {new_admission.id}: {str(e)}")

        # Fetch the created admission with all relationships before commit
        try:
            logger.info(f"Fetching created admission with id: {new_admission.id}")
            result = await db.execute(
                select(Admission)
                .options(
                    selectinload(Admission.student)
                    .selectinload(Student.parent_links)
                    .selectinload(StudentParentLink.parent)
                )
                .where(Admission.id == new_admission.id)
            )
            admission_out = result.scalar_one_or_none()

            if not admission_out:
                logger.error(f"Failed to fetch created admission with id: {new_admission.id}")
                raise create_error_response(
                    error_code=ErrorCategory.SYSTEM_ERROR,
                    message="Failed to retrieve created admission record",
                    status_code=500,
                    request=request,
                )

            await db.commit()

            # Admission confirmation SMS is NOT sent automatically. It is sent on
            # demand via POST /students/admission/send-confirmation (MANUAL #1),
            # so a notification failure can never fail an admission.

            return admission_out

        except HTTPException:
            await db.rollback()
            raise
        except Exception as e:
            await db.rollback()
            logger.error(f"Error fetching admission after creation: {str(e)}")
            raise create_error_response(
                error_code=ErrorCategory.SYSTEM_ERROR,
                message="Failed to retrieve created admission record",
                status_code=500,
                request=request,
            )

    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        import traceback

        logger.error(f"Unexpected error in add_admission: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")

        # Handle database-specific errors
        if "constraint" in str(e).lower() or "duplicate" in str(e).lower():
            error_code, message, details = map_database_error(e)
            raise create_database_error(message=message, constraint=details.get("constraint"), request=request)

        # Generic system error
        raise create_error_response(
            error_code=ErrorCategory.SYSTEM_ERROR,
            message="Failed to create admission",
            status_code=500,
            request=request,
        )


async def get_admission_by_id(student_id: UUID, db: AsyncSession, request: Request | None = None):
    """
    Get admission by student ID with comprehensive error handling

    Args:
        student_id: Student ID
        db: Database session
        request: FastAPI request object for context

    Returns:
        Admission record with relationships

    Raises:
        HTTPException: For not found or database errors
    """
    try:
        result = await db.execute(
            select(Admission)
            .options(
                selectinload(Admission.student)
                .selectinload(Student.parent_links)
                .selectinload(StudentParentLink.parent)
            )
            .where(Admission.student_id == student_id)
        )
        admission = result.scalar_one_or_none()

        if not admission:
            raise create_not_found_error(
                message="Admission not found", resource_type="admission", resource_id=str(student_id), request=request
            )

        # Process father/mother relationships
        if admission.student and admission.student.parent_links:
            father = None
            mother = None

            for link in admission.student.parent_links:
                if link.parent and link.parent.relation_to_student:
                    relation = link.parent.relation_to_student.lower()
                    if relation == "father":
                        father = link.parent
                        # Remove student_links attribute to prevent circular reference
                        if hasattr(father, "student_links"):
                            delattr(father, "student_links")
                    elif relation == "mother":
                        mother = link.parent
                        # Remove student_links attribute to prevent circular reference
                        if hasattr(mother, "student_links"):
                            delattr(mother, "student_links")
                    elif relation == "guardian":
                        guardian = link.parent
                        # Remove student_links attribute to prevent circular reference
                        if hasattr(guardian, "student_links"):
                            delattr(guardian, "student_links")

            # Set father, mother, and guardian attributes on student
            admission.student.father = father
            admission.student.mother = mother
            admission.student.guardian = guardian
        else:
            # Set default None values if no parents
            if admission.student:
                admission.student.father = None
                admission.student.mother = None
                admission.student.guardian = None

        return admission

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching admission for student {student_id}: {str(e)}")
        raise create_error_response(
            error_code=ErrorCategory.SYSTEM_ERROR,
            message="Failed to fetch admission record",
            status_code=500,
            request=request,
        )


async def get_admission_by_id_with_context(
    student_id: UUID, db: AsyncSession, user_context: UserContext, request: Request | None = None
):
    """
    Get admission by student ID with user-specific access validation

    Args:
        student_id: Student ID
        db: Database session
        user_context: User context with access scope
        request: FastAPI request object for context

    Returns:
        Admission record with relationships if user has access

    Raises:
        HTTPException: For access denied, not found, or database errors
    """
    try:
        # Initialize user-scoped service for access validation
        UserScopedService(db)

        # Pre-validate access to specific student for "own" and "related" scopes
        if user_context.access_scope == "own":
            if user_context.student_id != student_id:
                raise create_not_found_error(
                    message="Student admission not found",
                    resource_type="admission",
                    resource_id=str(student_id),
                    request=request,
                )
        elif user_context.access_scope == "related":
            if student_id not in (user_context.allowed_entity_ids or []):
                raise create_not_found_error(
                    message="Student admission not found",
                    resource_type="admission",
                    resource_id=str(student_id),
                    request=request,
                )

        # Query admission with relationships
        result = await db.execute(
            select(Admission)
            .options(
                selectinload(Admission.student)
                .selectinload(Student.parent_links)
                .selectinload(StudentParentLink.parent)
            )
            .where(Admission.student_id == student_id)
        )
        admission = result.scalar_one_or_none()

        if not admission:
            raise create_not_found_error(
                message="Student admission not found",
                resource_type="admission",
                resource_id=str(student_id),
                request=request,
            )

        # Process father/mother/guardian relationships from parent_links
        # This extracts parents from the StudentParentLink junction table based on relation_to_student
        # and assigns them to student properties for easy access in API responses.
        #
        # Parents are stored in a single 'parents' table with a relation_to_student field that
        # identifies whether each record is a Father, Mother, or Guardian.
        #
        # Implementation Note: These properties are set on the SQLAlchemy model instance
        # for convenient serialization via StudentOut schema. The StudentOut.extract_father_mother_guardian
        # model_validator ensures these properties are properly extracted when converting ORM to Pydantic.
        if admission.student and admission.student.parent_links:
            father = None
            mother = None
            guardian = None

            for link in admission.student.parent_links:
                if link.parent and link.parent.relation_to_student:
                    relation = link.parent.relation_to_student.lower()
                    if relation == "father":
                        father = link.parent
                    elif relation == "mother":
                        mother = link.parent
                    elif relation == "guardian":
                        guardian = link.parent

            admission.student.father = father
            admission.student.mother = mother
            admission.student.guardian = guardian
        else:
            if admission.student:
                admission.student.father = None
                admission.student.mother = None
                admission.student.guardian = None

        logger.info(
            f"User {user_context.username} accessed admission for student {student_id} (scope: {user_context.access_scope})"
        )
        return admission

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching admission for student {student_id}: {str(e)}")
        raise create_error_response(
            error_code=ErrorCategory.SYSTEM_ERROR,
            message="Failed to fetch admission record",
            status_code=500,
            request=request,
        )


async def search_students_with_context(
    query: str, db: AsyncSession, user_context: UserContext, request: Request | None = None
):
    """
    Search students with user-specific filtering applied

    Args:
        query: Search query string
        db: Database session
        user_context: User context with access scope
        request: FastAPI request object for context

    Returns:
        List of students that match query and user access scope
    """
    try:
        # Initialize user-scoped service
        scoped_service = UserScopedService(db)

        # Base search query
        base_stmt = select(Student).where(
            or_(
                Student.first_name.ilike(f"%{query}%"),
                Student.last_name.ilike(f"%{query}%"),
                func.concat(Student.first_name, " ", Student.last_name).ilike(f"%{query}%"),
            )
        )

        # Apply user scoping
        filtered_stmt = await scoped_service.get_user_scoped_query(base_stmt, user_context, Student, "list")

        # Limit search results and order
        stmt = filtered_stmt.limit(10).order_by(Student.first_name, Student.last_name)

        result = await db.execute(stmt)
        students = result.scalars().all()

        logger.info(
            f"User {user_context.username} searched '{query}' and found {len(students)} students (scope: {user_context.access_scope})"
        )

        return [
            {
                "id": str(student.id),
                "name": f"{student.first_name} {student.last_name}",
                "first_name": student.first_name,
                "last_name": student.last_name,
            }
            for student in students
        ]

    except Exception as e:
        logger.error(f"Error searching students with query '{query}': {str(e)}")
        raise create_error_response(
            error_code=ErrorCategory.SYSTEM_ERROR, message="Failed to search students", status_code=500, request=request
        )


async def update_partial_details_admission(
    student_id: UUID, data: StudentAdmissionUpdate, db: AsyncSession, request: Request | None = None
):
    """
    Update admission details for a student with comprehensive error handling

    Args:
        student_id: Student ID
        data: Update data
        db: Database session
        request: FastAPI request object for context

    Returns:
        Updated admission record

    Raises:
        HTTPException: For not found, validation, or database errors
    """
    # Separate field groups
    STUDENT_FIELDS = {"first_name", "last_name", "date_of_birth", "gender", "is_primary", "aadhar_number", "apaar_number", "nationality", "mother_tongue", "caste", "caste_id", "sub_caste", "sub_caste_id", "community", "identification_marks", "primary_phone"}
    FATHER_FIELDS = {"father_name", "father_email", "father_phone", "father_occupation", "father_aadhar_number", "father_gender", "father_salary_range"}
    MOTHER_FIELDS = {"mother_name", "mother_email", "mother_phone", "mother_occupation", "mother_aadhar_number", "mother_gender", "mother_salary_range"}
    GUARDIAN_FIELDS = {"guardian_name", "guardian_email", "guardian_phone", "guardian_occupation", "guardian_aadhar_number", "guardian_gender", "guardian_salary_range"}

    try:
        # Fetch with eager loading so we can update student + parent in same transaction
        result = await db.execute(
            select(Admission)
            .options(
                selectinload(Admission.student)
                .selectinload(Student.parent_links)
                .selectinload(StudentParentLink.parent)
            )
            .where(Admission.student_id == student_id)
        )
        admission = result.scalar_one_or_none()

        if not admission:
            raise create_not_found_error(
                message="Admission not found", resource_type="admission", resource_id=str(student_id), request=request
            )

        # Validate update data
        update_data = data.dict(exclude_unset=True)

        # Validate admission date if being updated
        if "admission_date" in update_data:
            if update_data["admission_date"] is None:
                raise create_validation_error(
                    message="Admission date is required", field="admission_date", request=request
                )
            if update_data["admission_date"] > datetime.now().date():
                raise create_validation_error(
                    message="Admission date cannot be in the future",
                    field="admission_date",
                    value=str(update_data["admission_date"]),
                    request=request,
                )

        # Validate a manually-changed admission number for uniqueness.
        # Note: the student's login username is NOT changed here — it keeps the
        # value assigned at admission time.
        if "admission_number" in update_data:
            new_number = (update_data["admission_number"] or "").strip()
            if not new_number:
                # Don't allow clearing the number to empty/blank.
                update_data.pop("admission_number")
            elif new_number != admission.admission_number:
                dup = await db.execute(
                    select(Admission).where(
                        and_(
                            Admission.admission_number == new_number,
                            Admission.id != admission.id,
                        )
                    )
                )
                if dup.scalar_one_or_none():
                    raise create_business_rule_error(
                        message=f"Admission number '{new_number}' is already in use",
                        rule="duplicate_admission_number",
                        request=request,
                    )
                update_data["admission_number"] = new_number

        # Reject clearing mandatory student fields (same rules as admission creation)
        if "first_name" in update_data and not (update_data["first_name"] or "").strip():
            raise create_validation_error(
                message="Student first name is required", field="first_name", request=request
            )

        # Date of birth is optional (same as admission creation): a blank value
        # falls back to the same placeholder instead of being rejected, since
        # students.date_of_birth is NOT NULL in the database.
        if "date_of_birth" in update_data and not update_data["date_of_birth"]:
            update_data["date_of_birth"] = PLACEHOLDER_DATE_OF_BIRTH

        # Father/Mother email are optional (same rules as admission creation);
        # Parent.email is nullable, so clearing them is safe.

        # Reject clearing mandatory father fields (same rules as admission creation,
        # where father.name and father.phone are required by StudentCreate)
        if "father_name" in update_data and not (update_data["father_name"] or "").strip():
            raise create_validation_error(
                message="Father name is required", field="father_name", request=request
            )

        if "father_phone" in update_data and not (update_data["father_phone"] or "").strip():
            raise create_validation_error(
                message="Father phone is required", field="father_phone", request=request
            )

        # Reject clearing mandatory admission references (required on creation, so a
        # PATCH may change them but never null them)
        for required_ref, ref_label in (
            ("academic_year_id", "Academic year"),
            ("admitted_class_id", "Admitted class"),
        ):
            if required_ref in update_data and update_data[required_ref] is None:
                raise create_validation_error(
                    message=f"{ref_label} is required", field=required_ref, request=request
                )

        new_father_email = update_data.get("father_email")
        new_mother_email = update_data.get("mother_email")
        if new_father_email or new_mother_email:
            current_father_email = next(
                (
                    link.parent.email
                    for link in admission.student.parent_links
                    if (link.parent.relation_to_student or "").lower() == "father"
                ),
                None,
            )
            current_mother_email = next(
                (
                    link.parent.email
                    for link in admission.student.parent_links
                    if (link.parent.relation_to_student or "").lower() == "mother"
                ),
                None,
            )
            effective_father_email = new_father_email or current_father_email
            effective_mother_email = new_mother_email or current_mother_email
            if effective_father_email and effective_father_email == effective_mother_email:
                raise create_validation_error(
                    message="Father and mother cannot have the same email address",
                    field="father_email",
                    request=request,
                )

        # Update admission-level fields
        for field, value in update_data.items():
            if hasattr(admission, field):
                setattr(admission, field, value)

        # Update student personal fields
        student = admission.student
        for field in STUDENT_FIELDS:
            if field in update_data:
                setattr(student, field, update_data[field])

        # Update parent fields via parent_links
        for link in student.parent_links:
            parent = link.parent
            relation = (parent.relation_to_student or "").lower()
            if relation == "father":
                for key in FATHER_FIELDS:
                    if key in update_data:
                        parent_field = key[len("father_"):]  # strip "father_" prefix
                        setattr(parent, parent_field, update_data[key])
            elif relation == "mother":
                for key in MOTHER_FIELDS:
                    if key in update_data:
                        parent_field = key[len("mother_"):]  # strip "mother_" prefix
                        setattr(parent, parent_field, update_data[key])
            elif relation == "guardian":
                for key in GUARDIAN_FIELDS:
                    if key in update_data:
                        parent_field = key[len("guardian_"):]  # strip "guardian_" prefix
                        setattr(parent, parent_field, update_data[key])

        await db.flush()

        # Refresh admission object with all relationships before commit
        result = await db.execute(
            select(Admission)
            .options(
                selectinload(Admission.student)
                .selectinload(Student.parent_links)
                .selectinload(StudentParentLink.parent)
            )
            .where(Admission.id == admission.id)
        )
        admission_out = result.scalar_one()

        await db.commit()
        return admission_out

    except HTTPException:
        await db.rollback()
        raise
    except IntegrityError as e:
        await db.rollback()
        logger.error(f"Integrity error updating admission {student_id}: {str(e)}")
        error_code, message, details = map_database_error(e)
        raise create_database_error(message=message, constraint=details.get("constraint"), request=request)
    except OperationalError as e:
        await db.rollback()
        logger.error(f"Operational error updating admission {student_id}: {str(e)}")
        raise create_error_response(
            error_code=ErrorCategory.SYSTEM_ERROR,
            message="Database operation failed - please try again",
            status_code=503,
            request=request,
        )
    except Exception as e:
        await db.rollback()
        logger.error(f"Unexpected error updating admission {student_id}: {str(e)}")
        raise create_error_response(
            error_code=ErrorCategory.SYSTEM_ERROR,
            message="Failed to update admission",
            status_code=500,
            request=request,
        )


async def get_student_by_admission_id(admission_id: UUID, db: AsyncSession, request: Request | None = None):
    """
    Get student by admission ID with comprehensive error handling

    Args:
        admission_id: Admission ID
        db: Database session
        request: FastAPI request object for context

    Returns:
        Student record

    Raises:
        HTTPException: For not found or database errors
    """
    try:
        stmt = select(Admission).where(Admission.id == admission_id).options(selectinload(Admission.student))
        result = await db.execute(stmt)
        admission = result.scalars().first()

        if not admission:
            raise create_not_found_error(
                message="Admission ID not found",
                resource_type="admission",
                resource_id=str(admission_id),
                request=request,
            )

        return admission.student

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching student by admission ID {admission_id}: {str(e)}")
        raise create_error_response(
            error_code=ErrorCategory.SYSTEM_ERROR,
            message="Failed to fetch student record",
            status_code=500,
            request=request,
        )


async def search_students(query: str, db: AsyncSession, request: Request | None = None):
    """
    Search students with comprehensive error handling

    Args:
        query: Search query
        db: Database session
        request: FastAPI request object for context

    Returns:
        List of matching students

    Raises:
        HTTPException: For database errors
    """
    try:
        if not query or not query.strip():
            raise create_validation_error(message="Search query cannot be empty", field="query", request=request)

        stmt = (
            select(Student)
            .join(Admission, Student.id == Admission.student_id)
            .where(
                or_(
                    Admission.id.cast(String).ilike(f"%{query}%"),
                    Student.first_name.ilike(f"%{query}%"),
                    Student.last_name.ilike(f"%{query}%"),
                )
            )
        )
        result = await db.execute(stmt)
        return result.scalars().all()

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error searching students with query '{query}': {str(e)}")
        raise create_error_response(
            error_code=ErrorCategory.SYSTEM_ERROR, message="Failed to search students", status_code=500, request=request
        )


async def get_all_admissions(db: AsyncSession, skip: int = 0, limit: int = 10):
    """Get all admissions with pagination (legacy function - use get_all_admissions_with_context for user filtering)"""
    # Count total records
    count_stmt = select(func.count(Admission.id))
    count_result = await db.execute(count_stmt)
    total_count = count_result.scalar()

    # Get paginated admissions
    stmt = (
        select(Admission)
        .options(
            selectinload(Admission.student).selectinload(Student.parent_links).selectinload(StudentParentLink.parent)
        )
        .offset(skip)
        .limit(limit)
        .order_by(Admission.admission_date.desc())
    )

    result = await db.execute(stmt)
    admissions = result.scalars().all()

    # Process father/mother relationships for each admission
    for admission in admissions:
        if admission.student and admission.student.parent_links:
            father = None
            mother = None
            guardian = None

            for link in admission.student.parent_links:
                if link.parent and link.parent.relation_to_student:
                    relation = link.parent.relation_to_student.lower()
                    if relation == "father":
                        father = link.parent
                        # Remove student_links attribute to prevent circular reference
                        if hasattr(father, "student_links"):
                            delattr(father, "student_links")
                    elif relation == "mother":
                        mother = link.parent
                        # Remove student_links attribute to prevent circular reference
                        if hasattr(mother, "student_links"):
                            delattr(mother, "student_links")
                    elif relation == "guardian":
                        guardian = link.parent
                        # Remove student_links attribute to prevent circular reference
                        if hasattr(guardian, "student_links"):
                            delattr(guardian, "student_links")

            # Set father, mother, and guardian attributes on student
            admission.student.father = father
            admission.student.mother = mother
            admission.student.guardian = guardian
        else:
            # Set default None values if no parents
            if admission.student:
                admission.student.father = None
                admission.student.mother = None
                admission.student.guardian = None

    has_next = (skip + limit) < total_count

    return {"items": admissions, "total_count": total_count, "has_next": has_next}


async def get_all_admissions_with_context(
    db: AsyncSession,
    user_context: UserContext,
    skip: int = 0,
    limit: int = 10,
    class_id: UUID | None = None,
    section_id: UUID | None = None,
    as_of_date: date | None = None,
    active_only: bool = False,
):
    """
    Get admissions with user-specific filtering applied

    Args:
        db: Database session
        user_context: User context with access scope
        skip: Number of records to skip (pagination)
        limit: Number of records to return
        class_id: Optional filter by class ID
        section_id: Optional filter by section ID
        as_of_date: Optional filter excluding students whose admission_date is after this date
            (e.g. for building an attendance roster for a past date)
        active_only: When true, exclude students whose user account is inactive

    Returns:
        Dict with filtered admissions, count, and pagination info
    """

    # Initialize user-scoped service
    scoped_service = UserScopedService(db)

    # Count total records with user filtering
    count_stmt = select(func.count(Admission.id))

    # Apply user scoping to count query
    filtered_count_stmt = await scoped_service.get_user_scoped_query(count_stmt, user_context, Admission, "list")

    if class_id:
        filtered_count_stmt = filtered_count_stmt.where(Admission.current_class_id == class_id)
    if section_id:
        filtered_count_stmt = filtered_count_stmt.where(Admission.current_section_id == section_id)
    if as_of_date:
        filtered_count_stmt = filtered_count_stmt.where(Admission.admission_date <= as_of_date)
    if active_only:
        filtered_count_stmt = filtered_count_stmt.where(Admission.student.has(Student.user.has(is_active=True)))

    count_result = await db.execute(filtered_count_stmt)
    total_count = count_result.scalar() or 0

    # Base query with relationships
    base_stmt = select(Admission).options(
        selectinload(Admission.student).selectinload(Student.parent_links).selectinload(StudentParentLink.parent),
        selectinload(Admission.student).selectinload(Student.user),
    )

    # Apply user scoping to main query
    filtered_stmt = await scoped_service.get_user_scoped_query(base_stmt, user_context, Admission, "list")

    if class_id:
        filtered_stmt = filtered_stmt.where(Admission.current_class_id == class_id)
    if section_id:
        filtered_stmt = filtered_stmt.where(Admission.current_section_id == section_id)
    if as_of_date:
        filtered_stmt = filtered_stmt.where(Admission.admission_date <= as_of_date)
    if active_only:
        filtered_stmt = filtered_stmt.where(Admission.student.has(Student.user.has(is_active=True)))

    # Apply pagination and ordering
    stmt = filtered_stmt.offset(skip).limit(limit).order_by(Admission.admission_date.desc())

    result = await db.execute(stmt)
    admissions = result.scalars().all()

    # Process father/mother relationships for each admission (existing logic)
    for admission in admissions:
        if admission.student:
            if admission.student.user:
                admission.student.is_active = admission.student.user.is_active
            else:
                admission.student.is_active = None

            if admission.student.parent_links:
                father = None
                mother = None

                for link in admission.student.parent_links:
                    if link.parent and link.parent.relation_to_student:
                        if link.parent.relation_to_student.lower() == "father":
                            father = link.parent
                        elif link.parent.relation_to_student.lower() == "mother":
                            mother = link.parent

                admission.student.father = father
                admission.student.mother = mother
            else:
                admission.student.father = None
                admission.student.mother = None

    has_next = (skip + limit) < total_count

    logger.info(
        f"User {user_context.username} accessed {len(admissions)} admissions (scope: {user_context.access_scope})"
    )

    return {
        "items": admissions,
        "total_count": total_count,
        "has_next": has_next,
        "access_scope": user_context.access_scope,
        "user_role": user_context.role,
    }


async def delete_admission(admission_id: UUID, db: AsyncSession):
    """Delete an admission and the student data that depends on it"""
    admission = (
        await db.execute(select(Admission).options(selectinload(Admission.student)).where(Admission.id == admission_id))
    ).scalar_one_or_none()

    if not admission:
        raise HTTPException(status_code=404, detail="Admission not found")

    student = admission.student
    student_id = admission.student_id

    try:
        other_admissions = (
            await db.execute(
                select(func.count(Admission.id)).where(Admission.student_id == student_id, Admission.id != admission.id)
            )
        ).scalar() or 0
        if other_admissions:
            raise HTTPException(status_code=409, detail="Student has other admissions and cannot be deleted")

        blocking_models = (
            (FeeTransaction, "fee payments"),
            (FeeConcession, "fee concessions"),
            (FeeOld, "previous fee dues"),
            (StudentMark, "exam marks"),
            (StudentExamResult, "exam results"),
            (StudentSubjectResult, "exam results"),
            (StudentHomework, "homework records"),
        )
        for model, label in blocking_models:
            used = (await db.execute(select(func.count()).select_from(model).where(model.student_id == student_id))).scalar()
            if used:
                raise HTTPException(
                    status_code=409,
                    detail=f"Admission cannot be deleted because the student has {label}. Deactivate the student instead.",
                )

        mapping_ids = select(FeeStudentMapping.id).where(FeeStudentMapping.student_id == student_id)
        await db.execute(
            delete(FeeStudentMapTermAmount)
            .where(FeeStudentMapTermAmount.fee_student_map_id.in_(mapping_ids))
            .execution_options(synchronize_session=False)
        )
        for model in (
            FeeStudentMapping,
            StudentAttendance,
            StudentDocument,
            CertificateIssue,
            StudentTransportAssignment,
            StudentTrip,
        ):
            await db.execute(delete(model).where(model.student_id == student_id).execution_options(synchronize_session=False))
        await db.execute(
            delete(GeneratedCertificate)
            .where(GeneratedCertificate.student_id == student_id)
            .execution_options(synchronize_session=False)
        )

        parent_ids = (
            (await db.execute(select(StudentParentLink.parent_id).where(StudentParentLink.student_id == student_id)))
            .scalars()
            .all()
        )
        await db.execute(
            delete(StudentParentLink)
            .where(StudentParentLink.student_id == student_id)
            .execution_options(synchronize_session=False)
        )
        await db.flush()

        orphan_parent_ids = []
        for parent_id in set(parent_ids):
            if parent_id is None:
                continue
            still_linked = (
                await db.execute(select(func.count(StudentParentLink.id)).where(StudentParentLink.parent_id == parent_id))
            ).scalar()
            if not still_linked:
                orphan_parent_ids.append(parent_id)

        await db.execute(delete(Admission).where(Admission.id == admission.id).execution_options(synchronize_session=False))
        await db.execute(delete(Student).where(Student.id == student_id).execution_options(synchronize_session=False))
        await db.flush()

        user_ids = [student.user_id] if student and student.user_id else []
        if orphan_parent_ids:
            parent_rows = (
                await db.execute(select(Parent.id, Parent.user_id).where(Parent.id.in_(orphan_parent_ids)))
            ).all()
            await db.execute(
                delete(Parent).where(Parent.id.in_(orphan_parent_ids)).execution_options(synchronize_session=False)
            )
            user_ids.extend(user_id for _, user_id in parent_rows if user_id)
        await db.flush()
        if user_ids:
            await db.execute(delete(User).where(User.id.in_(user_ids)).execution_options(synchronize_session=False))

        await db.commit()
    except HTTPException:
        await db.rollback()
        raise
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Admission cannot be deleted because other records still reference the student. Deactivate the student instead.",
        )
    except Exception as e:
        await db.rollback()
        logger.error(f"Error deleting admission {admission_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Could not delete admission")

    return {"message": "Admission and related data deleted successfully"}


async def toggle_student_active(student_id: UUID, db: AsyncSession):
    """Toggle student's active status by updating the related user's is_active field"""
    stmt = select(Student).options(selectinload(Student.user)).where(Student.id == student_id)
    result = await db.execute(stmt)
    student = result.scalar_one_or_none()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if not student.user:
        raise HTTPException(status_code=400, detail="Student has no associated user")

    student.user.is_active = not student.user.is_active
    new_is_active = student.user.is_active
    await db.commit()

    # Load the full admission with relationships to return StudentAdmissionResponse
    # Must include Student.user so is_active is readable from the committed value
    admission_result = await db.execute(
        select(Admission)
        .options(
            selectinload(Admission.student).selectinload(Student.parent_links).selectinload(StudentParentLink.parent),
            selectinload(Admission.student).selectinload(Student.user),
        )
        .where(Admission.student_id == student_id)
    )
    admission = admission_result.scalar_one_or_none()

    if not admission:
        raise HTTPException(status_code=404, detail="Admission not found for student")

    # Set is_active from the freshly loaded user (mirrors get_all_admissions_with_context pattern)
    if admission.student:
        if admission.student.user:
            admission.student.is_active = admission.student.user.is_active
        else:
            admission.student.is_active = None

    # Process father/mother/guardian relationships
    if admission.student and admission.student.parent_links:
        father = None
        mother = None
        guardian = None
        for link in admission.student.parent_links:
            if link.parent and link.parent.relation_to_student:
                relation = link.parent.relation_to_student.lower()
                if relation == "father":
                    father = link.parent
                elif relation == "mother":
                    mother = link.parent
                elif relation == "guardian":
                    guardian = link.parent
        admission.student.father = father
        admission.student.mother = mother
        admission.student.guardian = guardian
    elif admission.student:
        admission.student.father = None
        admission.student.mother = None
        admission.student.guardian = None

    return admission
