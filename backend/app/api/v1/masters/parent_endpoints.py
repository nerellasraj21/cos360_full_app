from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.schemas.masters.parent_schema import ParentCreate, ParentUpdate, ParentOut
from app.service.masters.parent_service import (
    create_parent,
    get_parent_by_id,
    get_all_parents,
    update_parent,
    delete_parent,
)
from app.db.session import get_db

router = APIRouter(prefix="/parents", tags=["Parents"])


@router.post("/", response_model=ParentOut, status_code=status.HTTP_201_CREATED)
async def create_parent_profile(
    parent_data: ParentCreate,
    db: AsyncSession = Depends(get_db),
):
    return await create_parent(parent_data, db)


@router.get("/{parent_id}", response_model=ParentOut)
async def read_parent(
    parent_id: int,
    db: AsyncSession = Depends(get_db),
):
    parent = await get_parent_by_id(parent_id, db)
    if not parent:
        raise HTTPException(status_code=404, detail="Parent not found")
    return parent


@router.get("/", response_model=List[ParentOut])
async def list_all_parents(db: AsyncSession = Depends(get_db)):
    parents = await get_all_parents(db)
    return [ParentOut.from_orm_with_students(p) for p in parents]


@router.patch("/{parent_id}", response_model=ParentOut)
async def update_parent_profile(
    parent_id: int,
    parent_data: ParentUpdate,
    db: AsyncSession = Depends(get_db),
):
    updated = await update_parent(parent_id, parent_data, db)
    if not updated:
        raise HTTPException(status_code=404, detail="Parent not found")
    return updated


@router.delete("/{parent_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_parent_profile(
    parent_id: int,
    db: AsyncSession = Depends(get_db),
):
    deleted = await delete_parent(parent_id, db)
    if not deleted:
        raise HTTPException(status_code=404, detail="Parent not found")
