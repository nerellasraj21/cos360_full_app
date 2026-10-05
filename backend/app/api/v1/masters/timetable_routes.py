from uuid import UUID

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_tenant_db
from app.schemas.masters.timetable_schema import (
    FrontendTimetableCreate,
    FrontendTimetableRead,
    FrontendTimetableResponse,
    FullTimetableCreate,
    GroupedSectionTimetableOut,
    TimetableSlotBulkUpdateRequest,
    TimetableSlotOut,
)
from app.service.masters.timetable_service import (
    add_full_timetable,
    bulk_update_timetable_slots,
    create_frontend_timetable,
    delete_frontend_timetable,
    get_frontend_timetable_by_section,
    get_timetable_by_section,
    update_frontend_timetable,
)
from app.tools.simple_permissions import check_role_plan_permission_with_error, get_current_user_token

router = APIRouter(prefix="/students/timetable", tags=["Student/Timetable"])

# @router.post("/slots", response_model=TimetableSlotOut)
# async def create_timetable_slot(slot: TimetableSlotCreate, db: AsyncSession = Depends(get_tenant_db)):
#     return await add_timetable_slot(slot,db)


@router.post("/bulk")
async def create_full_timetable(
    data: FullTimetableCreate,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Create full timetable - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "timetable_management", "create")

    return await add_full_timetable(data, db)


@router.post("/frontend", response_model=FrontendTimetableResponse)
async def create_frontend_timetable_endpoint(
    data: FrontendTimetableCreate,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db),
):
    """Create timetable from frontend payload - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "timetable_management", "create")

    return await create_frontend_timetable(data, db)


@router.get("/frontend/{section_id}", response_model=FrontendTimetableRead)
async def get_frontend_timetable_endpoint(
    section_id: UUID, request: Request, db: AsyncSession = Depends(get_tenant_db)
):
    """Get timetable in frontend format - Read permission"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    await check_role_plan_permission_with_error(db, request, role, "timetable_management", "read")

    return await get_frontend_timetable_by_section(section_id, db)


@router.put("/frontend/{section_id}", response_model=FrontendTimetableResponse)
async def update_frontend_timetable_endpoint(
    section_id: UUID, data: FrontendTimetableCreate, request: Request, db: AsyncSession = Depends(get_tenant_db)
):
    """Update timetable in frontend format - Update permission"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    await check_role_plan_permission_with_error(db, request, role, "timetable_management", "update")

    return await update_frontend_timetable(section_id, data, db)


@router.delete("/frontend/{section_id}")
async def delete_frontend_timetable_endpoint(
    section_id: UUID, request: Request, db: AsyncSession = Depends(get_tenant_db)
):
    """Delete timetable for section - Delete permission"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    await check_role_plan_permission_with_error(db, request, role, "timetable_management", "delete")

    return await delete_frontend_timetable(section_id, db)


# @router.get("/slots", response_model=List[TimetableSlotOut])
# async def get_timetable_slots(db: AsyncSession = Depends(get_tenant_db)):
#     return await get__all_timetable_slots(db)


# @router.get("/slots/{slot_id}", response_model=TimetableSlotOut)
# async def get_timetable_slot(slot_id: int, db: AsyncSession = Depends(get_tenant_db)):
#     return await get_timetable_slot_by_id(slot_id,db)


# @router.put("/slots/{slot_id}", response_model=TimetableSlotOut)
# async def update_timetable_slot(slot_id: int, slot_data: TimetableSlotUpdate, db: AsyncSession = Depends(get_tenant_db)):
#     return await update_all_details_timetable_slot(slot_id,slot_data,db)

# @router.patch("/slots/{slot_id}", response_model=TimetableSlotOut)
# async def partial_update_timetable_slot(slot_id: int, slot_data: TimetableSlotPartialUpdate, db: AsyncSession = Depends(get_tenant_db)):
#     return await update_partial_details_timetable_slot(slot_id, slot_data, db)


# @router.delete("/slots/{slot_id}")
# async def delete_timetable_slot(slot_id: int, db: AsyncSession = Depends(get_tenant_db)):
#     return await delete_timetable_slot_by_id(slot_id,db)

# # Create
# @router.post("/", response_model=SlotTimeOut)
# async def create_slot_time(slot_time: SlotTimeCreate, db: AsyncSession = Depends(get_tenant_db)):
#     return await add_slot_time(slot_time, db)

# # Get all slot times (optionally filtered by section)
# @router.get("/", response_model=list[SlotTimeOut])
# async def read_slot_times(section_id: int = Query(None), db: AsyncSession = Depends(get_tenant_db)):
#     return await get_slot_times(section_id, db)

# # Get by ID
# @router.get("/{slot_time_id}", response_model=SlotTimeOut)
# async def read_slot_time(slot_time_id: int = Path(...), db: AsyncSession = Depends(get_tenant_db)):
#     return await get_slot_time(slot_time_id, db)


@router.get("/section/{section_id}", response_model=GroupedSectionTimetableOut)
async def fetch_timetable_by_section(section_id: UUID, request: Request, db: AsyncSession = Depends(get_tenant_db)):
    """Get timetable by section - All authenticated users"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "timetable_management", "read")

    return await get_timetable_by_section(section_id, db)


# # Full update (PUT)
# @router.put("/{slot_time_id}", response_model=SlotTimeOut)
# async def update_slot_time_endpoint(
#     slot_time_id: int,
#     update_data: SlotTimeUpdate,
#     db: AsyncSession = Depends(get_tenant_db),
# ):
#     return await update_slot_time(slot_time_id, update_data, db)

# # Partial update (PATCH)
# @router.patch("/{slot_time_id}", response_model=SlotTimeOut)
# async def patch_slot_time_endpoint(
#     slot_time_id: int,
#     patch_data: SlotTimePartialUpdate,
#     db: AsyncSession = Depends(get_tenant_db),
# ):
#     return await patch_slot_time(slot_time_id, patch_data.dict(exclude_unset=True), db)


@router.patch("/timetable/slots/bulk", response_model=list[TimetableSlotOut])
async def bulk_patch_slots(
    data: TimetableSlotBulkUpdateRequest, request: Request, db: AsyncSession = Depends(get_tenant_db)
):
    """Bulk update timetable slots - Admin only"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "timetable_management", "update")

    return await bulk_update_timetable_slots(data, db)
