"""
Celery Tasks for Student Certificate Module

Handles background jobs including stale file cleanup.
"""

import asyncio
import logging

from sqlalchemy import text

from app.celery_app import celery_app
from app.service.student.file_manager import file_manager
from app.tasks.tenant_context import task_platform_session, task_tenant_session

log = logging.getLogger("students.certificate_tasks")


@celery_app.task(name="cleanup_stale_files", time_limit=300, soft_time_limit=240)
def cleanup_stale_files():
    """
    Daily cleanup of expired stale file registry entries across all tenants (one tenant session per tenant).

    Runs at 2 AM UTC daily. Deletes S3 objects and DB records for expired files.
    Task is idempotent: S3 NoSuchKey errors are caught and logged (non-critical).
    """
    asyncio.run(_cleanup_stale_files_async())


async def _cleanup_stale_files_async():
    """Async implementation of stale file cleanup"""
    try:
        log.info("Starting stale file cleanup task")

        async with task_platform_session() as db:
            result = await db.execute(text("SELECT id FROM tenants WHERE is_active = TRUE"))
            tenant_ids = [str(row[0]) for row in result.fetchall()]

        log.info(f"Found {len(tenant_ids)} active tenants")

        total_deleted = 0
        for tenant_id in tenant_ids:
            try:
                deleted_count = await _cleanup_tenant_stale_files(tenant_id)
                total_deleted += deleted_count
            except Exception as e:
                log.error(f"Error cleaning up tenant {tenant_id}: {str(e)}")
                continue

        log.info(f"Stale file cleanup complete. Total files deleted: {total_deleted}")

    except Exception as e:
        log.error(f"Error in stale file cleanup task: {str(e)}", exc_info=True)
        raise


async def _cleanup_tenant_stale_files(tenant_id: str) -> int:
    """
    Cleanup stale files for a specific tenant.

    Args:
        tenant_id: Tenant id

    Returns:
        Count of deleted files
    """
    deleted_count = 0

    async with task_tenant_session(tenant_id) as db:
        # Query expired stale files
        result = await db.execute(
            text(
                """
                SELECT id, s3_key FROM stale_file_registry
                WHERE expires_at < NOW()
                LIMIT 100
                """
            )
        )
        expired_files = result.fetchall()

        log.info(
            f"Found {len(expired_files)} expired stale files for tenant {tenant_id}"
        )

        # For each expired file, delete from S3 and DB
        for file_id, s3_key in expired_files:
            try:
                # Delete from S3
                await file_manager.delete_from_s3(s3_key)

                # Delete from DB
                await db.execute(
                    text(
                        """
                        DELETE FROM stale_file_registry WHERE id = :file_id
                        """
                    ),
                    {"file_id": str(file_id)},
                )

                deleted_count += 1
                log.debug(f"Deleted stale file: {s3_key}")

            except Exception as e:
                log.warning(
                    f"Error deleting stale file {s3_key} (may already be gone): {str(e)}"
                )
                # Try to clean up DB record anyway
                try:
                    await db.execute(
                        text(
                            """
                            DELETE FROM stale_file_registry WHERE id = :file_id
                            """
                        ),
                        {"file_id": str(file_id)},
                    )
                except Exception as db_error:
                    log.error(
                        f"Error deleting stale file registry record: {str(db_error)}"
                    )

        await db.commit()

    return deleted_count
