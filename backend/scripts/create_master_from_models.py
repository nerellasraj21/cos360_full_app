"""
Create cos360_master schema directly from SQLAlchemy models
This bypasses problematic migrations and creates clean structure
"""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import os
import sys
from pathlib import Path

# Add project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from dotenv import load_dotenv
load_dotenv()

# Import all models to ensure they're registered with metadata
from app.db.base import BaseOrg
from app.models.auth import user_model, role_model, resource_permission_model
from app.models.masters import academic_year_model, class_model, section_model, subject_model, staff_model
from app.models.student import student_model, student_admission_model, student_parent_model
from app.models.fee import (
    fee_category_model, fee_type_model, fee_term_model, fee_term_date_model,
    fee_class_mapping_model, fee_class_map_term_amount_model,
    fee_student_mapping_model, fee_student_map_term_amount_model,
    fee_transaction_model, fee_transaction_item_model,
    fee_receipt_model, fee_refund_model
)
from app.models.transport import vehicle_model, route_model, route_stop_model, trip_model
from app.models.exam import exam_model
from app.models.expense import expense_category_model, expense_type_model, expense_transaction_model

async def create_schema_from_models():
    """Create all tables in cos360_master from SQLAlchemy models"""

    database_url = os.getenv('DATABASE_URL')

    print("=" * 70)
    print("CREATING cos360_master FROM MODELS")
    print("=" * 70)
    print()

    # Create async engine
    engine = create_async_engine(database_url, echo=False)

    try:
        async with engine.begin() as conn:
            # Set schema for this session
            await conn.execute(text("SET search_path TO cos360_master"))

            print("Step 1: Creating all tables from BaseOrg metadata...")

            # Create all tables from metadata
            await conn.run_sync(BaseOrg.metadata.create_all)

            print("  Tables created successfully")
            print()

            # Verify
            print("Step 2: Verifying table creation...")
            result = await conn.execute(text("""
                SELECT COUNT(*) FROM information_schema.tables
                WHERE table_schema = 'cos360_master'
            """))
            count = result.scalar()
            print(f"  Tables in cos360_master: {count}")
            print()

            # Create alembic_version table
            print("Step 3: Creating alembic_version table...")
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS alembic_version (
                    version_num VARCHAR(32) NOT NULL,
                    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
                )
            """))
            print("  alembic_version table created")
            print()

        print("=" * 70)
        print("SUCCESS: Schema created from models")
        print("=" * 70)
        print()
        print("Next steps:")
        print("1. Run: export SCHEMA_NAME=cos360_master")
        print("2. Run: alembic stamp head")
        print("3. Verify: alembic current")
        print()

    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(create_schema_from_models())
