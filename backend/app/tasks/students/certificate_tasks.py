"""
Celery Tasks for Student Certificate Module

Handles background jobs including stale file cleanup.
"""

import asyncio
import logging
from datetime import datetime

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from app.celery_app import celery_app
from app.config import settings
from app.service.student.file_manager import file_manager

log = logging.getLogger("students.certificate_tasks")


@celery_app.task(name="cleanup_stale_files", time_limit=300, soft_time_limit=240)
def cleanup_stale_files():
    """
    Daily cleanup of expired stale file registry entries across all tenants.

    Runs at 2 AM UTC daily. Deletes S3 objects and DB records for expired files.
    Task is idempotent: S3 NoSuchKey errors are caught and logged (non-critical).
    """
    asyncio.run(_cleanup_stale_files_async())


async def _cleanup_stale_files_async():
    """Async implementation of stale file cleanup"""
    try:
        log.info("Starting stale file cleanup task")

        engine = create_async_engine(settings.DATABASE_URL, echo=False)
        Session = async_sessionmaker(bind=engine, expire_on_commit=False)

        # 1. Get all active tenant schemas from public.tenants
        async with Session() as db:
            await db.execute(text("SET search_path TO public"))

            result = await db.execute(
                text(
                    """
                    SELECT schema_name FROM tenants WHERE is_active = TRUE
                    """
                )
            )
            schemas = [row[0] for row in result.fetchall()]

        log.info(f"Found {len(schemas)} active tenant schemas")

        # 2. For each schema, cleanup expired stale files
        total_deleted = 0
        for schema_name in schemas:
            try:
                deleted_count = await _cleanup_schema_stale_files(
                    Session, schema_name
                )
                total_deleted += deleted_count
            except Exception as e:
                log.error(f"Error cleaning up schema {schema_name}: {str(e)}")
                continue

        log.info(f"Stale file cleanup complete. Total files deleted: {total_deleted}")

        await engine.dispose()

    except Exception as e:
        log.error(f"Error in stale file cleanup task: {str(e)}", exc_info=True)
        raise


async def _cleanup_schema_stale_files(
    Session: async_sessionmaker, schema_name: str
) -> int:
    """
    Cleanup stale files for a specific tenant schema.

    Args:
        Session: AsyncSession maker
        schema_name: Tenant schema name

    Returns:
        Count of deleted files
    """
    deleted_count = 0

    async with Session() as db:
        # Set schema search path
        await db.execute(text(f"SET search_path TO {schema_name}, public"))

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
            f"Found {len(expired_files)} expired stale files in {schema_name}"
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
