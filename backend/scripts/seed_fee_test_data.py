"""
Seed complete fee test data for test_tenant_schema.

Finds the first student with a valid admission (class + section),
then creates: fee term + dates, fee categories, fee types,
fee student mappings + term amounts.

Also ensures fee_concessions / fee_old tables exist.

Usage:
    python scripts/seed_fee_test_data.py
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

        # ── 1. Find or confirm academic year ─────────────────────────────
        ay_row = await db.execute(text(
            "SELECT id, title FROM academic_years WHERE is_active = true ORDER BY created_at DESC LIMIT 1"
        ))
        ay = ay_row.first()
        if not ay:
            print("[FAIL] No active academic year found. Cannot proceed.")
            return
        ay_id = ay.id
        ay_title = ay.title
        print(f"[OK] Academic year: {ay_title} (id={ay_id})")

        # ── 2. Find student with a valid admission ───────────────────────
        # Pick any student that has admission + class + section
        stu_row = await db.execute(text(
            "SELECT s.id AS student_id, s.first_name, s.last_name, "
            "       a.id AS admission_id, a.admission_number, "
            "       a.current_class_id, a.current_section_id "
            "FROM students s "
            "JOIN student_admissions a ON a.student_id = s.id "
            "WHERE a.current_class_id IS NOT NULL "
            "  AND a.current_section_id IS NOT NULL "
            "ORDER BY s.first_name "
            "LIMIT 1"
        ))
        student = stu_row.first()
        if not student:
            print("[FAIL] No student with a valid admission (class + section) found.")
            return
        student_id = student.student_id
        admission_number = student.admission_number
        class_id = student.current_class_id
        section_id = student.current_section_id
        print(f"[OK] Student: {student.first_name} {student.last_name} (id={student_id})")
        print(f"[OK] Admission: {admission_number}, class={class_id}, section={section_id}")

        # ── 4. Create Fee Term ────────────────────────────────────────────
        term_id = uuid.uuid4()
        existing_term = await db.execute(text(
            "SELECT id FROM fee_terms WHERE term_name = 'Annual' AND academic_year_id = :ay LIMIT 1"
        ), {"ay": ay_id})
        et = existing_term.scalar_one_or_none()
        if et:
            term_id = et
            print(f"[SKIP] Fee term 'Annual' already exists (id={term_id})")
        else:
            await db.execute(text("""
                INSERT INTO fee_terms (id, term_name, term_status, number_of_terms, academic_year_id, created_at, updated_at)
                VALUES (:id, 'Annual', 'active', 1, :ay, now(), now())
            """), {"id": term_id, "ay": ay_id})
            print(f"[OK] Fee term 'Annual' created (id={term_id})")

        # ── 5. Create Fee Term Date ───────────────────────────────────────
        term_date_id = uuid.uuid4()
        existing_td = await db.execute(text(
            "SELECT id FROM fee_term_dates WHERE term_id = :tid LIMIT 1"
        ), {"tid": term_id})
        etd = existing_td.scalar_one_or_none()
        if etd:
            term_date_id = etd
            print(f"[SKIP] Fee term date already exists (id={term_date_id})")
        else:
            await db.execute(text("""
                INSERT INTO fee_term_dates (id, term_id, fee_term_date, created_at, updated_at)
                VALUES (:id, :tid, '2026-03-31', now(), now())
            """), {"id": term_date_id, "tid": term_id})
            print(f"[OK] Fee term date created (id={term_date_id})")

        # ── 6. Create Fee Categories ─────────────────────────────────────
        categories = [
            ("Academic Fees", uuid.uuid4()),
            ("Transport Fees", uuid.uuid4()),
            ("Other Fees", uuid.uuid4()),
        ]
        category_ids = {}
        for cat_name, cat_id in categories:
            existing_cat = await db.execute(text(
                "SELECT id FROM fee_categories WHERE category_name = :name AND academic_year_id = :ay LIMIT 1"
            ), {"name": cat_name, "ay": ay_id})
            ec = existing_cat.scalar_one_or_none()
            if ec:
                category_ids[cat_name] = ec
                print(f"[SKIP] Category '{cat_name}' already exists (id={ec})")
            else:
                await db.execute(text("""
                    INSERT INTO fee_categories (id, category_name, category_status, academic_year_id, created_at, updated_at)
                    VALUES (:id, :name, 'active', :ay, now(), now())
                """), {"id": cat_id, "name": cat_name, "ay": ay_id})
                category_ids[cat_name] = cat_id
                print(f"[OK] Category '{cat_name}' created (id={cat_id})")

        # ── 7. Create Fee Types ───────────────────────────────────────────
        fee_types = [
            ("Tuition Fee", "Academic Fees", 10000),
            ("Bus / Transport", "Transport Fees", 2000),
            ("Uniform", "Other Fees", 1000),
            ("Books & Stationery", "Other Fees", 500),
            ("Lab Fee", "Academic Fees", 1500),
        ]
        fee_type_ids = {}
        for ft_name, cat_name, amount in fee_types:
            cat_id = category_ids[cat_name]
            existing_ft = await db.execute(text(
                "SELECT id FROM fee_types WHERE type_name = :name AND fee_category_id = :cid LIMIT 1"
            ), {"name": ft_name, "cid": cat_id})
            eft = existing_ft.scalar_one_or_none()
            if eft:
                fee_type_ids[ft_name] = (eft, amount)
                print(f"[SKIP] Fee type '{ft_name}' already exists (id={eft})")
            else:
                ft_id = uuid.uuid4()
                await db.execute(text("""
                    INSERT INTO fee_types (id, type_name, fee_category_id, fee_status, fee_term_id, academic_year_id, created_at, updated_at)
                    VALUES (:id, :name, :cid, 'active', :tid, :ay, now(), now())
                """), {"id": ft_id, "name": ft_name, "cid": cat_id, "tid": term_id, "ay": ay_id})
                fee_type_ids[ft_name] = (ft_id, amount)
                print(f"[OK] Fee type '{ft_name}' created (id={ft_id})")

        # ── 8. Create Fee Class Mappings + Term Amounts ──────────────────
        for ft_name, (ft_id, total_fee) in fee_type_ids.items():
            existing_cm = await db.execute(text(
                "SELECT id FROM fee_class_mappings "
                "WHERE class_id = :cid AND fee_type_id = :ftid AND academic_year_id = :ay LIMIT 1"
            ), {"cid": class_id, "ftid": ft_id, "ay": ay_id})
            ecm = existing_cm.scalar_one_or_none()
            if ecm:
                print(f"[SKIP] Class mapping for '{ft_name}' already exists (id={ecm})")
            else:
                cm_id = uuid.uuid4()
                await db.execute(text("""
                    INSERT INTO fee_class_mappings
                        (id, class_id, fee_type_id, total_fee, academic_year_id, all_by_default, created_at, updated_at)
                    VALUES
                        (:id, :cid, :ftid, :fee, :ay, true, now(), now())
                """), {"id": cm_id, "cid": class_id, "ftid": ft_id, "fee": total_fee, "ay": ay_id})
                ecm = cm_id
                print(f"[OK] Class mapping '{ft_name}' = Rs.{total_fee} (id={cm_id})")

            # Class mapping term amount
            existing_cmta = await db.execute(text(
                "SELECT id FROM fee_class_map_term_amounts WHERE fee_class_mapping_id = :mid LIMIT 1"
            ), {"mid": ecm})
            if existing_cmta.scalar_one_or_none():
                print(f"  [SKIP] Class term amount already exists")
            else:
                cmta_id = uuid.uuid4()
                await db.execute(text("""
                    INSERT INTO fee_class_map_term_amounts
                        (id, fee_class_mapping_id, term_id, term_amount, term_date_id, created_at, updated_at)
                    VALUES
                        (:id, :mid, :tid, :amount, :tdid, now(), now())
                """), {"id": cmta_id, "mid": ecm, "tid": term_id, "amount": total_fee, "tdid": term_date_id})
                print(f"  [OK] Class term amount: Rs.{total_fee}")

        # ── 9. Create Fee Student Mappings + Student Term Amounts ─────────
        for ft_name, (ft_id, total_fee) in fee_type_ids.items():
            existing_map = await db.execute(text(
                "SELECT id FROM fee_student_mappings "
                "WHERE student_id = :sid AND fee_type_id = :ftid AND academic_year_id = :ay LIMIT 1"
            ), {"sid": student_id, "ftid": ft_id, "ay": ay_id})
            em = existing_map.scalar_one_or_none()
            if em:
                print(f"[SKIP] Student mapping for '{ft_name}' already exists (id={em})")
                continue

            map_id = uuid.uuid4()
            await db.execute(text("""
                INSERT INTO fee_student_mappings
                    (id, student_id, student_admission_num, class_id, section_id,
                     fee_type_id, total_fee, academic_year_id, created_at, updated_at)
                VALUES
                    (:id, :sid, :adm, :cid, :secid, :ftid, :fee, :ay, now(), now())
            """), {
                "id": map_id, "sid": student_id, "adm": admission_number,
                "cid": class_id, "secid": section_id,
                "ftid": ft_id, "fee": total_fee, "ay": ay_id,
            })

            # Term amount (single term = full fee)
            ta_id = uuid.uuid4()
            await db.execute(text("""
                INSERT INTO fee_student_map_term_amounts
                    (id, fee_student_map_id, term_amount, term_id, term_date_id, created_at, updated_at)
                VALUES
                    (:id, :mid, :amount, :tid, :tdid, now(), now())
            """), {
                "id": ta_id, "mid": map_id, "amount": total_fee,
                "tid": term_id, "tdid": term_date_id,
            })
            print(f"[OK] Student mapping '{ft_name}' = Rs.{total_fee} (map={map_id})")

        # ── 10. Ensure fee_concessions + fee_old tables exist ─────────────
        await db.execute(text("""
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'concessionapproverenum') THEN
                    CREATE TYPE concessionapproverenum AS ENUM ('owner','principal','management','correspondent');
                END IF;
            END $$;
        """))
        await db.execute(text("""
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'oldfeesourceenum') THEN
                    CREATE TYPE oldfeesourceenum AS ENUM ('auto_carryforward','manual_entry');
                END IF;
            END $$;
        """))
        await db.execute(text(f"""
            DO $$ BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_schema = '{SCHEMA}' AND table_name = 'fee_concessions'
                ) THEN
                    CREATE TABLE fee_concessions (
                        id UUID PRIMARY KEY,
                        student_id UUID NOT NULL REFERENCES students(id),
                        student_admission_num VARCHAR(50) NOT NULL,
                        fee_type_id UUID NOT NULL REFERENCES fee_types(id),
                        fee_student_map_id UUID NOT NULL REFERENCES fee_student_mappings(id),
                        academic_year_id UUID NOT NULL REFERENCES academic_years(id),
                        assigned_fee NUMERIC(10,2) NOT NULL,
                        concession_amount NUMERIC(10,2) NOT NULL,
                        reason VARCHAR(500) NOT NULL,
                        approved_by concessionapproverenum NOT NULL,
                        approved_by_user_id UUID REFERENCES users(id),
                        recorded_by_user_id UUID NOT NULL REFERENCES users(id),
                        is_active BOOLEAN NOT NULL DEFAULT TRUE,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                        CONSTRAINT uq_concession_student_fee_year UNIQUE (student_id, fee_type_id, academic_year_id)
                    );
                END IF;
            END $$;
        """))
        await db.execute(text(f"""
            DO $$ BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_schema = '{SCHEMA}' AND table_name = 'fee_old'
                ) THEN
                    CREATE TABLE fee_old (
                        id UUID PRIMARY KEY,
                        student_id UUID NOT NULL REFERENCES students(id),
                        student_admission_num VARCHAR(50) NOT NULL,
                        academic_year_label VARCHAR(20) NOT NULL,
                        source_academic_year_id UUID REFERENCES academic_years(id),
                        fee_type_name VARCHAR(100) NOT NULL,
                        fee_type_id UUID REFERENCES fee_types(id),
                        source oldfeesourceenum NOT NULL,
                        original_amount NUMERIC(10,2) NOT NULL,
                        paid_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
                        paid_date DATE,
                        receipt_manual VARCHAR(100),
                        receipt_system VARCHAR(100),
                        is_settled BOOLEAN NOT NULL DEFAULT FALSE,
                        remarks VARCHAR(500),
                        current_academic_year_id UUID REFERENCES academic_years(id),
                        created_by_user_id UUID REFERENCES users(id),
                        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
                    );
                END IF;
            END $$;
        """))
        print("[OK] fee_concessions + fee_old tables ensured")

        await db.commit()

        # ── 10. Print summary ─────────────────────────────────────────────
        print()
        print("=" * 70)
        print("FEE TEST DATA SEEDED SUCCESSFULLY")
        print("=" * 70)
        print()
        print(f"Academic Year:    {ay_title}")
        print(f"Academic Year ID: {ay_id}")
        print()
        print(f"Student:          {student.first_name} {student.last_name}")
        print(f"Student ID:       {student_id}")
        print(f"Admission No:     {admission_number}")
        print(f"Class ID:         {class_id}")
        print(f"Section ID:       {section_id}")
        print()
        print(f"Fee Term ID:      {term_id}")
        print(f"Term Date ID:     {term_date_id}")
        print()
        print("Fee Types Assigned:")
        print(f"{'Fee Type':<25} {'Amount':>10}  {'Fee Type ID'}")
        print("-" * 70)
        for ft_name, (ft_id, amount) in fee_type_ids.items():
            print(f"  {ft_name:<23} Rs.{amount:>8,}  {ft_id}")
        print("-" * 70)
        total = sum(a for _, a in fee_type_ids.values())
        print(f"  {'GRAND TOTAL':<23} Rs.{total:>8,}")
        print()
        print("Admin User (for API calls):")
        print("  Username: TestStaff34b527d0")
        print("  User ID:  f8bf9cc9-8d5f-4aeb-bd6f-87695f8d75c3")
        print("  Role ID:  2fe97570-0740-44c5-911f-9826e0258a9b")
        print()
        print("Header: cschema: test_tenant")
        print()

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run())
