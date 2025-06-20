from sqlalchemy.orm import Session
from app.models.auth import Organization
from app.schemas.auth import OrganizationCreate, OrganizationUpdate
import logging as log
from fastapi import HTTPException, status

log = log.getLogger("public.org_service")

def create_organization(db: Session, org: OrganizationCreate):
    try:
        db_org = Organization(**org.model_dump())
        db.add(db_org)
        db.commit()
        db.refresh(db_org)
        return db_org
    except Exception as e:        
        log.error(f"Error creating organization: {str(e)}")
        raise HTTPException (status_code = status.HTTP_400_BAD_REQUEST,
        detail = f"Organization creation failed: {str(e)}")
    
def get_organization_by_id(db: Session, org_id: int):
    db_org = db.query(Organization).filter(Organization.id == org_id).first()
    if not db_org:
        log.warning(f"Organization with id {org_id} not found")
        return None
    return db_org

def get_all_organizations(db: Session, skip: int = 0, limit: int = 100, active_only : bool = True):
    try:
        query = db.query(Organization)
        if active_only:
            query = query.filter(Organization.is_active == True)
        return query.offset(skip).limit(limit).all()
    except Exception as e:
        log.error(f"Error fetching organizations: {str(e)}")
        raise
    
def update_organization(db: Session, org_id: int, org_update: OrganizationUpdate):
    try:
        db_org = db.query(Organization).filter(Organization.id == org_id).first()
        if not db_org:
            log.warning(f"Organization with id {org_id} not found for update")
            return None
        update_data = org_update.model_dump(exclude_unset=True)
        for var, value in update_data.items():
            setattr(db_org, var, value)
        db.commit()
        db.refresh(db_org)
        return db_org
    except Exception as e:
        log.error(f"Error updating organization: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Organization update failed: {str(e)}")
        
def deactivate_organization(db: Session, org_id: int):
    try:
        db_org = db.query(Organization).filter(Organization.id == org_id).first()
        if not db_org:
            log.warning(f"Organization with id {org_id} not found for deactivation")
            return None
        db_org.is_active = False
        db.commit()
        db.refresh(db_org)
        return db_org
    except Exception as e:
        log.error(f"Error deactivating organization: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Organization deactivation failed: {str(e)}")
        