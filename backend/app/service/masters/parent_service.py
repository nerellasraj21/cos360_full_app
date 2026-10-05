import logging
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import and_, func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.auth.role_model import Role
from app.models.auth.user_model import User
from app.models.masters.parent_model import Parent
from app.models.masters.student_parent_association_model import StudentParentLink
from app.schemas.masters.parent_schema import ParentCreate, ParentUpdate
from app.tools.password_util import hash_password

logger = logging.getLogger(__name__)


async def create_parent(parent_data: ParentCreate, db: AsyncSession) -> Parent:
    email = (parent_data.email or "").strip() or None
    phone = (parent_data.phone or "").strip() or None
    username = email or phone
    if not username:
        raise HTTPException(status_code=400, detail="Either email or phone is required to create a parent")

    role_result = await db.execute(select(Role).where(Role.name == "Parent"))
    parent_role = role_result.scalars().first()
    if not parent_role:
        raise HTTPException(status_code=404, detail="Role 'Parent' not found")

    conditions = [User.username == username]
    if email:
        conditions.append(User.email == email)
    existing = await db.execute(select(User.id).where(or_(*conditions)).limit(1))
    if existing.scalars().first():
        raise HTTPException(status_code=409, detail="A user with this email or phone already exists")

    try:
        new_user = User(
            username=username,
            email=email,
            password_hash=hash_password("parent@123"),
            is_active=True,
            is_first_login=True,
            role_id=parent_role.id,
        )
        db.add(new_user)
        await db.flush()

        payload = parent_data.model_dump()
        payload["email"] = email
        payload["phone"] = phone
        new_parent = Parent(**payload, user_id=new_user.id)
        db.add(new_parent)
        await db.flush()

        result = await db.execute(
            select(Parent)
            .options(selectinload(Parent.student_links).selectinload(StudentParentLink.student))
            .where(Parent.id == new_parent.id)
        )
        created = result.scalar_one()
        await db.commit()
        return created
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="A user with this email or phone already exists")
    except Exception as e:
        await db.rollback()
        logger.error("Error creating parent: %s", e)
        raise HTTPException(status_code=500, detail="Could not create parent")


async def get_parent_by_id(parent_id: UUID, db: AsyncSession) -> Parent:
    result = await db.execute(
        select(Parent)
        .options(selectinload(Parent.student_links).selectinload(StudentParentLink.student))
        .where(Parent.id == parent_id)
    )
    parent = result.scalar_one_or_none()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent not found")
    return parent


async def get_all_parents(db: AsyncSession, skip: int = 0, limit: int = 100):
    count_stmt = select(func.count(Parent.id))
    count_result = await db.execute(count_stmt)
    total_count = count_result.scalar()

    result = await db.execute(
        select(Parent)
        .options(selectinload(Parent.student_links).selectinload(StudentParentLink.student))
        .offset(skip)
        .limit(limit)
        .order_by(Parent.name)
    )
    parents = result.scalars().all()

    has_next = (skip + limit) < total_count

    return {"items": parents, "total_count": total_count, "has_next": has_next, "skip": skip, "limit": limit}


async def search_parents(
    db: AsyncSession,
    search_query: str | None = None,
    email: str | None = None,
    phone: str | None = None,
    relation_to_student: str | None = None,
    skip: int = 0,
    limit: int = 10,
):
    filters = []

    if search_query:
        filters.append(
            or_(
                Parent.name.ilike(f"%{search_query}%"),
                Parent.email.ilike(f"%{search_query}%"),
                Parent.phone.ilike(f"%{search_query}%"),
            )
        )

    if email:
        filters.append(Parent.email.ilike(f"%{email}%"))

    if phone:
        filters.append(Parent.phone.ilike(f"%{phone}%"))

    if relation_to_student:
        filters.append(Parent.relation_to_student == relation_to_student)

    stmt = select(Parent).options(selectinload(Parent.student_links).selectinload(StudentParentLink.student))

    if filters:
        stmt = stmt.where(and_(*filters))

    count_stmt = select(func.count(Parent.id))
    if filters:
        count_stmt = count_stmt.where(and_(*filters))

    count_result = await db.execute(count_stmt)
    total_count = count_result.scalar()

    stmt = stmt.offset(skip).limit(limit).order_by(Parent.name)

    result = await db.execute(stmt)
    parents = result.scalars().all()

    has_next = (skip + limit) < total_count

    return {"items": parents, "total_count": total_count, "has_next": has_next, "skip": skip, "limit": limit}


async def update_parent(parent_id: UUID, parent_data: ParentUpdate, db: AsyncSession) -> Parent:
    result = await db.execute(select(Parent).where(Parent.id == parent_id))
    parent = result.scalar_one_or_none()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent not found")
    for key, value in parent_data.dict(exclude_unset=True).items():
        setattr(parent, key, value)
    try:
        await db.commit()
        # Reload parent with student_links eagerly loaded
        result = await db.execute(
            select(Parent)
            .options(selectinload(Parent.student_links).selectinload(StudentParentLink.student))
            .where(Parent.id == parent_id)
        )
        return result.scalar_one()
    except Exception as e:
        await db.rollback()
        logger.error("Unhandled error: %s", e)
        raise HTTPException(status_code=500, detail="Error updating parent")


async def delete_parent(parent_id: UUID, db: AsyncSession):
    result = await db.execute(select(Parent).where(Parent.id == parent_id))
    parent = result.scalar_one_or_none()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent not found")
    try:
        await db.delete(parent)
        await db.commit()
        return {"detail": "Parent deleted successfully"}
    except Exception as e:
        await db.rollback()
        logger.error("Unhandled error: %s", e)
        raise HTTPException(status_code=500, detail="Error deleting parent")
