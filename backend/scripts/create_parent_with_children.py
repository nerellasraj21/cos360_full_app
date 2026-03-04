"""
Seed script: Create a Parent user with 2 children in test_tenant_schema.

Run from the project root:
    python scripts/create_parent_with_children.py

What this script does:
  1. Ensures is_first_login column exists.
  2. Ensures the 'Parent' role exists.
  3. Seeds restricted resource_permissions for Parent role:
       - child's details, marks (exam_marks), hall tickets (exams), attendance, certificates
       - NO fee/transport/reports/admin access
  4. Creates a Parent User (username: sita.sharma, temp password: Welcome@123, is_first_login=True).
  5. Creates the Parent record (Sita Sharma, Mother).
  6. Links Parent to 2 children:
       Child 1: Lambodhar Vinayak (lambodhar.vinayak) -- existing student
       Child 2: Arjun Sharma     -- created fresh if not present

Login flow:
  Step 1 -- POST /auth/login
    { "username": "sita.sharma", "password": "Welcome@123", "client_name": "test_tenant" }
    -> { "requires_password_change": true, "change_password_token": "..." }

  Step 2 -- POST /auth/staff/set-password
    { "change_password_token": "<token>", "new_password": "NewPass@123", "confirm_password": "NewPass@123" }
    -> full login response with entity_id = parent UUID

After login the frontend uses entity_id (parent_id) to fetch children:
  GET /student-parent-links/parent/{entity_id}/students
  -> list of children [ { student_id, first_name, last_name, ... } ]

Frontend stores this list and lets the parent swap between children.
Each child-specific call uses that child's student_id.
"""

import asyncio
import sys
import os
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import text
from app.config import settings
from app.tools.password_util import hash_password

SCHEMA = "test_tenant_schema"
TEMP_PASSWORD = "Welcome@123"

PARENT = {
    "username":            "sita.sharma",
    "email":               "sita.sharma@school.com",
    "name":                "Sita Sharma",
    "gender":              "Female",
    "phone":               "9876543210",
    "occupation":          "Teacher",
    "relation_to_student": "Mother",
    "salary_range":        "3l_5l",
}

CHILD_2 = {
    "first_name":    "Arjun",
    "last_name":     "Sharma",
    "username":      "arjun.sharma",
    "email":         None,
    "date_of_birth": date(2011, 3, 10),
    "gender":        "Male",
    "nationality":   "Indian",
    "mother_tongue": "Telugu",
}

# Restricted permissions: children's details, marks, hall tickets only
_PARENT_PERMISSIONS = [
    # Reference data (needed to display class/section names)
    ("academic_years",       "read"),  ("academic_years",       "list"),
    ("classes",              "read"),  ("classes",              "list"),
    ("subjects",             "read"),  ("subjects",             "list"),
    # Child's details
    ("student_admissions",   "read"),
    ("student_attendance",   "read"),  ("student_attendance",   "list"),
    ("student_certificates", "read"),  ("student_certificates", "list"),
    ("student_documents",    "read"),  ("student_documents",    "list"),
    # Marks & Exam results
    ("exams",                "read"),  ("exams",                "list"),
    ("exam_marks",           "read"),  ("exam_marks",           "list"),
    # Hall tickets (part of exam module)
    ("exam_hall_tickets",    "read"),  ("exam_hall_tickets",    "list"),
]


