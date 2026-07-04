"""
Comprehensive seed script for little_bunny tenant.

Steps:
  1. Sections      — one section (xA) per class
  2. Subjects      — per-class subject mapping
  3. Fees          — term, category, 4 fee types, class mappings
  4. Students      — 3 students per class with user accounts + admissions

Run from the cos360_backend directory:
    python scripts/seed_little_bunny_data.py
"""

import asyncio
import os
import sys
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv

load_dotenv()

from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

import bcrypt as _bcrypt

from app.config import settings


def hash_password(password: str) -> str:
    return _bcrypt.hashpw(password.encode(), _bcrypt.gensalt()).decode()

SCHEMA = "little_bunny"
ACADEMIC_YEAR_TITLE = "2025-2026"
TEMP_PASSWORD = "Welcome@123"

# --------------------------------------------------------------------------- #
# DATA DEFINITIONS
# --------------------------------------------------------------------------- #

SECTIONS = [
    {"class_name": "Class 1", "section_name": "1A"},
    {"class_name": "Class 2", "section_name": "2A"},
    {"class_name": "Class 3", "section_name": "3A"},
    {"class_name": "Class 4", "section_name": "4A"},
    {"class_name": "Class 5", "section_name": "5A"},
]

# Classes 1 & 2: Telugu, Hindi, English, Maths
# Classes 3-5 : Telugu, Hindi, Maths, Science, Social, EVS
SUBJECTS = [
    {"name": "Telugu",  "short_code": "TEL", "classes": ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5"]},
    {"name": "Hindi",   "short_code": "HIN", "classes": ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5"]},
    {"name": "English", "short_code": "ENG", "classes": ["Class 1", "Class 2"]},
    {"name": "Maths",   "short_code": "MAT", "classes": ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5"]},
    {"name": "Science", "short_code": "SCI", "classes": ["Class 3", "Class 4", "Class 5"]},
    {"name": "Social",  "short_code": "SOC", "classes": ["Class 3", "Class 4", "Class 5"]},
    {"name": "EVS",     "short_code": "EVS", "classes": ["Class 3", "Class 4", "Class 5"]},
]

# mandatory=True → all_by_default=True in fee_class_mappings
FEE_TYPES = [
    {"name": "Tuition Fee", "mandatory": True,  "amount": 5000.00},
    {"name": "Books",       "mandatory": False, "amount": 2000.00},
    {"name": "Exam Fee",    "mandatory": True,  "amount": 500.00},
    {"name": "Transport",   "mandatory": False, "amount": 1500.00},
]

STUDENTS_BY_CLASS = {
    "Class 1": [
        {"first_name": "Aarav",   "last_name": "Kumar",  "gender": "Male",   "dob": date(2019, 6,  1),  "adm_no": "LB-2025-001"},
        {"first_name": "Priya",   "last_name": "Singh",  "gender": "Female", "dob": date(2019, 7, 15),  "adm_no": "LB-2025-002"},
        {"first_name": "Rahul",   "last_name": "Verma",  "gender": "Male",   "dob": date(2019, 8, 20),  "adm_no": "LB-2025-003"},
    ],
    "Class 2": [
        {"first_name": "Amit",    "last_name": "Patel",  "gender": "Male",   "dob": date(2018, 6,  1),  "adm_no": "LB-2025-004"},
        {"first_name": "Sunita",  "last_name": "Rao",    "gender": "Female", "dob": date(2018, 7, 15),  "adm_no": "LB-2025-005"},
        {"first_name": "Kiran",   "last_name": "Reddy",  "gender": "Male",   "dob": date(2018, 8, 20),  "adm_no": "LB-2025-006"},
    ],
    "Class 3": [
        {"first_name": "Divya",   "last_name": "Nair",   "gender": "Female", "dob": date(2017, 6,  1),  "adm_no": "LB-2025-007"},
        {"first_name": "Suresh",  "last_name": "Babu",   "gender": "Male",   "dob": date(2017, 7, 15),  "adm_no": "LB-2025-008"},
        {"first_name": "Lakshmi", "last_name": "Devi",   "gender": "Female", "dob": date(2017, 8, 20),  "adm_no": "LB-2025-009"},
    ],
    "Class 4": [
        {"first_name": "Ravi",    "last_name": "Gupta",  "gender": "Male",   "dob": date(2016, 6,  1),  "adm_no": "LB-2025-010"},
        {"first_name": "Anita",   "last_name": "Sharma", "gender": "Female", "dob": date(2016, 7, 15),  "adm_no": "LB-2025-011"},
        {"first_name": "Mohan",   "last_name": "Das",    "gender": "Male",   "dob": date(2016, 8, 20),  "adm_no": "LB-2025-012"},
    ],
    "Class 5": [
        {"first_name": "Pooja",   "last_name": "Iyer",   "gender": "Female", "dob": date(2015, 6,  1),  "adm_no": "LB-2025-013"},
        {"first_name": "Arun",    "last_name": "Pillai", "gender": "Male",   "dob": date(2015, 7, 15),  "adm_no": "LB-2025-014"},
        {"first_name": "Sneha",   "last_name": "Menon",  "gender": "Female", "dob": date(2015, 8, 20),  "adm_no": "LB-2025-015"},
    ],
}


# --------------------------------------------------------------------------- #
# HELPERS
# --------------------------------------------------------------------------- #

def sep(title):
    print(f"\n{'=' * 60}")
    print(f"  {title}")
    print('=' * 60)


async def fetch_one(db, sql, params=None):
    r = await db.execute(text(sql), params or {})
    return r.scalar_one_or_none()


async def run():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(bind=engine, expire_on_commit=False)

    async with Session() as db:
        await db.execute(text(f"SET search_path TO {SCHEMA}, public"))

        # ------------------------------------------------------------------- #
        # Resolve academic year
        # ------------------------------------------------------------------- #
        ay_id = await fetch_one(
            db,
            "SELECT id FROM academic_years WHERE title = :t",
            {"t": ACADEMIC_YEAR_TITLE},
        )
        if not ay_id:
            print(f"ERROR: Academic year '{ACADEMIC_YEAR_TITLE}' not found. Run seed_little_bunny_academic_year.py first.")
            return
        print(f"Academic year '{ACADEMIC_YEAR_TITLE}' — id={ay_id}")

        # ------------------------------------------------------------------- #
        # Resolve class IDs
        # ------------------------------------------------------------------- #
        class_ids = {}
        for cls_name in ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5"]:
            cid = await fetch_one(db, "SELECT id FROM classes WHERE name = :n AND academic_year_id = :ay",
                                  {"n": cls_name, "ay": str(ay_id)})
            if not cid:
                print(f"ERROR: Class '{cls_name}' not found. Run seed_little_bunny_classes.py first.")
                return
            class_ids[cls_name] = cid
        print(f"All 5 classes resolved.")

        # ================================================================== #
        # STEP 1 — SECTIONS
        # ================================================================== #
        sep("STEP 1: Sections")
        section_ids = {}
        for s in SECTIONS:
            cls_id = class_ids[s["class_name"]]
            existing = await fetch_one(
                db,
                "SELECT id FROM sections WHERE name = :n AND class_id = :c",
                {"n": s["section_name"], "c": str(cls_id)},
            )
            if existing:
                section_ids[s["class_name"]] = existing
                print(f"  [SKIP] {s['class_name']} / {s['section_name']} already exists")
            else:
                await db.execute(
                    text("""
                        INSERT INTO sections (id, name, description, is_active, class_id)
                        VALUES (gen_random_uuid(), :name, :desc, true, :class_id)
                    """),
                    {"name": s["section_name"], "desc": f"Section of {s['class_name']}", "class_id": str(cls_id)},
                )
                new_id = await fetch_one(
                    db,
                    "SELECT id FROM sections WHERE name = :n AND class_id = :c",
                    {"n": s["section_name"], "c": str(cls_id)},
                )
                section_ids[s["class_name"]] = new_id
                print(f"  [OK]   {s['class_name']} / {s['section_name']} — id={new_id}")
        await db.flush()

        # ================================================================== #
        # STEP 2 — SUBJECTS + CLASS-SUBJECT MAPPINGS
        # ================================================================== #
        sep("STEP 2: Subjects & Class-Subject Mappings")
        subject_ids = {}
        for subj in SUBJECTS:
            existing = await fetch_one(
                db,
                "SELECT id FROM subjects WHERE name = :n AND academic_year_id = :ay",
                {"n": subj["name"], "ay": str(ay_id)},
            )
            if existing:
                subject_ids[subj["name"]] = existing
                print(f"  [SKIP] Subject '{subj['name']}' already exists")
            else:
                await db.execute(
                    text("""
                        INSERT INTO subjects (id, name, short_code, is_active, academic_year_id)
                        VALUES (gen_random_uuid(), :name, :code, true, :ay)
                    """),
                    {"name": subj["name"], "code": subj["short_code"], "ay": str(ay_id)},
                )
                new_id = await fetch_one(
                    db,
                    "SELECT id FROM subjects WHERE name = :n AND academic_year_id = :ay",
                    {"n": subj["name"], "ay": str(ay_id)},
                )
                subject_ids[subj["name"]] = new_id
                print(f"  [OK]   Subject '{subj['name']}' — id={new_id}")

        await db.flush()

        mapping_count = 0
        for subj in SUBJECTS:
            subj_id = subject_ids[subj["name"]]
            for order, cls_name in enumerate(subj["classes"], start=1):
                cls_id = class_ids[cls_name]
                sec_id = section_ids[cls_name]
                existing = await fetch_one(
                    db,
                    "SELECT id FROM class_subject_mappings WHERE class_id = :c AND subject_id = :s AND academic_year_id = :ay",
                    {"c": str(cls_id), "s": str(subj_id), "ay": str(ay_id)},
                )
                if not existing:
                    await db.execute(
                        text("""
                            INSERT INTO class_subject_mappings
                                (id, class_id, section_id, subject_id, academic_year_id, exclude_marks, is_active, "order")
                            VALUES (gen_random_uuid(), :c, :sec, :s, :ay, false, true, :ord)
                        """),
                        {"c": str(cls_id), "sec": str(sec_id), "s": str(subj_id), "ay": str(ay_id), "ord": order},
                    )
                    mapping_count += 1
        await db.flush()
        print(f"  [OK]   {mapping_count} class-subject mappings created.")

        # ================================================================== #
        # STEP 3 — FEE STRUCTURE
        # ================================================================== #
        sep("STEP 3: Fee Structure")

        # Fee Term
        fee_term_id = await fetch_one(
            db,
            "SELECT id FROM fee_terms WHERE term_name = :n AND academic_year_id = :ay",
            {"n": "Annual", "ay": str(ay_id)},
        )
        if not fee_term_id:
            await db.execute(
                text("""
                    INSERT INTO fee_terms (id, term_name, term_status, number_of_terms, academic_year_id)
                    VALUES (gen_random_uuid(), 'Annual', 'active', 1, :ay)
                """),
                {"ay": str(ay_id)},
            )
            fee_term_id = await fetch_one(
                db,
                "SELECT id FROM fee_terms WHERE term_name = :n AND academic_year_id = :ay",
                {"n": "Annual", "ay": str(ay_id)},
            )
            print(f"  [OK]   Fee term 'Annual' — id={fee_term_id}")
        else:
            print(f"  [SKIP] Fee term 'Annual' already exists")

        # Fee Category
        fee_cat_id = await fetch_one(
            db,
            "SELECT id FROM fee_categories WHERE category_name = :n AND academic_year_id = :ay",
            {"n": "School Fees", "ay": str(ay_id)},
        )
        if not fee_cat_id:
            await db.execute(
                text("""
                    INSERT INTO fee_categories (id, category_name, category_status, academic_year_id)
                    VALUES (gen_random_uuid(), 'School Fees', 'active', :ay)
                """),
                {"ay": str(ay_id)},
            )
            fee_cat_id = await fetch_one(
                db,
                "SELECT id FROM fee_categories WHERE category_name = :n AND academic_year_id = :ay",
                {"n": "School Fees", "ay": str(ay_id)},
            )
            print(f"  [OK]   Fee category 'School Fees' — id={fee_cat_id}")
        else:
            print(f"  [SKIP] Fee category 'School Fees' already exists")

        await db.flush()

        # Fee Types
        fee_type_ids = {}
        for ft in FEE_TYPES:
            existing = await fetch_one(
                db,
                "SELECT id FROM fee_types WHERE type_name = :n AND fee_category_id = :cat",
                {"n": ft["name"], "cat": str(fee_cat_id)},
            )
            if existing:
                fee_type_ids[ft["name"]] = existing
                print(f"  [SKIP] Fee type '{ft['name']}' already exists")
            else:
                await db.execute(
                    text("""
                        INSERT INTO fee_types (id, type_name, fee_category_id, fee_status, fee_term_id, academic_year_id)
                        VALUES (gen_random_uuid(), :name, :cat, 'active', :term, :ay)
                    """),
                    {"name": ft["name"], "cat": str(fee_cat_id), "term": str(fee_term_id), "ay": str(ay_id)},
                )
                new_id = await fetch_one(
                    db,
                    "SELECT id FROM fee_types WHERE type_name = :n AND fee_category_id = :cat",
                    {"n": ft["name"], "cat": str(fee_cat_id)},
                )
                fee_type_ids[ft["name"]] = new_id
                print(f"  [OK]   Fee type '{ft['name']}' (mandatory={ft['mandatory']}) — id={new_id}")

        await db.flush()

        # Fee Class Mappings — all 5 classes x 4 fee types
        fcm_count = 0
        for cls_name, cls_id in class_ids.items():
            for ft in FEE_TYPES:
                ft_id = fee_type_ids[ft["name"]]
                existing = await fetch_one(
                    db,
                    "SELECT id FROM fee_class_mappings WHERE class_id = :c AND fee_type_id = :f AND academic_year_id = :ay",
                    {"c": str(cls_id), "f": str(ft_id), "ay": str(ay_id)},
                )
                if not existing:
                    await db.execute(
                        text("""
                            INSERT INTO fee_class_mappings
                                (id, class_id, fee_type_id, total_fee, academic_year_id, all_by_default)
                            VALUES (gen_random_uuid(), :c, :f, :amt, :ay, :mandatory)
                        """),
                        {
                            "c": str(cls_id),
                            "f": str(ft_id),
                            "amt": ft["amount"],
                            "ay": str(ay_id),
                            "mandatory": ft["mandatory"],
                        },
                    )
                    fcm_count += 1
        await db.flush()
        print(f"  [OK]   {fcm_count} fee class mappings created (5 classes x 4 fee types).")

        # ================================================================== #
        # STEP 4 — STUDENTS
        # ================================================================== #
        sep("STEP 4: Students (3 per class)")

        # Ensure Student role exists
        student_role_id = await fetch_one(db, "SELECT id FROM roles WHERE name = 'Student'")
        if not student_role_id:
            await db.execute(
                text("""
                    INSERT INTO roles (id, name, description, is_system_role, is_custom_role)
                    VALUES (gen_random_uuid(), 'Student', 'Student users - Read access to their data', true, false)
                """)
            )
            student_role_id = await fetch_one(db, "SELECT id FROM roles WHERE name = 'Student'")
            print(f"  [OK]   Student role created — id={student_role_id}")
        else:
            print(f"  [OK]   Student role exists — id={student_role_id}")

        await db.flush()

        pwd_hash = hash_password(TEMP_PASSWORD)
        total_created = 0

        for cls_name, students in STUDENTS_BY_CLASS.items():
            cls_id = class_ids[cls_name]
            sec_id = section_ids[cls_name]
            print(f"\n  -- {cls_name} (section {[s['section_name'] for s in SECTIONS if s['class_name'] == cls_name][0]}) --")

            for stu in students:
                username = f"{stu['first_name'].lower()}.{stu['last_name'].lower()}.lb"
                email = f"{username}@littlebunny.edu"
                full_name = f"{stu['first_name']} {stu['last_name']}"

                # Check if user already exists
                user_id = await fetch_one(
                    db,
                    "SELECT id FROM users WHERE username = :u OR email = :e",
                    {"u": username, "e": email},
                )
                if user_id:
                    print(f"    [SKIP] {full_name} — user already exists")
                    continue

                # Create user
                await db.execute(
                    text("""
                        INSERT INTO users (id, username, email, password_hash, is_active, is_first_login, role_id)
                        VALUES (gen_random_uuid(), :u, :e, :pwd, true, true, :role)
                    """),
                    {"u": username, "e": email, "pwd": pwd_hash, "role": str(student_role_id)},
                )
                user_id = await fetch_one(db, "SELECT id FROM users WHERE username = :u", {"u": username})

                # Create student
                await db.execute(
                    text("""
                        INSERT INTO students
                            (id, first_name, last_name, date_of_birth, gender, nationality, mother_tongue, user_id)
                        VALUES
                            (gen_random_uuid(), :fn, :ln, :dob, :gender, 'Indian', 'Telugu', :uid)
                    """),
                    {
                        "fn": stu["first_name"],
                        "ln": stu["last_name"],
                        "dob": stu["dob"],
                        "gender": stu["gender"],
                        "uid": str(user_id),
                    },
                )
                student_id = await fetch_one(db, "SELECT id FROM students WHERE user_id = :uid", {"uid": str(user_id)})

                # Create admission
                await db.execute(
                    text("""
                        INSERT INTO student_admissions (
                            id, student_id, admission_number, admission_date,
                            academic_year_id,
                            admitted_class_id, admitted_section_id,
                            current_class_id, current_section_id,
                            address_line1, city, state
                        ) VALUES (
                            gen_random_uuid(), :sid, :adm_no, :adm_date,
                            :ay,
                            :cls, :sec,
                            :cls, :sec,
                            'Little Bunny School', 'Hyderabad', 'Telangana'
                        )
                    """),
                    {
                        "sid": str(student_id),
                        "adm_no": stu["adm_no"],
                        "adm_date": date.today(),
                        "ay": str(ay_id),
                        "cls": str(cls_id),
                        "sec": str(sec_id),
                    },
                )

                print(f"    [OK]  {full_name} | {stu['adm_no']} | {username}")
                total_created += 1

        await db.flush()
        await db.commit()

        # ================================================================== #
        # SUMMARY
        # ================================================================== #
        sep("DONE")
        print(f"  Sections     : {len(SECTIONS)} (one per class)")
        print(f"  Subjects     : {len(SUBJECTS)} subjects, {mapping_count} class mappings")
        print(f"  Fee types    : {len(FEE_TYPES)} (Tuition+Exam mandatory, Books+Transport optional)")
        print(f"  Fee mappings : {fcm_count} (5 classes x 4 fee types)")
        print(f"  Students     : {total_created} created (3 per class x 5 classes)")
        print(f"  Temp password: {TEMP_PASSWORD}  (is_first_login=True)")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run())
