from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auth import Menu
from app.schemas.auth import MenuCreate


async def create_menu(db: AsyncSession, menu: MenuCreate):
    db_menu = Menu(**menu.dict())
    db.add(db_menu)
    await db.commit()
    await db.refresh(db_menu)
    return db_menu


async def get_all_menus(db: AsyncSession):
    # return db.query(Menu).all()
    result = await db.execute(select(Menu))
    menus = result.unique().scalars().all()
    return menus
