import logging as log

from fastapi import HTTPException, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.public import Organization
from app.schemas.public import OrganizationCreate, OrganizationUpdate
from app.tools.database_error_mapper import map_database_error
from app.tools.error_handler import (
    ErrorCategory,
    create_business_rule_error,
    create_database_error,
    create_error_response,
    create_not_found_error,
    create_validation_error,
)

log = log.getLogger("public.org_service")


async def create_organization(db: AsyncSession, org: OrganizationCreate, request: Request | None = None):
    """
    Create a new organization with comprehensive error handling and validation

    Args:
        db: Database session
        org: Organization creation data
        request: FastAPI request object for context

    Returns:
        Created organization record

    Raises:
        HTTPException: For validation, business rule, or database errors
    """
    try:
        # Validate organization data
        if not org.name or not org.name.strip():
            raise create_validation_error(message="Organization name is required", field="name", request=request)

        if len(org.name.strip()) > 50:
            raise create_validation_error(
                message="Organization name cannot exceed 50 characters", field="name", value=org.name, request=request
            )

        if org.description and len(org.description) > 150:
            raise create_validation_error(
                message="Organization description cannot exceed 150 characters",
                field="description",
                value=org.description,
                request=request,
            )

        if org.subdomain and len(org.subdomain) > 50:
            raise create_validation_error(
                message="Organization subdomain cannot exceed 50 characters",
                field="subdomain",
                value=org.subdomain,
                request=request,
            )

        # Check for duplicate organization name
        existing_org = await db.execute(select(Organization).where(Organization.name == org.name.strip()))
        if existing_org.scalar_one_or_none():
            raise create_business_rule_error(
                message=f"Organization with name '{org.name}' already exists",
                rule="unique_organization_name",
                request=request,
            )

        # Check for duplicate subdomain if provided
        if org.subdomain:
            existing_subdomain = await db.execute(
                select(Organization).where(Organization.subdomain == org.subdomain.strip())
            )
            if existing_subdomain.scalar_one_or_none():
                raise create_business_rule_error(
                    message=f"Organization with subdomain '{org.subdomain}' already exists",
                    rule="unique_organization_subdomain",
                    request=request,
                )

        # Create organization
        db_org = Organization(**org.model_dump())
        db.add(db_org)
        await db.flush()

        # Get the created organization before commit
        result = await db.execute(select(Organization).where(Organization.id == db_org.id))
        created_org = result.scalar_one()

        await db.commit()

        log.info(f"Successfully created organization: {created_org.name} (ID: {created_org.id})")
        return created_org

    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        log.error(f"Error creating organization: {str(e)}")

        # Handle database-specific errors
        if "constraint" in str(e).lower() or "duplicate" in str(e).lower():
            error_code, message, details = map_database_error(e)
            raise create_database_error(message=message, constraint=details.get("constraint"), request=request)

        # Generic system error
        raise create_error_response(
            error_code=ErrorCategory.SYSTEM_ERROR,
            message="Failed to create organization",
            status_code=500,
            request=request,
        )


async def get_organization_by_id(db: AsyncSession, org_id: int, request: Request | None = None):
    """
    Get organization by ID with comprehensive error handling

    Args:
        db: Database session
        org_id: Organization ID
        request: FastAPI request object for context

    Returns:
        Organization record

    Raises:
        HTTPException: For not found or database errors
    """
    try:
        result = await db.execute(select(Organization).where(Organization.id == org_id))
        db_org = result.scalar_one_or_none()

        if not db_org:
            raise create_not_found_error(
                message="Organization not found", resource_type="organization", resource_id=str(org_id), request=request
            )

        return db_org

    except HTTPException:
        raise
    except Exception as e:
        log.error(f"Error fetching organization {org_id}: {str(e)}")
        raise create_error_response(
            error_code=ErrorCategory.SYSTEM_ERROR,
            message="Failed to fetch organization",
            status_code=500,
            request=request,
        )


async def get_all_organizations(
    db: AsyncSession, skip: int = 0, limit: int = 100, active_only: bool = True, request: Request | None = None
):
    """
    Get all organizations with pagination and comprehensive error handling

    Args:
        db: Database session
        skip: Number of records to skip
        limit: Number of records to return
        active_only: Filter only active organizations
        request: FastAPI request object for context

    Returns:
        Paginated result with organizations

    Raises:
        HTTPException: For validation or database errors
    """
    try:
        # Validate pagination parameters
        if skip < 0:
            raise create_validation_error(
                message="Skip parameter cannot be negative", field="skip", value=skip, request=request
            )

        if limit <= 0 or limit > 1000:
            raise create_validation_error(
                message="Limit must be between 1 and 1000", field="limit", value=limit, request=request
            )

        # Build base query with filters
        base_query = select(Organization)
        if active_only:
            base_query = base_query.filter(Organization.is_active)

        # Get total count
        count_query = select(func.count(Organization.id))
        if active_only:
            count_query = count_query.filter(Organization.is_active)
        total_count_result = await db.execute(count_query)
        total_count = total_count_result.scalar()

        # Get paginated items
        items_result = await db.execute(base_query.offset(skip).limit(limit))
        items = items_result.scalars().all()

        # Calculate has_next
        has_next = (skip + limit) < total_count

        result = {"items": items, "total_count": total_count, "has_next": has_next}

        log.info(f"Pagination result: total_count={total_count}, items_count={len(items)}, has_next={has_next}")
        return result

    except HTTPException:
        raise
    except Exception as e:
        log.error(f"Error fetching organizations: {str(e)}")
        raise create_error_response(
            error_code=ErrorCategory.SYSTEM_ERROR,
            message="Failed to fetch organizations",
            status_code=500,
            request=request,
        )


