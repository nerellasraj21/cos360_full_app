"""
Integration test for Student and Parent role endpoints.
Run from project root: python scripts/test_student_parent_endpoints.py
"""

import asyncio
import httpx
import json
import sys
from datetime import date

# Fix Windows console encoding
sys.stdout.reconfigure(encoding="utf-8")

BASE = "http://localhost:8000/api/v1"
SCHEMA = "test_tenant"
TODAY = date.today().isoformat()
MONTH_START = date.today().replace(day=1).isoformat()

results = {"pass": 0, "fail": 0}


def count_menus(menus):
    total = 0
    for m in menus:
        total += 1
        if m.get("children"):
            total += count_menus(m["children"])
    return total


def ok(label, status, expected, body=None):
    if status == expected:
        print(f"  [PASS] {label} -> {status}")
        results["pass"] += 1
        return True
    else:
        print(f"  [FAIL] {label} -> {status} (expected {expected})")
        if body:
            try:
                detail = json.loads(body) if isinstance(body, str) else body
                print(f"         detail: {json.dumps(detail)[:300]}")
            except Exception:
                print(f"         body: {str(body)[:300]}")
        results["fail"] += 1
        return False


def check(label, condition, detail=""):
    if condition:
        print(f"  [PASS] {label}")
        results["pass"] += 1
    else:
        print(f"  [FAIL] {label}" + (f" ({detail})" if detail else ""))
        results["fail"] += 1


async def login(client, username, password):
    r = await client.post(
        f"{BASE}/auth/login",
        json={"username": username, "password": password},
        headers={"cschema": SCHEMA},
    )
    if r.status_code == 200:
        data = r.json()
        token = data.get("access_token")
        entity_id = data.get("entity_id")
        role = data.get("role", {}).get("name")
        menus = data.get("menu", [])
        return token, entity_id, role, menus
    else:
        print(f"  [FAIL] Login {username} -> {r.status_code}: {r.text[:200]}")
        results["fail"] += 1
        return None, None, None, []