async def run():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(bind=engine, expire_on_commit=False)

    async with Session() as db:
        # ------------------------------------------------------------------ #
        # 0. Switch to tenant schema                                           #
        # ------------------------------------------------------------------ #
        await db.execute(text(f"SET search_path TO {SCHEMA}, public"))

        # ------------------------------------------------------------------ #
        # 1. Ensure is_first_login column + wide username                     #
        # ------------------------------------------------------------------ #
        await db.execute(text("""
            ALTER TABLE users ADD COLUMN IF NOT EXISTS is_first_login BOOLEAN
        """))
        await db.execute(text("""
            ALTER TABLE users ALTER COLUMN username TYPE VARCHAR(100)
        """))
        print("[OK] is_first_login column ensured")

        # ------------------------------------------------------------------ #
        # 2. Ensure Parent role exists                                         #
        # ------------------------------------------------------------------ #
        await db.execute(text("""
            INSERT INTO roles (id, name, description, is_system_role, is_custom_role)
            VALUES (gen_random_uuid(), 'Parent', 'Parent with access to children data only', true, false)
            ON CONFLICT (name) DO NOTHING
        """))
        result = await db.execute(text("SELECT id FROM roles WHERE name = 'Parent'"))
        parent_role_id = result.scalar_one()
        print(f"[OK] Parent role ID: {parent_role_id}")

        # ------------------------------------------------------------------ #
        # 3. Seed restricted resource_permissions for Parent role             #
        # ------------------------------------------------------------------ #
        seeded = 0
        for resource, action in _PARENT_PERMISSIONS:
            await db.execute(text("""
                INSERT INTO resource_permissions (id, role_id, resource, action, is_granted)
                SELECT gen_random_uuid(), :role_id, :res, :act, true
                WHERE NOT EXISTS (
                    SELECT 1 FROM resource_permissions
                    WHERE role_id = :role_id2 AND resource = :res2 AND action = :act2
                )
            """), {
                "role_id": parent_role_id, "res": resource, "act": action,
                "role_id2": parent_role_id, "res2": resource, "act2": action,
            })
            seeded += 1
        await db.flush()
        print(f"[OK] {seeded} resource_permissions ensured for Parent role")

        # ------------------------------------------------------------------ #
        # 4. Seed role_menu_permissions for Parent (can_view only)            #
        # ------------------------------------------------------------------ #
        menus_result = await db.execute(text("SELECT id FROM menus"))
        menu_rows = menus_result.fetchall()
        for (menu_id,) in menu_rows:
            await db.execute(text("""
                INSERT INTO role_menu_permissions (id, role_id, menu_id, can_view, can_edit)
                SELECT gen_random_uuid(), :role_id, :menu_id, true, false
                WHERE NOT EXISTS (
                    SELECT 1 FROM role_menu_permissions
                    WHERE role_id = :role_id2 AND menu_id = :menu_id2
                )
            """), {"role_id": parent_role_id, "menu_id": menu_id,
                   "role_id2": parent_role_id, "menu_id2": menu_id})
        await db.flush()
        print(f"[OK] role_menu_permissions ensured for {len(menu_rows)} menus")

        # ------------------------------------------------------------------ #
        # 5. Create or update Parent User record                               #
        # ------------------------------------------------------------------ #
        pwd_hash = hash_password(TEMP_PASSWORD)

        existing = await db.execute(
            text("SELECT id FROM users WHERE email = :email OR username = :username"),
            {"email": PARENT["email"], "username": PARENT["username"]}
        )
        existing_user_id = existing.scalar_one_or_none()

        if existing_user_id:
            await db.execute(text("""
                UPDATE users
                SET password_hash = :pwd, is_first_login = true,
                    username = :username, email = :email,
                    role_id = :role_id, is_active = true
                WHERE id = :id
            """), {
                "pwd":      pwd_hash,
                "username": PARENT["username"],
                "email":    PARENT["email"],
                "role_id":  parent_role_id,
                "id":       existing_user_id,
            })
            user_id = existing_user_id
            print(f"[OK] Existing user updated -- user_id: {user_id}")
        else:
            await db.execute(text("""
                INSERT INTO users (id, username, email, password_hash, is_active, is_first_login, role_id)
                VALUES (gen_random_uuid(), :username, :email, :pwd, true, true, :role_id)
            """), {
                "username": PARENT["username"],
                "email":    PARENT["email"],
                "pwd":      pwd_hash,
                "role_id":  parent_role_id,
            })
            r = await db.execute(
                text("SELECT id FROM users WHERE username = :username"),
                {"username": PARENT["username"]}
            )
            user_id = r.scalar_one()
            print(f"[OK] New user created -- user_id: {user_id}")

        # ------------------------------------------------------------------ #
        # 6. Create or update Parent record                                    #
        # ------------------------------------------------------------------ #
        existing_par = await db.execute(
            text("SELECT id FROM parents WHERE user_id = :uid"), {"uid": user_id}
        )
        existing_par_id = existing_par.scalar_one_or_none()

        if existing_par_id:
            await db.execute(text("""
                UPDATE parents
                SET name = :name, email = :email, phone = :phone,
                    occupation = :occupation, gender = :gender,
                    relation_to_student = :relation, salary_range = :salary
                WHERE user_id = :uid
            """), {
                "name":       PARENT["name"],
                "email":      PARENT["email"],
                "phone":      PARENT["phone"],
                "occupation": PARENT["occupation"],
                "gender":     PARENT["gender"],
                "relation":   PARENT["relation_to_student"],
                "salary":     PARENT["salary_range"],
                "uid":        user_id,
            })
            parent_id = existing_par_id
            print(f"[OK] Parent record updated -- parent_id: {parent_id}")
        else:
            await db.execute(text("""
                INSERT INTO parents (id, name, email, phone, occupation, gender,
                                     relation_to_student, salary_range, user_id)
                VALUES (gen_random_uuid(), :name, :email, :phone, :occupation, :gender,
                        :relation, :salary, :uid)
            """), {
                "name":       PARENT["name"],
                "email":      PARENT["email"],
                "phone":      PARENT["phone"],
                "occupation": PARENT["occupation"],
                "gender":     PARENT["gender"],
                "relation":   PARENT["relation_to_student"],
                "salary":     PARENT["salary_range"],
                "uid":        user_id,
            })
            r2 = await db.execute(
                text("SELECT id FROM parents WHERE user_id = :uid"), {"uid": user_id}
            )
            parent_id = r2.scalar_one()
            print(f"[OK] Parent record created -- parent_id: {parent_id}")

        # ------------------------------------------------------------------ #
        # 7. Find Child 1: Lambodhar Vinayak (existing)                       #
        # ------------------------------------------------------------------ #
        c1 = await db.execute(
            text("SELECT id FROM students WHERE user_id = (SELECT id FROM users WHERE username = 'lambodhar.vinayak')"),
        )
        child1_id = c1.scalar_one_or_none()
        if child1_id:
            print(f"[OK] Child 1 found (Lambodhar Vinayak) -- student_id: {child1_id}")
        else:
            print("[WARN] Child 1 (lambodhar.vinayak) not found -- run create_lambodhar_student.py first")

        # ------------------------------------------------------------------ #
        # 8. Find or create Child 2: Arjun Sharma                            #
        # ------------------------------------------------------------------ #
        # Find Student role id
        sr = await db.execute(text("SELECT id FROM roles WHERE name = 'Student'"))
        student_role_id = sr.scalar_one_or_none()

        # Check if arjun.sharma user already exists
        c2u = await db.execute(
            text("SELECT id FROM users WHERE username = :uname"),
            {"uname": CHILD_2["username"]}
        )
        child2_user_id = c2u.scalar_one_or_none()

        if not child2_user_id:
            child2_pwd = hash_password(TEMP_PASSWORD)
            await db.execute(text("""
                INSERT INTO users (id, username, password_hash, is_active, is_first_login, role_id)
                VALUES (gen_random_uuid(), :username, :pwd, true, true, :role_id)
            """), {"username": CHILD_2["username"], "pwd": child2_pwd, "role_id": student_role_id})
            r3 = await db.execute(
                text("SELECT id FROM users WHERE username = :uname"),
                {"uname": CHILD_2["username"]}
            )
            child2_user_id = r3.scalar_one()
            print(f"[OK] Child 2 user created (Arjun Sharma) -- user_id: {child2_user_id}")

        # Check if student record exists for arjun
        c2s = await db.execute(
            text("SELECT id FROM students WHERE user_id = :uid"), {"uid": child2_user_id}
        )
        child2_id = c2s.scalar_one_or_none()

        if not child2_id:
            await db.execute(text("""
                INSERT INTO students (id, first_name, last_name, date_of_birth, gender,
                                      nationality, mother_tongue, user_id)
                VALUES (gen_random_uuid(), :fn, :ln, :dob, :gender, :nat, :mt, :uid)
            """), {
                "fn":     CHILD_2["first_name"],
                "ln":     CHILD_2["last_name"],
                "dob":    CHILD_2["date_of_birth"],
                "gender": CHILD_2["gender"],
                "nat":    CHILD_2["nationality"],
                "mt":     CHILD_2["mother_tongue"],
                "uid":    child2_user_id,
            })
            r4 = await db.execute(
                text("SELECT id FROM students WHERE user_id = :uid"), {"uid": child2_user_id}
            )
            child2_id = r4.scalar_one()
            print(f"[OK] Child 2 student record created (Arjun Sharma) -- student_id: {child2_id}")
        else:
            print(f"[OK] Child 2 found (Arjun Sharma) -- student_id: {child2_id}")

        # ------------------------------------------------------------------ #
        # 9. Link both children to parent (idempotent)                        #
        # ------------------------------------------------------------------ #
        for label, child_id in [("Lambodhar Vinayak", child1_id), ("Arjun Sharma", child2_id)]:
            if not child_id:
                continue
            existing_link = await db.execute(
                text("SELECT id FROM student_parent_links WHERE student_id = :sid AND parent_id = :pid"),
                {"sid": child_id, "pid": parent_id}
            )
            if not existing_link.scalar_one_or_none():
                await db.execute(text("""
                    INSERT INTO student_parent_links (id, student_id, parent_id)
                    VALUES (gen_random_uuid(), :sid, :pid)
                """), {"sid": child_id, "pid": parent_id})
                print(f"[OK] Linked {label} to parent")
            else:
                print(f"[OK] {label} already linked to parent")

        await db.commit()

        print()
        print("=== Parent account created successfully ===")
        print(f"  Name        : {PARENT['name']}")
        print(f"  Username    : {PARENT['username']}")
        print(f"  Email       : {PARENT['email']}")
        print(f"  Role        : Parent")
        print(f"  Relation    : {PARENT['relation_to_student']}")
        print(f"  Temp PW     : {TEMP_PASSWORD}")
        print(f"  First login : True  (must set a new password on first login)")
        print(f"  Children    : Lambodhar Vinayak, Arjun Sharma")
        print()
        print("Login flow:")
        print("  Step 1 -- POST /auth/login")
        print(f'    Body: {{ "username": "{PARENT["username"]}", "password": "{TEMP_PASSWORD}", "client_name": "test_tenant" }}')
        print('    -> { "requires_password_change": true, "change_password_token": "..." }')
        print()
        print("  Step 2 -- POST /auth/staff/set-password")
        print('    Body: { "change_password_token": "<token>", "new_password": "NewPass@123", "confirm_password": "NewPass@123" }')
        print('    -> full login response with entity_id = parent UUID')
        print()
        print("After login -- fetch children list:")
        print(f"  GET /student-parent-links/parent/{{entity_id}}/students")
        print("  -> [ { student_id, first_name, last_name }, ... ]")
        print("  Use each student_id to call child-specific endpoints.")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run())
