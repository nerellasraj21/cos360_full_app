from sqlalchemy.orm import Session
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.public import Organization
from app.schemas.public import OrganizationCreate, OrganizationUpdate
import logging as log
from fastapi import HTTPException, status

log = log.getLogger("public.org_service")

async def create_organization(db: AsyncSession, org: OrganizationCreate):
    try:
        db_org = Organization(**org.model_dump())
        db.add(db_org)
        await db.commit()
        await db.refresh(db_org)
        return db_org
    except Exception as e:        
        log.error(f"Error creating organization: {str(e)}")
        raise HTTPException (status_code = status.HTTP_400_BAD_REQUEST,
        detail = f"Organization creation failed: {str(e)}")
    
async def get_organization_by_id(db: AsyncSession, org_id: int):
    # db_org = db.query(Organization).filter(Organization.id == org_id).first()
    result = await db.execute(select(Organization).where(Organization.id == org_id))
    db_org = result.scalar_one_or_none()
    
    if not db_org:
        log.warning(f"Organization with id {org_id} not found")
        return None
    return db_org

async def get_all_organizations(db: AsyncSession, skip: int = 0, limit: int = 100, active_only : bool = True):
    try:
        # Build base query with filters
        base_query = select(Organization)
        if active_only:
            base_query = base_query.filter(Organization.is_active == True)
        
        # Get total count
        count_query = select(func.count(Organization.id))
        if active_only:
            count_query = count_query.filter(Organization.is_active == True)
        total_count_result = await db.execute(count_query)
        total_count = total_count_result.scalar()
        
        # Get paginated items
        items_result = await db.execute(base_query.offset(skip).limit(limit))
        items = items_result.scalars().all()
        
        # Calculate has_next
        has_next = (skip + limit) < total_count
        
        result = {
            "items": items,
            "total_count": total_count,
            "has_next": has_next
        }
        
        log.info(f"Pagination result: total_count={total_count}, items_count={len(items)}, has_next={has_next}")
        return result
    except Exception as e:
        log.error(f"Error fetching organizations: {str(e)}")
        raise
    
async def update_organization(db: AsyncSession, org_id: int, org_update: OrganizationUpdate):
    try:
        # db_org = db.query(Organization).filter(Organization.id == org_id).first()
        result = await db.execute(select(Organization).where(Organization.id == org_id))
        db_org = result.scalar_one_or_none()
        if not db_org:
            log.warning(f"Organization with id {org_id} not found for update")
            return None
        update_data = org_update.model_dump(exclude_unset=True)
        for var, value in update_data.items():
            setattr(db_org, var, value)
        await db.commit()
        await db.refresh(db_org)
        return db_org
    except Exception as e:
        log.error(f"Error updating organization: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Organization update failed: {str(e)}")
        
async def deactivate_organization(db: AsyncSession, org_id: int):
    try:
        # db_org = db.query(Organization).filter(Organization.id == org_id).first()
        result = await db.execute(select(Organization).where(Organization.id == org_id))
        db_org = result.scalar_one_or_none()
        if not db_org:
            log.warning(f"Organization with id {org_id} not found for deactivation")
            return None
        db_org.is_active = False
        await db.commit()
        await db.refresh(db_org)
        return db_org
    except Exception as e:
        log.error(f"Error deactivating organization: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Organization deactivation failed: {str(e)}")
        