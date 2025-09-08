from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.schemas.public.org_schema import *
from app.service.public import org_service as organization_service
from app.db.tenant_session import get_public_db
from sqlalchemy.ext.asyncio import AsyncSession
#from app.core.dependencies import superadmin_required

router = APIRouter(prefix="/superadmin/organizations", tags=["SuperAdmin Organizations"])

#@router.post("/", response_model=OrganizationRead, dependencies=[Depends(superadmin_required)])

@router.post("/", response_model=OrganizationRead)
async def create_organization(org: OrganizationCreate, db: AsyncSession = Depends(get_public_db)):
    return await organization_service.create_organization(db, org)

@router.get("/{org_id}", response_model=OrganizationRead)
async def read_organization(org_id: int, db: AsyncSession = Depends(get_public_db)):
    org = await organization_service.get_organization_by_id(db, org_id) 
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org

@router.get("/", response_model=list[OrganizationRead])
async def list_organizations(skip: int = 0, limit: int = 10, db: AsyncSession = Depends(get_public_db)):
    return await organization_service.get_all_organizations(db, skip, limit)

@router.put("/{org_id}", response_model=OrganizationRead)
async def update_organization(org_id: int, org_data: OrganizationUpdate, db: AsyncSession = Depends(get_public_db)):
    updated = await organization_service.update_organization(db, org_id, org_data)
    if not updated:
        raise HTTPException(status_code=404, detail="Organization not found")
    return updated

@router.delete("/{org_id}", response_model=OrganizationRead)
async def delete_organization(org_id: int, db: AsyncSession = Depends(get_public_db)):
    deleted = await organization_service.deactivate_organization(db, org_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Organization not found")
    return deleted
