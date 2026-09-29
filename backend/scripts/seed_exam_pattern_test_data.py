"""
Seed test data for the exam pattern copy system.

Creates:
  1. An exam "Pattern Test Exam" with class 77 A + class 77 B + class 12 A
  2. Subject configs + components for class 77 A (6 subjects)
  3. No configs for class 77 B or class 12 A (so you can test copy/apply)

This gives you:
  - Copy pattern: class 77 A -> class 77 B (100% overlap, 6 subjects)
  - Copy pattern: class 77 A -> class 12 A (partial overlap, tests skip_missing)
  - Save template from class 77 A configs
  - Auto-detect when adding new class section

Usage:
    python scripts/seed_exam_pattern_test_data.py
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
ADMIN_USER_ID = "f8bf9cc9-8d5f-4aeb-bd6f-87695f8d75c3"
ACADEMIC_YEAR_ID = "bb30dcea-194c-4f71-8343-80edc5ebcc74"  # 2025-26

# class 77
CLASS_77_ID = "e0426200-f974-42d9-8642-2d920bb4ced8"
SECTION_A_77 = "7a4aa8bb-d77b-4cc3-9270-b9082e981887"  # class 77 -> A
SECTION_B_77 = "d42ddec0-dea4-4b3e-8f05-9baf7f5e886e"  # class 77 -> B

# class 12
CLASS_12_ID = "24887ce8-eb6a-43d2-98f9-7067bfc42175"
SECTION_A_12 = "6163c89b-c290-4938-be1b-77d2036b907f"  # class 12 -> A

# Subjects mapped to class 77 A (all 6)
SUBJECTS_77A = [
    ("d85f2ce0-83aa-49fb-b60f-32350be415d2", "C Language"),
    ("2ed92d20-bb33-41ec-8226-dbea324f3175", "Digital Electronics"),
    ("ef6cdec1-69f1-4123-b0bb-bafb3d3bfdb0", "SCIENCE"),
    ("cbb0baf6-dcbb-47cf-a09c-799404952611", "Social"),
    ("a200f8db-6964-40dc-81fd-3117db81d3d8", "english"),
    ("9b392fdf-be02-4f03-8a8e-1711da4829ad", "python"),
]

EXAM_NAME = "Pattern Test Exam"


async def run():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(bind=engine, expire_on_commit=False)

    async with Session() as db:
        await db.execute(text(f"SET search_path TO {SCHEMA}, public"))

        # Check if exam already exists
        existing = await db.execute(
            text("SELECT id FROM exams WHERE exam_name = :name AND academic_year_id = :ay"),
            {"name": EXAM_NAME, "ay": ACADEMIC_YEAR_ID},
        )
        row = existing.scalar_one_or_none()
        if row:
            print(f"[SKIP] Exam '{EXAM_NAME}' already exists: {row}")
            print("  Delete it manually if you want to re-seed.")
            await engine.dispose()
            return

        # 1. Create exam
        exam_id = str(uuid.uuid4())
        await db.execute(
            text("""
                INSERT INTO exams (id, exam_name, board, level, exam_type, nature,
                    is_internal, academic_year_id, status, created_by, created_at, updated_at)
                VALUES (:id, :name, 'CBSE', 'school', 'written', 'formative',
                    true, :ay, 'active', :user, now(), now())
            """),
            {"id": exam_id, "name": EXAM_NAME, "ay": ACADEMIC_YEAR_ID, "user": ADMIN_USER_ID},
        )
        print(f"[OK] Exam created: {exam_id}")

        # 2. Create class sections: class 77 A, class 77 B, class 12 A
        sections = [
            (CLASS_77_ID, SECTION_A_77, "class 77 / A"),
            (CLASS_77_ID, SECTION_B_77, "class 77 / B"),
            (CLASS_12_ID, SECTION_A_12, "class 12 / A"),
        ]
        for cls_id, sec_id, label in sections:
            cs_id = str(uuid.uuid4())
            await db.execute(
                text("""
                    INSERT INTO exam_class_sections (id, exam_id, class_id, section_id, created_at)
                    VALUES (:id, :exam, :cls, :sec, now())
                """),
                {"id": cs_id, "exam": exam_id, "cls": cls_id, "sec": sec_id},
            )
            print(f"[OK] Class section: {label}")

        # 3. Create subject configs for class 77 A ONLY (with components)
        for idx, (subj_id, subj_name) in enumerate(SUBJECTS_77A):
            cfg_id = str(uuid.uuid4())
            await db.execute(
                text("""
                    INSERT INTO exam_subject_config
                        (id, exam_id, class_id, section_id, subject_id,
                         has_internal_external_split, internal_max_marks, internal_min_pass,
                         external_max_marks, external_min_pass, sort_order, created_at, updated_at)
                    VALUES
                        (:id, :exam, :cls, :sec, :subj,
                         true, 25, 8, 75, 26, :sort, now(), now())
                """),
                {
                    "id": cfg_id, "exam": exam_id,
                    "cls": CLASS_77_ID, "sec": SECTION_A_77,
                    "subj": subj_id, "sort": idx + 1,
                },
            )

            # Component 1: Theory (external)
            comp1_id = str(uuid.uuid4())
            await db.execute(
                text("""
                    INSERT INTO exam_subject_components
                        (id, subject_config_id, component_name, entry_type,
                         max_marks, min_pass_marks, include_in_total, is_internal, sort_order)
                    VALUES
                        (:id, :cfg, 'Theory', 'marks', 75, 26, true, false, 1)
                """),
                {"id": comp1_id, "cfg": cfg_id},
            )

            # Component 2: Internal Assessment
            comp2_id = str(uuid.uuid4())
            await db.execute(
                text("""
                    INSERT INTO exam_subject_components
                        (id, subject_config_id, component_name, entry_type,
                         max_marks, min_pass_marks, include_in_total, is_internal, sort_order)
                    VALUES
                        (:id, :cfg, 'Internal Assessment', 'marks', 25, 8, true, true, 2)
                """),
                {"id": comp2_id, "cfg": cfg_id},
            )

            print(f"[OK] Subject config + 2 components: {subj_name}")

        await db.commit()

        print()
        print(f"=== Exam pattern test data seeded ===")
        print(f"  Exam: {EXAM_NAME} ({exam_id})")
        print(f"  Class sections: class 77/A (has 6 configs), class 77/B (empty), class 12/A (empty)")
        print()
        print("Test scenarios:")
        print("  1. Copy: class 77/A -> class 77/B (all 6 subjects match)")
        print("  2. Compare: class 77/A vs class 12/A (partial overlap)")
        print("  3. Save template from class 77/A configs")
        print("  4. Auto-detect on class 77/B or class 12/A")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run())
