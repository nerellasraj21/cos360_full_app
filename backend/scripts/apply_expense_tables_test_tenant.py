"""
Migration script: Create all expense module tables in test_tenant_schema.
Also adds the academic_year_id column to expense_transactions if it doesn't exist.

Usage:
    python scripts/apply_expense_tables_test_tenant.py
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

        # 1. expense_categories
        await db.execute(text("""
            CREATE TABLE IF NOT EXISTS expense_categories (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(100) NOT NULL,
                description VARCHAR(300),
                is_active BOOLEAN DEFAULT TRUE,
                org_id UUID NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP NOT NULL DEFAULT NOW()
            )
        """))
        print("[OK] expense_categories ensured")

        # 2. expense_types
        await db.execute(text("""
            CREATE TABLE IF NOT EXISTS expense_types (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                org_id UUID NOT NULL,
                name VARCHAR(100) NOT NULL,
                category_id UUID NOT NULL REFERENCES expense_categories(id) ON DELETE CASCADE,
                description VARCHAR(300),
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP NOT NULL DEFAULT NOW()
            )
        """))
        await db.execute(text("CREATE INDEX IF NOT EXISTS ix_expense_types_category_id ON expense_types(category_id)"))
        await db.execute(text("CREATE INDEX IF NOT EXISTS ix_expense_types_org_id ON expense_types(org_id)"))
        print("[OK] expense_types ensured")

        # 3. expense_transactions
        await db.execute(text("""
            CREATE TABLE IF NOT EXISTS expense_transactions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                org_id UUID NOT NULL,
                expense_type_id UUID NOT NULL REFERENCES expense_types(id) ON DELETE RESTRICT,
                amount NUMERIC(10,2) NOT NULL,
                transaction_date DATE NOT NULL,
                description VARCHAR(500) NOT NULL,
                reference_number VARCHAR(100),
                idempotency_key VARCHAR(100) NOT NULL,
                payment_method VARCHAR(20) NOT NULL,
                vendor_name VARCHAR(200),
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                requires_approval BOOLEAN DEFAULT FALSE,
                requires_approval_override BOOLEAN,
                approved_by_user_id UUID,
                approved_by_role VARCHAR(50),
                approved_at TIMESTAMP,
                approval_comment VARCHAR(500),
                academic_year_id UUID REFERENCES academic_years(id) ON DELETE SET NULL,
                department_id UUID,
                version INTEGER NOT NULL DEFAULT 1,
                created_by_user_id UUID NOT NULL,
                created_by_role VARCHAR(50) NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
                CONSTRAINT uq_expense_transaction_idempotency UNIQUE (idempotency_key)
            )
        """))
        await db.execute(text("CREATE INDEX IF NOT EXISTS ix_expense_transactions_expense_type_id ON expense_transactions(expense_type_id)"))
        await db.execute(text("CREATE INDEX IF NOT EXISTS ix_expense_transactions_transaction_date ON expense_transactions(transaction_date)"))
        await db.execute(text("CREATE INDEX IF NOT EXISTS ix_expense_transactions_status ON expense_transactions(status)"))
        await db.execute(text("CREATE INDEX IF NOT EXISTS ix_expense_transactions_org_id ON expense_transactions(org_id)"))
        await db.execute(text("CREATE INDEX IF NOT EXISTS ix_expense_transactions_vendor_name ON expense_transactions(vendor_name)"))
        print("[OK] expense_transactions ensured")

        # 4. Add academic_year_id if table existed before this migration, then index it
        await db.execute(text(f"""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = '{SCHEMA}'
                      AND table_name = 'expense_transactions'
                      AND column_name = 'academic_year_id'
                ) THEN
                    ALTER TABLE expense_transactions
                        ADD COLUMN academic_year_id UUID;
                END IF;
            END $$
        """))
        await db.execute(text("CREATE INDEX IF NOT EXISTS ix_expense_transactions_academic_year_id ON expense_transactions(academic_year_id)"))
        print("[OK] academic_year_id column ensured on expense_transactions")

        # 5. expense_transaction_items
        await db.execute(text("""
            CREATE TABLE IF NOT EXISTS expense_transaction_items (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                org_id UUID NOT NULL,
                transaction_id UUID NOT NULL REFERENCES expense_transactions(id) ON DELETE CASCADE,
                item_name VARCHAR(200) NOT NULL,
                item_description TEXT,
                unit_price NUMERIC(10,2) NOT NULL,
                quantity NUMERIC(8,2) NOT NULL DEFAULT 1,
                total_price NUMERIC(10,2) NOT NULL,
                item_category VARCHAR(100),
                tax_rate NUMERIC(5,2) DEFAULT 0,
                tax_amount NUMERIC(10,2) DEFAULT 0,
                discount_rate NUMERIC(5,2) DEFAULT 0,
                discount_amount NUMERIC(10,2) DEFAULT 0,
                final_amount NUMERIC(10,2) NOT NULL,
                vendor_item_code VARCHAR(100),
                vendor_item_reference VARCHAR(100),
                created_by_user_id UUID NOT NULL,
                created_by_role VARCHAR(50) NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP NOT NULL DEFAULT NOW()
            )
        """))
        await db.execute(text("CREATE INDEX IF NOT EXISTS ix_expense_transaction_items_transaction_id ON expense_transaction_items(transaction_id)"))
        print("[OK] expense_transaction_items ensured")

        # 6. expense_attachments
        await db.execute(text("""
            CREATE TABLE IF NOT EXISTS expense_attachments (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                org_id UUID NOT NULL,
                transaction_id UUID NOT NULL REFERENCES expense_transactions(id) ON DELETE CASCADE,
                original_filename VARCHAR(255) NOT NULL,
                stored_filename VARCHAR(255) NOT NULL,
                file_path VARCHAR(500) NOT NULL,
                file_size BIGINT NOT NULL,
                mime_type VARCHAR(100) NOT NULL,
                file_extension VARCHAR(20) NOT NULL,
                file_hash_sha256 VARCHAR(64) NOT NULL,
                document_type VARCHAR(50) NOT NULL DEFAULT 'receipt',
                virus_scan_status VARCHAR(20) NOT NULL DEFAULT 'pending',
                virus_scan_result VARCHAR(100),
                virus_scanned_at TIMESTAMP,
                is_public BOOLEAN DEFAULT FALSE,
                is_encrypted BOOLEAN DEFAULT FALSE,
                encryption_key_id VARCHAR(100),
                is_verified BOOLEAN DEFAULT FALSE,
                verified_by_user_id UUID,
                verified_at TIMESTAMP,
                verification_notes VARCHAR(500),
                retention_period_months INTEGER DEFAULT 84,
                is_archived BOOLEAN DEFAULT FALSE,
                archived_at TIMESTAMP,
                can_be_deleted BOOLEAN DEFAULT TRUE,
                last_accessed_at TIMESTAMP,
                access_count INTEGER DEFAULT 0,
                department_id UUID,
                uploaded_by_user_id UUID NOT NULL,
                uploaded_by_role VARCHAR(50) NOT NULL,
                uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP NOT NULL DEFAULT NOW()
            )
        """))
        await db.execute(text("CREATE INDEX IF NOT EXISTS ix_expense_attachments_transaction_id ON expense_attachments(transaction_id)"))
        print("[OK] expense_attachments ensured")

        # 7. expense_audit_logs
        await db.execute(text("""
            CREATE TABLE IF NOT EXISTS expense_audit_logs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                transaction_id UUID NOT NULL REFERENCES expense_transactions(id) ON DELETE CASCADE,
                action VARCHAR(50) NOT NULL,
                action_category VARCHAR(50) NOT NULL,
                field_name VARCHAR(100),
                old_value TEXT,
                new_value TEXT,
                full_record_before JSONB,
                full_record_after JSONB,
                action_reason VARCHAR(500),
                action_notes VARCHAR(500),
                request_ip_address VARCHAR(50),
                request_user_agent VARCHAR(500),
                request_session_id VARCHAR(100),
                api_endpoint VARCHAR(200),
                http_method VARCHAR(10),
                request_id VARCHAR(100),
                workflow_stage VARCHAR(50),
                compliance_flags JSONB,
                department_id UUID,
                org_id UUID NOT NULL,
                actor_user_id UUID NOT NULL,
                actor_role VARCHAR(50) NOT NULL,
                actor_username VARCHAR(100) NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT NOW()
            )
        """))
        await db.execute(text("CREATE INDEX IF NOT EXISTS ix_expense_audit_logs_transaction_id ON expense_audit_logs(transaction_id)"))
        await db.execute(text("CREATE INDEX IF NOT EXISTS ix_expense_audit_logs_actor_user_id ON expense_audit_logs(actor_user_id)"))
        print("[OK] expense_audit_logs ensured")

        # 8. expense_settings
        await db.execute(text("""
            CREATE TABLE IF NOT EXISTS expense_settings (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                org_id UUID NOT NULL,
                setting_key VARCHAR(100) NOT NULL,
                setting_name VARCHAR(200) NOT NULL,
                setting_description VARCHAR(500),
                setting_category VARCHAR(50) NOT NULL DEFAULT 'approval',
                string_value TEXT,
                numeric_value NUMERIC(15,4),
                integer_value INTEGER,
                boolean_value BOOLEAN,
                json_value JSONB,
                department_id UUID,
                applies_to_all_departments BOOLEAN DEFAULT TRUE,
                default_value TEXT,
                is_system_setting BOOLEAN DEFAULT FALSE,
                is_user_configurable BOOLEAN DEFAULT TRUE,
                validation_rules JSONB,
                allowed_values JSONB,
                requires_approval BOOLEAN DEFAULT FALSE,
                approval_threshold NUMERIC(15,4),
                is_audit_required BOOLEAN DEFAULT FALSE,
                is_sensitive BOOLEAN DEFAULT FALSE,
                compliance_level VARCHAR(20) DEFAULT 'standard',
                version INTEGER NOT NULL DEFAULT 1,
                is_active BOOLEAN DEFAULT TRUE,
                effective_from DATE,
                effective_until DATE,
                created_by_user_id UUID NOT NULL,
                created_by_role VARCHAR(50) NOT NULL,
                last_modified_by_user_id UUID,
                last_modified_by_role VARCHAR(50),
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
                CONSTRAINT uq_expense_settings_key_dept UNIQUE (setting_key, department_id)
            )
        """))
        await db.execute(text("CREATE INDEX IF NOT EXISTS ix_expense_settings_org_id ON expense_settings(org_id)"))
        print("[OK] expense_settings ensured")

        await db.commit()
        print(f"\n[DONE] All expense tables ensured in schema: {SCHEMA}")


if __name__ == "__main__":
    asyncio.run(run())
