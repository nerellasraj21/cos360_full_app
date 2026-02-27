import logging
import uuid
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.exam.mark_permission_model import ExamMarkEntryPermission
from app.schemas.exam.mark_permission_schema import MarkPermissionCreate, MarkPermissionUpdate

log = logging.getLogger("exam.mark_permission_service")


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


async def _get_permission_or_404(perm_id: UUID, db: AsyncSession) -> ExamMarkEntryPermission:
    result = await db.execute(
        select(ExamMarkEntryPermission).where(ExamMarkEntryPermission.id == perm_id)
    )
    perm = result.scalar_one_or_none()
    if not perm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ExamMarkEntryPermission with id {perm_id} not found",
        )
    return perm


# ---------------------------------------------------------------------------
# Service functions
# ---------------------------------------------------------------------------


async def grant_permission(
    db: AsyncSession,
    exam_id: str,
    payload: MarkPermissionCreate,
    granted_by: UUID = None,
) -> ExamMarkEntryPermission:
    """
    Grant a user mark-entry permission for an exam.

    Business rules:
    - If an active permission already exists for (exam_id, user_id) → raise 409 Conflict.
    - If a permission exists but is_active=False → reactivate it instead of creating a duplicate.
    - Otherwise → create a new permission row.
    """
    try:
        # Check for any existing permission (active or inactive) for this combo
        existing_result = await db.execute(
            select(ExamMarkEntryPermission).where(
                ExamMarkEntryPermission.exam_id == exam_id,
                ExamMarkEntryPermission.user_id == payload.user_id,
            )
        )
        existing = existing_result.scalar_one_or_none()

        if existing is not None:
            if existing.is_active:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        "An active mark-entry permission already exists for this "
                        "user and exam combination."
                    ),
                )
            # Reactivate the existing (inactive) permission
            existing.is_active = True
            existing.granted_by = granted_by
            if payload.scope_note is not None:
                existing.scope_note = payload.scope_note
            await db.flush()
            return existing

        # No existing record — create a new permission
        perm = ExamMarkEntryPermission(
            id=uuid.uuid4(),
            exam_id=exam_id,
            user_id=payload.user_id,
            granted_by=granted_by,
            scope_note=payload.scope_note,
            is_active=True,
        )
        db.add(perm)
        await db.flush()
        return perm

    except HTTPException:
        raise
    except IntegrityError as e:
        await db.rollback()
        log.error("IntegrityError granting MarkPermission: %s", e)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Could not grant permission due to a data conflict.",
        )
    except Exception as e:
        await db.rollback()
        log.error("Error granting MarkPermission: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while granting mark-entry permission.",
        )


async def revoke_permission(db: AsyncSession, perm_id: UUID) -> None:
    """
    Soft-revoke a mark-entry permission by setting is_active=False.
    The row is retained for audit purposes.
    """
    try:
        perm = await _get_permission_or_404(perm_id, db)
        perm.is_active = False
        await db.flush()

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        log.error("Error revoking MarkPermission %s: %s", perm_id, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while revoking mark-entry permission.",
        )


async def list_permissions(
    db: AsyncSession,
    exam_id: UUID,
) -> list[ExamMarkEntryPermission]:
    """Return all permission rows (active and inactive) for the given exam."""
    try:
        result = await db.execute(
            select(ExamMarkEntryPermission)
            .where(ExamMarkEntryPermission.exam_id == exam_id)
            .order_by(ExamMarkEntryPermission.created_at)
        )
        return list(result.scalars().all())
    except Exception as e:
        log.error("Error listing MarkPermissions for exam %s: %s", exam_id, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while retrieving mark-entry permissions.",
        )


async def update_permission(
    db: AsyncSession,
    perm_id: UUID,
    payload: MarkPermissionUpdate,
) -> ExamMarkEntryPermission:
    """Update is_active and/or scope_note on an existing permission."""
    try:
        perm = await _get_permission_or_404(perm_id, db)

        perm.is_active = payload.is_active
        if payload.scope_note is not None:
            perm.scope_note = payload.scope_note

        await db.flush()
        return perm

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        log.error("Error updating MarkPermission %s: %s", perm_id, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while updating mark-entry permission.",
        )
