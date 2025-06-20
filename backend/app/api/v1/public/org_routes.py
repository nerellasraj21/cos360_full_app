# app/api/public/organization_routes.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.schemas.public.org_schema import *
from app.service.public.org_service import org_service as organization_service
from app.db.session import get_db
from app.core.dependencies import superadmin_required

router = APIRouter(prefix="/superadmin/organizations", tags=["SuperAdmin Organizations"])

@router.post("/", response_model=OrganizationRead, dependencies=[Depends(superadmin_required)])
def create_organization(org: OrganizationCreate, db: Session = Depends(get_db)):
    return organization_service.create_organization(db, org)

@router.get("/{org_id}", response_model=OrganizationRead, dependencies=[Depends(superadmin_required)])
def read_organization(org_id: int, db: Session = Depends(get_db)):
    org = organization_service.get_organization_by_id(db, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org

@router.get("/", response_model=list[OrganizationRead], dependencies=[Depends(superadmin_required)])
def list_organizations(db: Session = Depends(get_db)):
    return organization_service.get_all_organizations(db)

@router.put("/{org_id}", response_model=OrganizationRead, dependencies=[Depends(superadmin_required)])
def update_organization(org_id: int, org_data: OrganizationUpdate, db: Session = Depends(get_db)):
    updated = organization_service.update_organization(db, org_id, org_data)
    if not updated:
        raise HTTPException(status_code=404, detail="Organization not found")
    return updated

@router.delete("/{org_id}", response_model=OrganizationRead, dependencies=[Depends(superadmin_required)])
def delete_organization(org_id: int, db: Session = Depends(get_db)):
    deleted = organization_service.delete_organization(db, org_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Organization not found")
    return deleted