async def update_organization(
    db: AsyncSession, org_id: int, org_update: OrganizationUpdate, request: Request | None = None
):
    """
    Update organization with comprehensive error handling and validation

    Args:
        db: Database session
        org_id: Organization ID
        org_update: Update data
        request: FastAPI request object for context

    Returns:
        Updated organization record

    Raises:
        HTTPException: For not found, validation, or database errors
    """
    try:
        result = await db.execute(select(Organization).where(Organization.id == org_id))
        db_org = result.scalar_one_or_none()

        if not db_org:
            raise create_not_found_error(
                message="Organization not found", resource_type="organization", resource_id=str(org_id), request=request
            )

        update_data = org_update.model_dump(exclude_unset=True)

        # Validate update data
        if "name" in update_data:
            if not update_data["name"] or not update_data["name"].strip():
                raise create_validation_error(
                    message="Organization name cannot be empty", field="name", request=request
                )
            if len(update_data["name"].strip()) > 50:
                raise create_validation_error(
                    message="Organization name cannot exceed 50 characters",
                    field="name",
                    value=update_data["name"],
                    request=request,
                )

            # Check for duplicate name (excluding current organization)
            existing_org = await db.execute(
                select(Organization).where(Organization.name == update_data["name"].strip(), Organization.id != org_id)
            )
            if existing_org.scalar_one_or_none():
                raise create_business_rule_error(
                    message=f"Organization with name '{update_data['name']}' already exists",
                    rule="unique_organization_name",
                    request=request,
                )

        if "description" in update_data and update_data["description"]:
            if len(update_data["description"]) > 150:
                raise create_validation_error(
                    message="Organization description cannot exceed 150 characters",
                    field="description",
                    value=update_data["description"],
                    request=request,
                )

        if "subdomain" in update_data and update_data["subdomain"]:
            if len(update_data["subdomain"]) > 50:
                raise create_validation_error(
                    message="Organization subdomain cannot exceed 50 characters",
                    field="subdomain",
                    value=update_data["subdomain"],
                    request=request,
                )

            # Check for duplicate subdomain (excluding current organization)
            existing_subdomain = await db.execute(
                select(Organization).where(
                    Organization.subdomain == update_data["subdomain"].strip(), Organization.id != org_id
                )
            )
            if existing_subdomain.scalar_one_or_none():
                raise create_business_rule_error(
                    message=f"Organization with subdomain '{update_data['subdomain']}' already exists",
                    rule="unique_organization_subdomain",
                    request=request,
                )

        # Apply updates
        for var, value in update_data.items():
            setattr(db_org, var, value)

        await db.flush()

        # Get the updated organization before commit
        result = await db.execute(select(Organization).where(Organization.id == org_id))
        updated_org = result.scalar_one()

        await db.commit()

        log.info(f"Successfully updated organization: {updated_org.name} (ID: {updated_org.id})")
        return updated_org

    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        log.error(f"Error updating organization {org_id}: {str(e)}")

        # Handle database-specific errors
        if "constraint" in str(e).lower() or "duplicate" in str(e).lower():
            error_code, message, details = map_database_error(e)
            raise create_database_error(message=message, constraint=details.get("constraint"), request=request)

        # Generic system error
        raise create_error_response(
            error_code=ErrorCategory.SYSTEM_ERROR,
            message="Failed to update organization",
            status_code=500,
            request=request,
        )


async def deactivate_organization(db: AsyncSession, org_id: int, request: Request | None = None):
    """
    Deactivate organization with comprehensive error handling

    Args:
        db: Database session
        org_id: Organization ID
        request: FastAPI request object for context

    Returns:
        Deactivated organization record

    Raises:
        HTTPException: For not found or database errors
    """
    try:
        result = await db.execute(select(Organization).where(Organization.id == org_id))
        db_org = result.scalar_one_or_none()

        if not db_org:
            raise create_not_found_error(
                message="Organization not found", resource_type="organization", resource_id=str(org_id), request=request
            )

        if not db_org.is_active:
            raise create_business_rule_error(
                message="Organization is already deactivated", rule="organization_already_deactivated", request=request
            )

        db_org.is_active = False
        await db.flush()

        # Get the deactivated organization before commit
        result = await db.execute(select(Organization).where(Organization.id == org_id))
        deactivated_org = result.scalar_one()

        await db.commit()

        log.info(f"Successfully deactivated organization: {deactivated_org.name} (ID: {deactivated_org.id})")
        return deactivated_org

    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        log.error(f"Error deactivating organization {org_id}: {str(e)}")
        raise create_error_response(
            error_code=ErrorCategory.SYSTEM_ERROR,
            message="Failed to deactivate organization",
            status_code=500,
            request=request,
        )
