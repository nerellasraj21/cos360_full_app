from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auth import RoleMenuPermission
from app.schemas.auth import RoleMenuPermissionCreate


async def create_permission(db: AsyncSession, permission: RoleMenuPermissionCreate):
    db_permission = RoleMenuPermission(**permission.dict())
    db.add(db_permission)
    await db.commit()
    await db.refresh(db_permission)
    return db_permission


async def get_all_permissions(db: AsyncSession):
    # return db.query(RoleMenuPermission).all()
    result = await db.execute(select(RoleMenuPermission))
    menuPermissions = result.unique().scalars().all()
    return menuPermissions
