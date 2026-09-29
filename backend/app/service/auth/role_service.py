from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.auth import Role
from app.schemas.auth import RoleCreate


async def create_role(db: AsyncSession, role: RoleCreate):
    db_role = Role(**role.dict())
    db.add(db_role)
    await db.commit()
    await db.refresh(db_role)
    return db_role


async def get_all_roles(db: AsyncSession):
    # return db.query(Role).all()
    result = await db.execute(select(Role))
    roles = result.unique().scalars().all()
    return roles
