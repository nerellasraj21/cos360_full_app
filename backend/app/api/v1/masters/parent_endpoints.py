from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_tenant_db
from app.schemas.masters.parent_schema import ParentCreate, ParentListResponse, ParentOut, ParentUpdate
from app.service.masters.parent_service import (
    create_parent,
    delete_parent,
    get_all_parents,
    get_parent_by_id,
    search_parents,
    update_parent,
)
from app.tools.simple_permissions import (
    check_role_plan_permission_with_error,
    get_current_user_token,
)

router = APIRouter(prefix="/parents", tags=["Parents"])


@router.post("/", response_model=ParentOut, status_code=status.HTTP_201_CREATED)
async def create_parent_profile(
    parent_data: ParentCreate,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Create parent profile - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "parent_management", "create")

    return await create_parent(parent_data, db)


@router.get("/search", response_model=ParentListResponse)
async def search_parents_endpoint(
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
    search_query: str | None = Query(None, description="Search by name, email, or phone"),
    email: str | None = Query(None, description="Filter by email"),
    phone: str | None = Query(None, description="Filter by phone"),
    relation_to_student: str | None = Query(None, description="Filter by relation (Father, Mother, Guardian)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(10, ge=1, le=100, description="Number of records to return"),
):
    """Search parents by email, phone, name, or relation. Use during student admission to find existing parents."""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    await check_role_plan_permission_with_error(db, request, role, "parent_management", "list")

    result = await search_parents(
        db=db,
        search_query=search_query,
        email=email,
        phone=phone,
        relation_to_student=relation_to_student,
        skip=skip,
        limit=limit,
    )

    return {
        "items": [ParentOut.from_orm_with_students(p) for p in result["items"]],
        "total_count": result["total_count"],
        "has_next": result["has_next"],
        "skip": result["skip"],
        "limit": result["limit"],
    }


@router.get("/{parent_id}", response_model=ParentOut)
async def read_parent(
    parent_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Get parent by ID - All authenticated users"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "parent_management", "read")

    parent = await get_parent_by_id(parent_id, db)
    if not parent:
        raise HTTPException(status_code=404, detail="Parent not found")
    return ParentOut.from_orm_with_students(parent)


@router.get("/", response_model=ParentListResponse)
async def list_all_parents(
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of records to return"),
):
    """List all parents with pagination - All authenticated users"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "parent_management", "list")

    result = await get_all_parents(db, skip=skip, limit=limit)
    return {
        "items": [ParentOut.from_orm_with_students(p) for p in result["items"]],
        "total_count": result["total_count"],
        "has_next": result["has_next"],
        "skip": result["skip"],
        "limit": result["limit"],
    }


@router.patch("/{parent_id}", response_model=ParentOut)
async def update_parent_profile(
    parent_id: UUID,
    parent_data: ParentUpdate,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Update parent profile - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "parent_management", "update")

    updated = await update_parent(parent_id, parent_data, db)
    if not updated:
        raise HTTPException(status_code=404, detail="Parent not found")
    return ParentOut.from_orm_with_students(updated)


@router.get("/salary-ranges/dropdown")
async def get_salary_ranges_dropdown(request: Request):
    """
    Get salary range options for dropdown.

    Returns a list of all available salary ranges with:
    - value: The enum value for storage
    - label: Human-readable display text
    - display: Short display text for compact views

    **Required Permission**: parent_management:list
    """
    await get_current_user_token(request)

    return [
        {"value": "below_1l", "label": "Below ₹1 Lakh", "display": "< ₹1L"},
        {"value": "1l_3l", "label": "₹1 - ₹3 Lakhs", "display": "₹1L - ₹3L"},
        {"value": "3l_5l", "label": "₹3 - ₹5 Lakhs", "display": "₹3L - ₹5L"},
        {"value": "5l_10l", "label": "₹5 - ₹10 Lakhs", "display": "₹5L - ₹10L"},
        {"value": "above_10l", "label": "Above ₹10 Lakhs", "display": "> ₹10L"},
    ]


@router.delete("/{parent_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_parent_profile(
    parent_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Delete parent profile - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "parent_management", "delete")

    deleted = await delete_parent(parent_id, db)
    if not deleted:
        raise HTTPException(status_code=404, detail="Parent not found")
