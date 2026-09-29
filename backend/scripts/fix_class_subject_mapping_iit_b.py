"""
Fix missing class_subject_mappings for sections that share a class.

The problem: subjects are mapped to IIT A's section_id but not IIT B's.
The exam creation validator checks (class_id, section_id) exactly → 422.

This script:
  1. Finds all (class_id, academic_year_id) combos where some sections have
     mappings and others don't.
  2. Copies the missing rows so every active section in a class has the same
     subject set.

Usage:
    python scripts/fix_class_subject_mapping_iit_b.py
"""

import asyncio
import os
import sys
import uuid

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

        # ── Step 1: Show current state ─────────────────────────────────────────
        print("=== Current class_subject_mappings (active only) ===")
        rows = await db.execute(text("""
            SELECT
                c.name  AS class_name,
                s.name  AS section_name,
                sub.name AS subject_name,
                csm.section_id,
                csm.class_id,
                csm.subject_id,
                csm.academic_year_id,
                csm.exclude_marks,
                csm."order"
            FROM class_subject_mappings csm
            JOIN classes c ON c.id = csm.class_id
            LEFT JOIN sections s ON s.id = csm.section_id
            JOIN subjects sub ON sub.id = csm.subject_id
            WHERE csm.is_active = true
            ORDER BY c.name, s.name, sub.name
        """))
        existing = rows.fetchall()
        for r in existing:
            print(f"  {r.class_name} | {r.section_name} | {r.subject_name}")

        # ── Step 2: Find all active sections per class ─────────────────────────
        sections_result = await db.execute(text("""
            SELECT s.id AS section_id, s.class_id, c.name AS class_name, s.name AS section_name
            FROM sections s
            JOIN classes c ON c.id = s.class_id
            WHERE s.is_active = true
            ORDER BY c.name, s.name
        """))
        all_sections = sections_result.fetchall()

        # ── Step 3: Build set of ALL existing active rows (to avoid re-inserting) ──
        # We only skip rows that are already active; inactive rows will be
        # re-activated by the ON CONFLICT DO UPDATE in Step 5.
        all_rows_result = await db.execute(text("""
            SELECT class_id, section_id, subject_id, academic_year_id, is_active
            FROM class_subject_mappings
        """))
        existing_keys = {
            (str(r.class_id), str(r.section_id), str(r.subject_id), str(r.academic_year_id))
            for r in all_rows_result.fetchall()
            if r.is_active
        }

        # ── Step 4: For each class, collect the "reference" subject set ────────
        # Reference = union of all mapped subjects for that class (any section)
        # Group by (class_id, academic_year_id)
        from collections import defaultdict
        class_ay_subjects: dict[tuple, list] = defaultdict(list)
        for r in existing:
            key = (str(r.class_id), str(r.academic_year_id))
            class_ay_subjects[key].append(r)

        # ── Step 5: Insert missing rows ────────────────────────────────────────
        inserted = 0
        for section_row in all_sections:
            sid = str(section_row.section_id)
            cid = str(section_row.class_id)

            for (map_class_id, map_ay_id), subject_rows in class_ay_subjects.items():
                if map_class_id != cid:
                    continue

                for sr in subject_rows:
                    key = (cid, sid, str(sr.subject_id), map_ay_id)
                    if key not in existing_keys:
                        new_id = str(uuid.uuid4())
                        await db.execute(text("""
                            INSERT INTO class_subject_mappings
                                (id, class_id, section_id, subject_id, academic_year_id,
                                 exclude_marks, "order", is_active)
                            VALUES
                                (:id, :class_id, :section_id, :subject_id, :academic_year_id,
                                 :exclude_marks, :order, true)
                            ON CONFLICT (class_id, section_id, subject_id, academic_year_id)
                            DO UPDATE SET is_active = true
                        """), {
                            "id": new_id,
                            "class_id": cid,
                            "section_id": sid,
                            "subject_id": str(sr.subject_id),
                            "academic_year_id": map_ay_id,
                            "exclude_marks": sr.exclude_marks,
                            "order": sr.order,
                        })
                        print(
                            f"  [INSERT] {section_row.class_name} | "
                            f"{section_row.section_name} | {sr.subject_name}"
                        )
                        existing_keys.add(key)
                        inserted += 1

        if inserted == 0:
            print("\nNo missing mappings found — all sections already have the same subjects.")
        else:
            await db.commit()
            print(f"\n[DONE] Inserted {inserted} missing mapping(s).")


if __name__ == "__main__":
    asyncio.run(run())
