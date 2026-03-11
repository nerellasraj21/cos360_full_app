"""
Fee Collection endpoints — Student Search, Fee Summary, Fee Payment.
"""

from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_tenant_db
from app.middleware.rate_limit_middleware import rate_limit_api
from app.schemas.fee.fee_collection_schema import (
    FeePaymentRequest,
    FeePaymentResponse,
    FeeSummaryResponse,
    StudentSearchResult,
)
from app.service.fee.fee_collection_service import (
    get_fee_summary,
    process_fee_payment,
    search_students_for_fee,
)
from app.tools.enhanced_permissions import check_user_resource_access
from app.tools.simple_permissions import check_role_plan_permission_with_error, get_current_user_token

router = APIRouter(prefix="/fee/collection", tags=["Fee Collection"])


# ─── Student Search ──────────────────────────────────────────────────────────


@router.get("/search-student", response_model=list[StudentSearchResult])
@rate_limit_api()
async def search_student(
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
    admission_number: str | None = Query(None, description="Admission number (partial match)"),
    mobile_number: str | None = Query(None, description="Mobile number (student or parent)"),
    class_id: UUID | None = Query(None, description="Class filter"),
    section_id: UUID | None = Query(None, description="Section filter"),
    city: str | None = Query(None, description="City address search"),
    mandal: str | None = Query(None, description="Mandal address search"),
    village: str | None = Query(None, description="Village address search"),
):
    """
    Multi-criteria student search for fee collection (SR-01 to SR-08).
    At least one parameter required.
    """
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "fee_collection", "list")

    return await search_students_for_fee(
        db,
        admission_number=admission_number,
        mobile_number=mobile_number,
        class_id=class_id,
        section_id=section_id,
        city=city,
        mandal=mandal,
        village=village,
    )


# ─── Fee Summary ─────────────────────────────────────────────────────────────


@router.get("/summary/{student_id}", response_model=FeeSummaryResponse)
@rate_limit_api()
async def fee_summary(
    student_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
    academic_year_id: UUID = Query(..., description="Academic year ID"),
    as_of_date: date | None = Query(None, description="As-of date (default: today)"),
):
    """
    Fee summary with as-of-date snapshot (FS-01 to FS-07).
    """
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "fee_collection", "read")

    return await get_fee_summary(db, student_id, academic_year_id, as_of_date)


@router.get("/my-summary", response_model=FeeSummaryResponse)
@rate_limit_api()
async def my_fee_summary(
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
    academic_year_id: UUID = Query(..., description="Academic year ID"),
    as_of_date: date | None = Query(None, description="As-of date (default: today)"),
):
    """
    Student views own fee summary.
    """
    user_context = await check_user_resource_access(db, request, "fee_collection", "read")
    if not user_context.student_id:
        from fastapi import HTTPException, status

        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only students can access this endpoint")

    return await get_fee_summary(db, user_context.student_id, academic_year_id, as_of_date)


@router.get("/child-summary/{student_id}", response_model=FeeSummaryResponse)
@rate_limit_api()
async def child_fee_summary(
    student_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
    academic_year_id: UUID = Query(..., description="Academic year ID"),
    as_of_date: date | None = Query(None, description="As-of date (default: today)"),
):
    """
    Parent views child's fee summary. Validates parent-child link.
    """
    user_context = await check_user_resource_access(
        db, request, "fee_collection", "read", target_entity_id=student_id
    )
    if not user_context.parent_id:
        from fastapi import HTTPException, status

        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only parents can access this endpoint")

    if student_id not in (user_context.allowed_entity_ids or []):
        from fastapi import HTTPException, status

        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot access fee data for unrelated student")

    return await get_fee_summary(db, student_id, academic_year_id, as_of_date)


# ─── Fee Payment ─────────────────────────────────────────────────────────────


@router.post("/pay", response_model=FeePaymentResponse)
@rate_limit_api()
async def pay_fee(
    data: FeePaymentRequest,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """
    Collect fee payment — atomic wrapper (PR-01 to PR-10).
    Creates transaction + receipt + optional SMS in one call.
    """
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "fee_collection", "create")

    return await process_fee_payment(db, data, current_user)
