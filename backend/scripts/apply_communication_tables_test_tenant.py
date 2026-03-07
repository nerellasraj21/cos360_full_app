"""
Migration script: Create communication tables (message_templates, notification_queue,
notification_log) in test_tenant_schema.

Usage:
    python scripts/apply_communication_tables_test_tenant.py
"""

import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv

load_dotenv()

from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.config import settings

SCHEMA = "test_tenant_schema"


async def run():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(bind=engine, expire_on_commit=False)

    async with Session() as db:
        await db.execute(text(f"SET search_path TO {SCHEMA}, public"))

        # ── Create enum types (idempotent) ────────────────────────────────────
        await db.execute(text(f"""
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'channelenum'
                               AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = '{SCHEMA}')) THEN
                    CREATE TYPE channelenum AS ENUM ('sms', 'whatsapp', 'email');
                END IF;
            END $$;
        """))
        print("[OK] channelenum")

        await db.execute(text(f"""
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'queuestatusenum'
                               AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = '{SCHEMA}')) THEN
                    CREATE TYPE queuestatusenum AS ENUM ('queued', 'processing', 'done', 'failed');
                END IF;
            END $$;
        """))
        print("[OK] queuestatusenum")

        await db.execute(text(f"""
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'logstatusenum'
                               AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = '{SCHEMA}')) THEN
                    CREATE TYPE logstatusenum AS ENUM ('queued', 'sent', 'delivered', 'failed');
                END IF;
            END $$;
        """))
        print("[OK] logstatusenum")

        # ── message_templates ─────────────────────────────────────────────────
        await db.execute(text(f"""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_schema = '{SCHEMA}' AND table_name = 'message_templates'
                ) THEN
                    CREATE TABLE message_templates (
                        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        name        VARCHAR(200) NOT NULL,
                        channel     channelenum NOT NULL,
                        body        TEXT NOT NULL,
                        subject     VARCHAR(500),
                        variables   JSON,
                        is_active   BOOLEAN NOT NULL DEFAULT TRUE,
                        created_at  TIMESTAMP NOT NULL DEFAULT now(),
                        updated_at  TIMESTAMP NOT NULL DEFAULT now(),
                        CONSTRAINT uq_template_name_channel UNIQUE (name, channel)
                    );
                    CREATE UNIQUE INDEX ix_message_templates_id ON message_templates (id);
                END IF;
            END $$;
        """))
        print("[OK] message_templates")

        # ── notification_queue ────────────────────────────────────────────────
        await db.execute(text(f"""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_schema = '{SCHEMA}' AND table_name = 'notification_queue'
                ) THEN
                    CREATE TABLE notification_queue (
                        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        template_id       UUID NOT NULL REFERENCES message_templates(id),
                        recipient_name    VARCHAR(200),
                        recipient_phone   VARCHAR(20),
                        recipient_email   VARCHAR(200),
                        channel           channelenum NOT NULL,
                        rendered_message  TEXT NOT NULL,
                        status            queuestatusenum NOT NULL DEFAULT 'queued',
                        triggered_by      UUID NOT NULL,
                        target_type       VARCHAR(50) NOT NULL,
                        target_ref        JSON,
                        created_at        TIMESTAMP NOT NULL DEFAULT now()
                    );
                    CREATE UNIQUE INDEX ix_notification_queue_id ON notification_queue (id);
                    CREATE INDEX ix_notification_queue_status ON notification_queue (status);
                    CREATE INDEX ix_notification_queue_created_at ON notification_queue (created_at);
                END IF;
            END $$;
        """))
        print("[OK] notification_queue")

        # ── notification_log ──────────────────────────────────────────────────
        await db.execute(text(f"""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_schema = '{SCHEMA}' AND table_name = 'notification_log'
                ) THEN
                    CREATE TABLE notification_log (
                        id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        template_id           UUID REFERENCES message_templates(id),
                        recipient_name        VARCHAR(200),
                        recipient_phone       VARCHAR(20),
                        recipient_email       VARCHAR(200),
                        channel               channelenum NOT NULL,
                        message               TEXT NOT NULL,
                        status                logstatusenum NOT NULL,
                        provider_message_id   VARCHAR(200),
                        error_message         TEXT,
                        triggered_by          UUID NOT NULL,
                        target_type           VARCHAR(50) NOT NULL,
                        target_ref            JSON,
                        created_at            TIMESTAMP NOT NULL DEFAULT now()
                    );
                    CREATE UNIQUE INDEX ix_notification_log_id ON notification_log (id);
                    CREATE INDEX ix_notification_log_status ON notification_log (status);
                    CREATE INDEX ix_notification_log_channel ON notification_log (channel);
                    CREATE INDEX ix_notification_log_created_at ON notification_log (created_at);
                END IF;
            END $$;
        """))
        print("[OK] notification_log")

        await db.commit()
        print()
        print(f"=== Communication tables applied to {SCHEMA} ===")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run())