async def run():
    async with httpx.AsyncClient(timeout=30) as client:

        # ─────────────────────────────────────────
        print("\n" + "=" * 60)
        print("STUDENT ROLE — lambodhar.vinayak")
        print("=" * 60)

        token_s, student_id, role_s, menus_s = await login(client, "lambodhar.vinayak", "Lambodhar@123")

        if not token_s:
            print("  Cannot proceed — student login failed.")
        else:
            menu_total = count_menus(menus_s)
            print(f"\n  role={role_s}  entity_id={student_id}")
            check("Login role is 'Student'", role_s == "Student", f"got '{role_s}'")
            check(f"Menu count = 13 (got {menu_total})", menu_total == 13)

            # Verify Student Transport URL
            def all_menu_paths(menus):
                paths = []
                for m in menus:
                    paths.append(m.get("path", ""))
                    if m.get("children"):
                        paths.extend(all_menu_paths(m["children"]))
                return paths

            paths = all_menu_paths(menus_s)
            check(
                "Student Transport path = /students/studenttransport",
                "/students/studenttransport" in paths,
                f"paths: {paths}",
            )
            check(
                "No admin transport paths",
                not any("/transport/routes" in p or "/transport/vehicles" in p for p in paths),
            )

            h = {"Authorization": f"Bearer {token_s}", "cschema": SCHEMA}

            # 1. Admissions list
            print("\n[1] Student Admissions List")
            r = await client.get(f"{BASE}/students/admission/", headers=h)
            if ok("GET /students/admission/ -> 200", r.status_code, 200, r.text):
                data = r.json()
                total = data.get("total_count", -1)
                print(f"       total_count={total} (student sees own record only)")
                check("total_count = 1 (own admission only)", total == 1, f"got {total}")

            # 2. Admission by student_id
            print("\n[2] Student Admission by ID")
            if student_id:
                r = await client.get(f"{BASE}/students/admission/id/{student_id}", headers=h)
                ok("GET /students/admission/id/{own_id} -> 200", r.status_code, 200, r.text)
            else:
                print("  [SKIP] no student_id")

            # 3. Attendance with date range (expect 200)
            print("\n[3] Student Attendance — my-attendance with date range")
            r = await client.get(
                f"{BASE}/student/attendance/my-attendance",
                headers=h,
                params={"start_date": MONTH_START, "end_date": TODAY},
            )
            ok("GET /my-attendance?start_date&end_date -> 200", r.status_code, 200, r.text)

            # 4. Attendance without dates (expect 422)
            print("\n[4] Student Attendance — no date params (expect 422)")
            r = await client.get(f"{BASE}/student/attendance/my-attendance", headers=h)
            ok("GET /my-attendance (no dates) -> 422", r.status_code, 422)

            # 5. Profile
            print("\n[5] Student Profile")
            r = await client.get(f"{BASE}/profile/student/me", headers=h)
            ok("GET /profile/student/me -> 200", r.status_code, 200, r.text)

            # 6. Transport
            print("\n[6] Student Transport")
            if student_id:
                r = await client.get(f"{BASE}/students/student-transport/student/{student_id}", headers=h)
                if r.status_code == 200:
                    ok("GET /student-transport/student/{own_id} -> 200", r.status_code, 200)
                elif r.status_code == 404:
                    # No transport assigned — acceptable, not a 403
                    print("  [PASS] GET /student-transport/student/{own_id} -> 404 (no assignment, not 403)")
                    results["pass"] += 1
                else:
                    ok("GET /student-transport/student/{own_id} -> 200 or 404", r.status_code, 200, r.text)
            else:
                print("  [SKIP] no student_id")

        # ─────────────────────────────────────────
        print("\n" + "=" * 60)
        print("PARENT ROLE — sita.sharma")
        print("=" * 60)

        token_p, parent_id, role_p, menus_p = await login(client, "sita.sharma", "Sita@123")

        if not token_p:
            print("  Cannot proceed — parent login failed.")
        else:
            menu_total_p = count_menus(menus_p)
            print(f"\n  role={role_p}  entity_id={parent_id}")
            check("Login role is 'Parent'", role_p == "Parent", f"got '{role_p}'")
            check(f"Menu count = 13 (got {menu_total_p})", menu_total_p == 13)

            h = {"Authorization": f"Bearer {token_p}", "cschema": SCHEMA}

            # 7. Get children
            print("\n[7] Parent — Get Children")
            children = []
            if parent_id:
                r = await client.get(f"{BASE}/student-parent-links/parent/{parent_id}/students", headers=h)
                if ok("GET /student-parent-links/parent/{own_id}/students -> 200", r.status_code, 200, r.text):
                    raw = r.json()
                    children = raw if isinstance(raw, list) else raw.get("items", [])
                    print(f"       children returned: {len(children)}")
            else:
                print("  [SKIP] no parent_id")

            # 8. Parent admissions list
            print("\n[8] Parent — Student Admissions List")
            r = await client.get(f"{BASE}/students/admission/", headers=h)
            if ok("GET /students/admission/ -> 200", r.status_code, 200, r.text):
                data = r.json()
                total = data.get("total_count", -1)
                print(f"       total_count={total} (parent sees linked children's admissions)")
                check("total_count >= 1 (linked children)", total >= 1, f"got {total}")

            # 9. Parent child attendance
            print("\n[9] Parent — Child Attendance")
            child_id = None
            if children:
                child_id = children[0].get("id") or children[0].get("student_id")

            if child_id:
                r = await client.get(
                    f"{BASE}/student/attendance/student/{child_id}/filter",
                    headers=h,
                    params={"start_date": MONTH_START, "end_date": TODAY},
                )
                ok(f"GET /attendance/student/{child_id}/filter -> 200", r.status_code, 200, r.text)
            else:
                print("  [SKIP] no children returned or no id field")

            # 10. Parent child transport
            print("\n[10] Parent — Child Transport")
            if child_id:
                r = await client.get(f"{BASE}/students/student-transport/student/{child_id}", headers=h)
                if r.status_code in (200, 404):
                    label = "200 (assigned)" if r.status_code == 200 else "404 (no assignment)"
                    print(f"  [PASS] GET /student-transport/student/{{child_id}} -> {label}")
                    results["pass"] += 1
                else:
                    ok(f"GET /student-transport/student/{{child_id}} -> 200 or 404", r.status_code, 200, r.text)
            else:
                print("  [SKIP] no child_id")

        # ─────────────────────────────────────────
        print("\n" + "=" * 60)
        print("RESULTS")
        print("=" * 60)
        total = results["pass"] + results["fail"]
        print(f"  Passed : {results['pass']}/{total}")
        print(f"  Failed : {results['fail']}/{total}")
        if results["fail"] == 0:
            print("  All tests passed!")
        print()


if __name__ == "__main__":
    asyncio.run(run())
