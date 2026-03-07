"""
Template CRUD service (FR-101 to FR-106).
Services do NOT commit — caller (endpoint) commits.
"""
import uuid
from typing import List, Optional
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.communication.communication_model import MessageTemplate
from app.schemas.communication.communication_schema import TemplateCreate, TemplateUpdate


async def create_template(db: AsyncSession, data: TemplateCreate) -> MessageTemplate:
    # FR-101: duplicate (name, channel) → 400
    existing = await db.execute(
        select(MessageTemplate).where(
            MessageTemplate.name == data.name,
            MessageTemplate.channel == data.channel.value,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail=f"Template with name '{data.name}' already exists for channel '{data.channel.value}'.",
        )

    template = MessageTemplate(
        id=uuid.uuid4(),
        name=data.name,
        channel=data.channel.value,
        body=data.body,
        subject=data.subject,
        variables=data.variables or [],
        is_active=True,
    )
    db.add(template)
    await db.flush()
    return template


async def list_templates(
    db: AsyncSession,
    channel: Optional[str] = None,
    is_active: Optional[bool] = None,
) -> List[MessageTemplate]:
    query = select(MessageTemplate)
    if channel is not None:
        query = query.where(MessageTemplate.channel == channel)
    if is_active is not None:
        query = query.where(MessageTemplate.is_active == is_active)
    query = query.order_by(MessageTemplate.name)
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_template(db: AsyncSession, template_id: UUID) -> MessageTemplate:
    result = await db.execute(
        select(MessageTemplate).where(MessageTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found.")
    return template


async def update_template(
    db: AsyncSession, template_id: UUID, data: TemplateUpdate
) -> MessageTemplate:
    template = await get_template(db, template_id)
    if data.name is not None:
        template.name = data.name
    if data.body is not None:
        template.body = data.body
        template.variables = data.variables or []
    if data.subject is not None:
        template.subject = data.subject
    if data.is_active is not None:
        template.is_active = data.is_active
    await db.flush()
    return template


async def deactivate_template(db: AsyncSession, template_id: UUID) -> MessageTemplate:
    """FR-105: soft delete — set is_active=False, never permanently removes."""
    template = await get_template(db, template_id)
    template.is_active = False
    await db.flush()
    return template
