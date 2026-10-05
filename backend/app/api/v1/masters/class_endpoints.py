from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import get_tenant_db
from app.middleware.rate_limit_middleware import rate_limit_create, rate_limit_dropdown
from app.schemas.masters.class_schema import ClassCreate, ClassDropdown, ClassOut, ClassRead, ClassUpdate
from app.schemas.masters.sections_schema import ClassSectionInfo, SectionCreate, SectionDropdown, SectionOut, SectionUpdate
from app.service.masters.class_service import (
    add_sections_to_class,
    create_class_with_sections,
    delete_class_with_sections,
    delete_section,
    get_all_classes_data,
    get_all_classes_with_sections,
    get_all_sections_data,
    get_class_section_list,
    get_class_with_sections,
    get_classes_dropdown,
    get_section_by_id,
    get_sections_by_class_id,
    get_sections_by_class_name,
    get_students_by_class_section,
    update_class_with_sections,
    update_section,
)
from app.tools.simple_permissions import (
    check_role_plan_permission_with_error,
    get_current_user_token,
)

router = APIRouter(prefix="/masters/class_sections", tags=["Masters/Class & Sections"])


# Create Class with Sections
@router.post("/", response_model=ClassRead, status_code=status.HTTP_201_CREATED)
@rate_limit_create("30 per minute")
async def create_class(request: Request, class_data: ClassCreate, db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "classes", "create")

    return await create_class_with_sections(db, class_data)


# Read Single Class with Sections
@router.get("/by_class_id/{class_id}", response_model=ClassRead)
async def get_class(request: Request, class_id: UUID, db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "classes", "read")

    db_class = await get_class_with_sections(db, class_id)
    if not db_class:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")
    return db_class


# Read All Classes with Sections
@router.get("/read_all", response_model=list[ClassRead])
async def get_classes_with_sections(
    request: Request,
    academic_year_id: UUID | None = None,
    active_only: bool = False,
    db: AsyncSession = Depends(get_tenant_db),
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "classes", "list")

    return await get_all_classes_with_sections(db, academic_year_id, active_only)


# Update Class and Replace Sections
@router.put("/{class_id}", response_model=dict)
async def update_class(
    request: Request, class_id: UUID, class_data: ClassUpdate, db: AsyncSession = Depends(get_tenant_db)
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "classes", "update")

    updated = await update_class_with_sections(db, class_id, class_data)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")
    return updated


# Delete Class
@router.delete("/{class_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_class(request: Request, class_id: UUID, db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "classes", "delete")

    deleted = await delete_class_with_sections(db, class_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")
    return {"detail": "Class deleted successfully"}


@router.get("/class-section-list", response_model=list[ClassSectionInfo])
async def list_class_sections(request: Request, db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "classes", "list")

    return await get_class_section_list(db)


@router.get("/class-list", response_model=list[ClassOut])
@rate_limit_dropdown("100 per minute")
async def get_all_classes(request: Request, db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "classes", "list")

    return await get_all_classes_data(db)


@router.get("/section-list", response_model=list[SectionOut])
@rate_limit_dropdown("100 per minute")
async def get_all_sections(request: Request, db: AsyncSession = Depends(get_tenant_db)):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "classes", "list")

    return await get_all_sections_data(db)


@router.get("/sections-by-class-name", response_model=list[SectionOut])
@rate_limit_dropdown("100 per minute")
async def fetch_sections_by_class_name(
    request: Request,
    class_name: str = Query(..., description="Name of the class"),
    db: AsyncSession = Depends(get_tenant_db),
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "classes", "list")

    return await get_sections_by_class_name(db, class_name)


@router.get("/dropdown", response_model=list[ClassDropdown])
@rate_limit_dropdown("100 per minute")
async def get_classes_dropdown_endpoint(
    request: Request, active_only: bool = True, db: AsyncSession = Depends(get_tenant_db)
):
    """Get classes for dropdown (id + name only). Rate limited to 100 requests per minute."""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "classes", "list")

    return await get_classes_dropdown(db, active_only)


@router.get("/by_class_id/{class_id}/sections", response_model=list[SectionDropdown])
@rate_limit_dropdown("100 per minute")
async def get_sections_by_class_id_endpoint(
    request: Request, class_id: UUID, db: AsyncSession = Depends(get_tenant_db)
):
    """Get sections by class ID for dropdown (id + name only). Rate limited to 100 requests per minute."""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "classes", "list")

    return await get_sections_by_class_id(db, class_id)


@router.get("/by-class-section")
async def list_students_by_class_section(
    request: Request,
    class_name: str = Query(..., description="Class name (e.g., 'UKG')"),
    section_name: str = Query(..., description="Section name (e.g., 'A')"),
    db: AsyncSession = Depends(get_tenant_db),
):
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "classes", "list")

    return await get_students_by_class_section(class_name, section_name, db)


# Add Sections to Existing Class
@router.post("/{class_id}/sections", response_model=list[SectionOut], status_code=status.HTTP_201_CREATED)
async def add_sections_endpoint(
    request: Request, class_id: UUID, sections: list[SectionCreate], db: AsyncSession = Depends(get_tenant_db)
):
    """Add one or more sections to an existing class without affecting existing sections."""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")
    await check_role_plan_permission_with_error(db, request, role, "sections", "create")
    return await add_sections_to_class(db, class_id, [s.model_dump() for s in sections])


# Get Individual Section
@router.get("/sections/{section_id}", response_model=SectionOut)
async def get_section(request: Request, section_id: UUID, db: AsyncSession = Depends(get_tenant_db)):
    """Get section by ID"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "classes", "read")

    return await get_section_by_id(db, section_id)


# Update Individual Section
@router.put("/sections/{section_id}", response_model=SectionOut)
async def update_section_endpoint(
    request: Request, section_id: UUID, section_data: SectionUpdate, db: AsyncSession = Depends(get_tenant_db)
):
    """Update individual section"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "classes", "update")

    section_dict = section_data.model_dump(exclude_unset=True)
    if "id" in section_dict:
        del section_dict["id"]

    updated_section = await update_section(db, section_id, section_dict)
    if not updated_section:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Section not found")
    return updated_section


# Delete Individual Section
@router.delete("/sections/{section_id}", status_code=status.HTTP_200_OK)
async def delete_section_endpoint(request: Request, section_id: UUID, db: AsyncSession = Depends(get_tenant_db)):
    """Delete individual section"""
    current_user = await get_current_user_token(request)
    role = current_user.get("role")

    # Multi-layer permission check: Role + Plan validation
    await check_role_plan_permission_with_error(db, request, role, "classes", "delete")

    result = await delete_section(db, section_id)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Section not found")
    return result
