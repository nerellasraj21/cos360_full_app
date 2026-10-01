import os
import sys
import time
from collections import Counter
from datetime import date, timedelta

import httpx

BASE = os.environ.get("DEMO_API_URL", "http://127.0.0.1:8000/api/v1").rstrip("/")
TENANT = os.environ.get("DEMO_TENANT", "demo_school")
USERNAME = os.environ.get("DEMO_ADMIN_USERNAME", "demo_admin")
PASSWORD = os.environ.get("DEMO_ADMIN_PASSWORD")

CREATED = Counter()
EXISTING = Counter()
FAILURES = []
SECTION = ["init"]


class Api:
    def __init__(self):
        self.http = httpx.Client(base_url=BASE, timeout=60, follow_redirects=True)
        self.token = None
        self.year_id = None
        self.user_id = None

    def login(self):
        r = self.http.get("/auth/academic-years", headers={"cschema": TENANT})
        r.raise_for_status()
        years = r.json()
        if isinstance(years, dict):
            years = years.get("items", [])
        active = [y for y in years if y.get("is_active")] or years
        self.year_id = active[0]["id"]
        r = self.http.post(
            "/auth/login",
            headers={"cschema": TENANT},
            json={"username": USERNAME, "password": PASSWORD, "academic_year_id": self.year_id},
        )
        r.raise_for_status()
        body = r.json()
        self.token = body["access_token"]
        self.user_id = body["user"]["id"]

    def call(self, method, path, json=None, params=None, quiet=False, label=None):
        relogged = False
        for attempt in range(8):
            r = self.http.request(
                method, path, json=json, params=params, headers={"Authorization": f"Bearer {self.token}"}
            )
            if r.status_code == 401 and not relogged:
                relogged = True
                self.login()
                continue
            if r.status_code == 429:
                wait = min(float(r.headers.get("retry-after", 20)), 65) + 2
                print(f"   rate limited on {method} {path}, waiting {wait}s")
                time.sleep(wait)
                continue
            break
        try:
            data = r.json()
        except Exception:
            data = r.text
        if r.status_code >= 400 and not quiet:
            detail = data.get("detail") if isinstance(data, dict) else data
            FAILURES.append((SECTION[0], f"{method} {path}", r.status_code, str(label or "") + " " + str(detail)[:300]))
        return r.status_code, data


api = Api()


def section(name):
    SECTION[0] = name
    print(f"-- {name}")


def rows(data):
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        for key in ("items", "data", "results"):
            if isinstance(data.get(key), list):
                return data[key]
    return []


def ok(status):
    return 200 <= status < 300


def create(entity, method, path, body, label=None):
    status, data = api.call(method, path, json=body, label=label or entity)
    if ok(status):
        CREATED[entity] += 1
        return data
    return None


def existed(entity):
    EXISTING[entity] += 1


def fetch_all(path, params=None, page=100):
    out = []
    skip = 0
    while True:
        p = dict(params or {})
        p.update({"skip": skip, "limit": page})
        status, data = api.call("GET", path, params=p, quiet=True)
        if not ok(status):
            return out, status
        batch = rows(data)
        out.extend(batch)
        if isinstance(data, list) or len(batch) < page:
            return out, status
        skip += page


def section_prefix(code):
    return code[1:] if code.startswith("C") and code[1:].isdigit() else code


YEAR = {}
IDS = {}


def seed_masters():
    section("masters")
    yid = api.year_id
    IDS["year"] = yid
    status, data = api.call("GET", f"/masters/academic_years/{yid}")
    if ok(status):
        YEAR["start"] = date.fromisoformat(data["start_date"])
        YEAR["end"] = date.fromisoformat(data["end_date"])

    holidays = [
        ("Independence Day", "2026-08-15", "2026-08-15", "National holiday", "#16a34a"),
        ("Ganesh Chaturthi", "2026-09-14", "2026-09-14", "Festival holiday", "#f97316"),
        ("Gandhi Jayanti", "2026-10-02", "2026-10-02", "National holiday", "#16a34a"),
        ("Dasara Vacation", "2026-10-17", "2026-10-24", "Dasara festival break", "#eab308"),
        ("Diwali", "2026-11-08", "2026-11-08", "Festival of lights", "#f59e0b"),
        ("Christmas", "2026-12-25", "2026-12-25", "Christmas Day", "#dc2626"),
        ("Sankranti Break", "2027-01-13", "2027-01-16", "Pongal and Sankranti break", "#0ea5e9"),
        ("Republic Day", "2027-01-26", "2027-01-26", "National holiday", "#16a34a"),
    ]
    have, _ = fetch_all("/masters/holidays/", {"active_only": "false"})
    names = {h["name"] for h in have}
    for name, start, end, desc, color in holidays:
        if name in names:
            existed("holidays")
            continue
        create(
            "holidays",
            "POST",
            "/masters/holidays/",
            {
                "name": name,
                "description": desc,
                "start_date": start,
                "end_date": end,
                "is_active": True,
                "academic_year_id": yid,
                "color": color,
            },
        )

    class_defs = [
        ("Nursery", "NUR"),
        ("LKG", "LKG"),
        ("UKG", "UKG"),
        ("Class 1", "C1"),
        ("Class 2", "C2"),
        ("Class 3", "C3"),
        ("Class 4", "C4"),
        ("Class 5", "C5"),
    ]
    status, data = api.call("GET", "/masters/class_sections/read_all", quiet=True)
    have_classes = rows(data) if ok(status) else []
    have_names = {c["name"] for c in have_classes}
    for name, code in class_defs:
        if name in have_names:
            existed("classes")
            continue
        create(
            "classes",
            "POST",
            "/masters/class_sections/",
            {
                "name": name,
                "short_code": code,
                "academic_year_id": yid,
                "is_active": True,
                "sections": [
                    {"name": f"{section_prefix(code)}-A", "is_active": True},
                    {"name": f"{section_prefix(code)}-B", "is_active": True},
                ],
            },
        )
    status, data = api.call("GET", "/masters/class_sections/read_all", quiet=True)
    code_by_name = dict(class_defs)
    for c in rows(data):
        prefix = section_prefix(code_by_name.get(c["name"], c["name"]))
        for s in c.get("sections") or []:
            if s["name"] in ("A", "B"):
                api.call(
                    "PUT",
                    "/masters/class_sections/sections/" + s["id"],
                    json={"id": s["id"], "name": f"{prefix}-{s['name']}"},
                )
    status, data = api.call("GET", "/masters/class_sections/read_all", quiet=True)
    IDS["classes"] = {}
    for c in rows(data):
        secs = {s["name"]: s["id"] for s in (c.get("sections") or [])}
        IDS["classes"][c["name"]] = {"id": c["id"], "sections": secs}

    cat_names = ["Languages", "Core Academics", "Co-Curricular"]
    cats, _ = fetch_all("/masters/subject_categories/categories")
    cat_ids = {c["name"]: c["id"] for c in cats}
    for n in cat_names:
        if n in cat_ids:
            existed("subject_categories")
            continue
        d = create("subject_categories", "POST", "/masters/subject_categories/categories", {"name": n})
        if d:
            cat_ids[n] = d["id"]
    cats, _ = fetch_all("/masters/subject_categories/categories")
    cat_ids = {c["name"]: c["id"] for c in cats}

    subject_defs = [
        ("English", "ENG", "Languages"),
        ("Hindi", "HIN", "Languages"),
        ("Telugu", "TEL", "Languages"),
        ("Mathematics", "MAT", "Core Academics"),
        ("Environmental Studies", "EVS", "Core Academics"),
        ("General Science", "SCI", "Core Academics"),
        ("Social Studies", "SOC", "Core Academics"),
        ("Computer Science", "CMP", "Co-Curricular"),
        ("Art and Craft", "ART", "Co-Curricular"),
        ("Physical Education", "PED", "Co-Curricular"),
    ]
    have, _ = fetch_all("/masters/subjects/", {"active_only": "false"}, page=1000)
    subj_ids = {s["name"]: s["id"] for s in have}
    for name, code, cat in subject_defs:
        if name in subj_ids:
            existed("subjects")
            continue
        if cat not in cat_ids:
            continue
        d = create(
            "subjects",
            "POST",
            "/masters/subjects/",
            {
                "name": name,
                "short_code": code,
                "category_id": cat_ids[cat],
                "academic_year_id": yid,
                "is_active": True,
            },
        )
        if d:
            subj_ids[name] = d["id"]
    have, _ = fetch_all("/masters/subjects/", {"active_only": "false"}, page=1000)
    IDS["subjects"] = {s["name"]: s["id"] for s in have}

    pre = ["English", "Mathematics", "Environmental Studies", "Art and Craft", "Hindi"]
    lower = [
        "English",
        "Hindi",
        "Telugu",
        "Mathematics",
        "Environmental Studies",
        "Computer Science",
        "Art and Craft",
        "Physical Education",
    ]
    upper = [
        "English",
        "Hindi",
        "Telugu",
        "Mathematics",
        "General Science",
        "Social Studies",
        "Computer Science",
        "Physical Education",
    ]
    plan = {
        "Nursery": pre,
        "LKG": pre,
        "UKG": pre,
        "Class 1": lower,
        "Class 2": lower,
        "Class 3": upper,
        "Class 4": upper,
        "Class 5": upper,
    }
    for cname, subs in plan.items():
        c = IDS["classes"].get(cname)
        if not c:
            continue
        for sname, sid in c["sections"].items():
            status, data = api.call("GET", "/masters/class-subject-mappings/by-class/" + c["id"], quiet=True)
            mapped = set()
            if ok(status):
                for m in rows(data):
                    if m.get("section_id") == sid and m.get("is_active", True):
                        mapped.add(m.get("subject_id"))
            wanted = [IDS["subjects"][s] for s in subs if s in IDS["subjects"]]
            if set(wanted) <= mapped:
                existed("class_subject_mappings")
                continue
            body = {
                "class_id": c["id"],
                "section_id": sid,
                "academic_year_id": yid,
                "subjects": [
                    {"subject_id": s, "order": i + 1, "exclude_marks": False, "is_active": True}
                    for i, s in enumerate(wanted)
                ],
            }
            d = create("class_subject_mappings_bulk_calls", "POST", "/masters/class-subject-mappings/bulk", body)
            if d is not None:
                CREATED["class_subject_mappings"] += len(wanted)


WEEKDAYS = [date(2026, 9, 25), date(2026, 9, 28), date(2026, 9, 29), date(2026, 9, 30), date(2026, 10, 1)]

STAFF = [
    ("Lakshmi Narayana", "Rao", "Male", "Principal", "Staff", 1982, 22, "M.Ed", 90000, "Hyderabad"),
    ("Sunitha", "Reddy", "Female", "Teacher", "Teacher", 1988, 12, "B.Ed", 60000, "Secunderabad"),
    ("Venkatesh", "Kumar", "Male", "Teacher", "Teacher", 1986, 14, "M.Sc, B.Ed", 55000, "Kukatpally"),
    ("Anjali", "Sharma", "Female", "Teacher", "Teacher", 1991, 8, "M.A, B.Ed", 48000, "Madhapur"),
    ("Ravi Teja", "Naidu", "Male", "Teacher", "Teacher", 1993, 6, "B.Sc, B.Ed", 42000, "Ameerpet"),
    ("Padmavathi", "Devi", "Female", "Accountant", "Staff", 1985, 15, "M.Com", 38000, "Dilsukhnagar"),
    ("Suresh", "Babu", "Male", "Clerk", "Staff", 1990, 9, "B.Com", 26000, "Uppal"),
    ("Ramesh", "Yadav", "Male", "Driver", "Staff", 1980, 18, "10th Class", 22000, "LB Nagar"),
    ("Mohan", "Singh", "Male", "Driver", "Staff", 1984, 11, "10th Class", 21000, "Kondapur"),
]


def staff_department(title):
    if title == "Driver":
        return "Transport"
    if title == "Teacher":
        return "Academics"
    return "Administration"


def seed_staff():
    section("staff")
    desig, _ = fetch_all("/staff/designations/")
    desig_ids = {d["title"]: d["id"] for d in desig}
    for title in ["Principal", "Teacher", "Accountant", "Clerk", "Driver"]:
        if title in desig_ids:
            existed("designations")
            continue
        d = create("designations", "POST", "/staff/designations/", {"title": title})
        if d:
            desig_ids[title] = d["id"]
    IDS["designations"] = desig_ids

    status, data = api.call("GET", "/auth/roles/roles/", quiet=True)
    role_ids = {r["name"]: r["id"] for r in rows(data)} if ok(status) else {}

    status, data = api.call("GET", "/staff/", quiet=True)
    have = {(x.get("email") or "").lower(): x for x in rows(data)} if ok(status) else {}
    for i, (first, last, gender, title, role, yob, exp, qual, salary, area) in enumerate(STAFF):
        email = f"{first.split()[0].lower()}.{last.lower()}@example.com"
        if email in have:
            existed("staff")
            continue
        body = {
            "first_name": first,
            "last_name": last,
            "email": email,
            "phone": f"9000010{i + 1:03d}",
            "gender": gender,
            "date_of_birth": f"{yob}-0{(i % 9) + 1}-1{i % 9}",
            "joining_date": f"{2026 - min(exp, 8)}-06-01",
            "qualification": qual,
            "experience_years": exp,
            "address": f"{10 + i}-{i + 2}-{30 + i}, {area}, Hyderabad, Telangana",
            "designation_id": desig_ids.get(title),
            "department": staff_department(title),
            "is_active": True,
            "current_salary": salary,
            "last_drawn_salary": salary - 3000,
            "bank_name": "State Bank of India",
            "bank_branch": area,
            "account_number": f"3012345600{i + 1:02d}",
            "ifsc_code": "SBIN0001234",
            "account_holder_name": f"{first} {last}",
            "account_type": "Savings",
        }
        if role in role_ids:
            body["role_id"] = role_ids[role]
        create("staff", "POST", "/staff/enrollment", body)

    status, data = api.call("GET", "/staff/", quiet=True)
    staff = rows(data) if ok(status) else []
    IDS["staff"] = [x["id"] for x in staff]
    IDS["staff_rows"] = staff

    statuses = [
        "present",
        "present",
        "present",
        "late",
        "present",
        "present",
        "absent",
        "present",
        "half_day",
        "present",
    ]
    for d_i, day in enumerate(WEEKDAYS):
        status, data = api.call("GET", f"/staff/attendance/by-date/{day.isoformat()}", quiet=True)
        done = {r.get("staff_id") for r in rows(data)} if ok(status) else set()
        for s_i, sid in enumerate(IDS["staff"]):
            if sid in done:
                existed("staff_attendance")
                continue
            st = statuses[(s_i * 3 + d_i * 2) % len(statuses)]
            create(
                "staff_attendance",
                "POST",
                "/staff/attendance",
                {
                    "staff_id": sid,
                    "date": day.isoformat(),
                    "status": st,
                    "remarks": "Marked by admin" if st != "present" else None,
                },
            )


FAMILIES = [
    ("Ramesh", "Sunita", "Gupta", [("Aarav", "Male", "Nursery")]),
    ("Prakash", "Lavanya", "Reddy", [("Ananya", "Female", "Nursery"), ("Karthik", "Male", "Class 3")]),
    ("Srinivas", "Madhavi", "Rao", [("Vihaan", "Male", "Nursery")]),
    ("Anil", "Deepa", "Kumar", [("Ishita", "Female", "LKG")]),
    ("Mahesh", "Rekha", "Patel", [("Dhruv", "Male", "LKG")]),
    ("Suresh", "Kavitha", "Naidu", [("Sai Kiran", "Male", "LKG")]),
    ("Rajesh", "Anitha", "Sharma", [("Myra", "Female", "UKG")]),
    ("Vijay", "Swathi", "Chowdary", [("Rohan", "Male", "UKG")]),
    ("Naresh", "Bhavani", "Goud", [("Diya", "Female", "UKG")]),
    ("Satish", "Pooja", "Mehta", [("Advik", "Male", "Class 1")]),
    ("Ganesh", "Jyothi", "Iyer", [("Saanvi", "Female", "Class 1")]),
    ("Venkat", "Sirisha", "Raju", [("Harsha", "Male", "Class 1"), ("Tanvi", "Female", "Class 4")]),
    ("Kiran", "Meena", "Verma", [("Kavya", "Female", "Class 1")]),
    ("Balaji", "Radha", "Krishnan", [("Nikhil", "Male", "Class 1")]),
    ("Mohit", "Aruna", "Singh", [("Riya", "Female", "Class 2")]),
    ("Harish", "Padma", "Yadav", [("Arjun", "Male", "Class 2")]),
    ("Sandeep", "Neha", "Jain", [("Aditi", "Female", "Class 2")]),
    ("Ravi", "Shobha", "Menon", [("Rahul", "Male", "Class 2")]),
    ("Manoj", "Divya", "Agarwal", [("Navya", "Female", "Class 3")]),
    ("Dinesh", "Latha", "Bhat", [("Yash", "Male", "Class 3")]),
    ("Praveen", "Sandhya", "Varma", [("Pranavi", "Female", "Class 3")]),
    ("Ashok", "Usha", "Pillai", [("Vivaan", "Male", "Class 4")]),
    ("Narayana", "Geetha", "Murthy", [("Sneha", "Female", "Class 4"), ("Teja", "Male", "Class 5")]),
    ("Sunil", "Mamatha", "Joshi", [("Ayaan", "Male", "Class 4")]),
    ("Rakesh", "Vani", "Thakur", [("Meera", "Female", "Class 5")]),
    ("Chandra", "Kalyani", "Shekar", [("Kabir", "Male", "Class 5")]),
    ("Gopal", "Rani", "Das", [("Prisha", "Female", "Class 5")]),
]

AGE = {"Nursery": 4, "LKG": 5, "UKG": 6, "Class 1": 7, "Class 2": 8, "Class 3": 9, "Class 4": 10, "Class 5": 11}
SALARY = ["below_1l", "1l_3l", "3l_5l", "5l_10l", "above_10l"]
OCCUPATIONS = [
    "Software Engineer",
    "Teacher",
    "Business Owner",
    "Bank Officer",
    "Doctor",
    "Accountant",
    "Shop Owner",
    "Government Employee",
]
MOTHER_OCC = ["Homemaker", "Teacher", "Nurse", "Homemaker", "Tailor", "Accountant", "Homemaker", "Designer"]


def student_plan():
    plan = []
    counter = {}
    n = 0
    for f_i, (father, mother, last, kids) in enumerate(FAMILIES):
        for first, gender, cls in kids:
            n += 1
            counter[cls] = counter.get(cls, 0) + 1
            dob = date(2026 - AGE[cls], (n % 12) + 1, (n % 27) + 1)
            plan.append(
                {
                    "first": first,
                    "last": last,
                    "gender": gender,
                    "class": cls,
                    "section_idx": counter[cls] % 2,
                    "dob": dob.isoformat(),
                    "father": father,
                    "mother": mother,
                    "f_idx": f_i,
                    "n": n,
                }
            )
    return plan


def student_entry(d_id, adm_no, p, sec_name, cls, sec_id):
    return {
        "id": d_id,
        "admission_number": adm_no,
        "class": p["class"],
        "section": sec_name,
        "class_id": cls["id"],
        "section_id": sec_id,
        "name": f"{p['first']} {p['last']}",
        "father_email": f"{p['father'].lower()}.{p['last'].lower()}@example.com",
    }


def seed_students():
    section("students")
    admission_date = "2026-06-10"
    existing, st = fetch_all("/students/admission/students/dropdown", {"active_only": "false"}, page=1000)
    if st >= 400:
        existing = []
    have = {(x.get("first_name"), x.get("last_name")): x for x in existing}
    IDS["students"] = []
    for p in student_plan():
        cls = IDS["classes"].get(p["class"])
        if not cls:
            continue
        sec_names = sorted(cls["sections"])
        sec_name = sec_names[p["section_idx"] % len(sec_names)]
        sec_id = cls["sections"][sec_name]
        key = (p["first"], p["last"])
        if key in have:
            existed("students")
            IDS["students"].append(
                student_entry(have[key]["id"], have[key].get("admission_number"), p, sec_name, cls, sec_id)
            )
            continue
        f_idx = p["f_idx"]
        pre = p["class"] in ("Nursery", "LKG", "UKG")
        slug = f"{p['father'].lower()}.{p['last'].lower()}"
        body = {
            "admission_date": admission_date,
            "admission_type": "pre_primary" if pre else "regular",
            "academic_year_id": api.year_id,
            "admitted_academic_year_id": api.year_id,
            "admitted_class_id": cls["id"],
            "admitted_section_id": sec_id,
            "current_class_id": cls["id"],
            "current_section_id": sec_id,
            "address_line1": f"{20 + f_idx}-{f_idx + 3}-{100 + f_idx}, Sri Nagar Colony",
            "address_line2": "Near Community Hall",
            "city": "Hyderabad",
            "is_previous_school": (not pre) and p["class"] != "Class 1",
            "previous_school_name": "Little Stars Public School" if ((not pre) and p["class"] != "Class 1") else None,
            "student": {
                "first_name": p["first"],
                "last_name": p["last"],
                "date_of_birth": p["dob"],
                "gender": p["gender"],
                "is_primary": "primary" if pre else "not_primary",
                "nationality": "Indian",
                "mother_tongue": "Telugu" if f_idx % 3 else "Hindi",
                "primary_phone": f"90001{f_idx + 1:05d}",
                "father": {
                    "name": f"{p['father']} {p['last']}",
                    "email": f"{slug}@example.com",
                    "phone": f"90001{f_idx + 1:05d}",
                    "occupation": OCCUPATIONS[f_idx % len(OCCUPATIONS)],
                    "gender": "Male",
                    "relation_to_student": "Father",
                    "salary_range": SALARY[f_idx % len(SALARY)],
                },
                "mother": {
                    "name": f"{p['mother']} {p['last']}",
                    "email": f"{p['mother'].lower()}.{p['last'].lower()}@example.com",
                    "phone": f"90002{f_idx + 1:05d}",
                    "occupation": MOTHER_OCC[f_idx % len(MOTHER_OCC)],
                    "gender": "Female",
                    "relation_to_student": "Mother",
                    "salary_range": SALARY[(f_idx + 1) % len(SALARY)],
                },
            },
        }
        d = create("students", "POST", "/students/admission/", body, label=f"{p['first']} {p['last']}")
        if d:
            IDS["students"].append(
                student_entry(d["student"]["id"], d.get("admission_number"), p, sec_name, cls, sec_id)
            )

    section("student attendance")
    pattern = ["present"] * 11 + ["absent", "late", "present", "present", "leave", "half_day"]
    for d_i, day in enumerate(WEEKDAYS):
        status, data = api.call("GET", f"/student/attendance/by-date/{day.isoformat()}", quiet=True)
        done = {r.get("student_id") for r in rows(data)} if ok(status) else set()
        for s_i, stu in enumerate(IDS["students"]):
            if stu["id"] in done:
                existed("student_attendance")
                continue
            st = pattern[(s_i * 7 + d_i * 5) % len(pattern)]
            create(
                "student_attendance",
                "POST",
                "/student/attendance/",
                {"student_id": stu["id"], "date": day.isoformat(), "status": st, "remarks": None},
            )


TUITION = {
    "Nursery": 18000,
    "LKG": 21000,
    "UKG": 24000,
    "Class 1": 27000,
    "Class 2": 30000,
    "Class 3": 33000,
    "Class 4": 36000,
    "Class 5": 39000,
}


def split_amount(total, n):
    each = round(total / n, 2)
    return [each] * n


def seed_fee_structure():
    section("fee structure")
    yid = api.year_id
    terms_def = [
        ("Three Terms", ["2026-06-15", "2026-10-15", "2027-01-15"]),
        ("Annual", ["2026-06-30"]),
        ("Half Yearly", ["2026-06-15", "2026-12-01"]),
    ]
    have, _ = fetch_all("/fee/terms/", {"academic_year_id": yid})
    term_ids = {t["term_name"]: t["id"] for t in have}
    for name, dates in terms_def:
        if name in term_ids:
            existed("fee_terms")
            continue
        d = create(
            "fee_terms",
            "POST",
            "/fee/terms/",
            {
                "term_name": name,
                "term_status": "active",
                "number_of_terms": len(dates),
                "academic_year_id": yid,
                "fee_term_dates": [{"fee_term_date": x} for x in dates],
            },
        )
        if d:
            term_ids[name] = d["id"]
    IDS["fee_terms"] = term_ids
    IDS["term_dates"] = {}
    for name, tid in term_ids.items():
        status, data = api.call("GET", f"/fee/terms/{tid}/dates", quiet=True)
        dates = rows(data) if ok(status) else []
        dates.sort(key=lambda x: x.get("fee_term_date"))
        IDS["term_dates"][name] = [x["id"] for x in dates]

    have, _ = fetch_all("/fee/categories/", {"academic_year_id": yid})
    cat_ids = {c["category_name"]: c["id"] for c in have}
    for name in ["Academic Fees", "Facility Fees"]:
        if name in cat_ids:
            existed("fee_categories")
            continue
        d = create(
            "fee_categories",
            "POST",
            "/fee/categories/",
            {"category_name": name, "category_status": "active", "academic_year_id": yid},
        )
        if d:
            cat_ids[name] = d["id"]

    types_def = [
        ("Tuition Fee", "Academic Fees", "Three Terms"),
        ("Admission Fee", "Academic Fees", "Annual"),
        ("Books and Stationery", "Academic Fees", "Annual"),
        ("Activity Fee", "Facility Fees", "Half Yearly"),
    ]
    have, _ = fetch_all("/fee/types/", {"academic_year_id": yid})
    type_ids = {t["type_name"]: t["id"] for t in have}
    for name, cat, term in types_def:
        if name in type_ids:
            existed("fee_types")
            continue
        if cat not in cat_ids or term not in term_ids:
            continue
        d = create(
            "fee_types",
            "POST",
            "/fee/types/",
            {
                "type_name": name,
                "fee_category_id": cat_ids[cat],
                "fee_status": "active",
                "fee_term_id": term_ids[term],
                "academic_year_id": yid,
            },
        )
        if d:
            type_ids[name] = d["id"]
    IDS["fee_types"] = type_ids
    IDS["fee_type_term"] = {n: t for n, _, t in types_def}

    def class_fee(type_name, cls):
        if type_name == "Tuition Fee":
            return TUITION[cls]
        if type_name == "Admission Fee":
            return 5000
        if type_name == "Books and Stationery":
            return 2400 if cls in ("Nursery", "LKG", "UKG") else 3600
        return 2000

    IDS["class_fee"] = class_fee
    have, _ = fetch_all("/fee/class-mappings/", {"limit": 100, "offset": 0}, page=100)
    if not have:
        status, data = api.call("GET", "/fee/class-mappings/", params={"limit": 100}, quiet=True)
        have = rows(data) if ok(status) else []
    mapped = {(m["class_id"], m["fee_type_id"]): m for m in have}
    for cname, c in IDS["classes"].items():
        for tname, tid in type_ids.items():
            key = (c["id"], tid)
            if key in mapped:
                existed("fee_class_mappings")
                continue
            d = create(
                "fee_class_mappings",
                "POST",
                "/fee/class-mappings/",
                {
                    "class_id": c["id"],
                    "fee_type_id": tid,
                    "total_fee": class_fee(tname, cname),
                    "academic_year_id": yid,
                    "all_by_default": tname in ("Tuition Fee", "Admission Fee"),
                },
                label=f"{cname}/{tname}",
            )
            if d:
                mapped[key] = d
    IDS["class_mappings"] = mapped

    for (cid, tid), m in mapped.items():
        status, data = api.call("GET", f"/fee/class-mapping-term-amounts/by-mapping/{m['id']}", quiet=True)
        if ok(status) and rows(data):
            existed("fee_class_term_amounts")
            continue
        tname = next((n for n, i in type_ids.items() if i == tid), None)
        dates = IDS["term_dates"].get(IDS["fee_type_term"].get(tname), [])
        if not dates:
            continue
        total = float(m["total_fee"])
        per = split_amount(total, len(dates))
        create(
            "fee_class_term_amounts",
            "POST",
            "/fee/class-mapping-term-amounts/",
            {
                "fee_class_mapping_id": m["id"],
                "term_amounts": [{"term_date_id": dt, "term_amount": a} for dt, a in zip(dates, per)],
            },
        )


def seed_fee_student_mappings():
    section("fee student mappings")
    yid = api.year_id
    type_ids = IDS.get("fee_types", {})
    class_fee = IDS.get("class_fee")
    if not type_ids or not class_fee:
        return
    groups = {}
    for stu in IDS.get("students", []):
        groups.setdefault((stu["class"], stu["section"], stu["class_id"], stu["section_id"]), []).append(stu)
    for (cname, sname, cid, sid), studs in groups.items():
        for tname, tid in type_ids.items():
            status, data = api.call(
                "GET",
                "/fee/student-mappings/",
                params={"class_id": cid, "section_id": sid, "fee_type_id": tid, "academic_year_id": yid, "limit": 100},
                quiet=True,
            )
            done = {m["student_id"] for m in rows(data)} if ok(status) else set()
            missing = [s["id"] for s in studs if s["id"] not in done]
            EXISTING["fee_student_mappings"] += len(studs) - len(missing)
            if not missing:
                continue
            d = create(
                "fee_student_mapping_calls",
                "POST",
                "/fee/student-mappings/bulk",
                {
                    "student_ids": missing,
                    "class_id": cid,
                    "section_id": sid,
                    "fee_type_id": tid,
                    "total_fee": class_fee(tname, cname),
                    "academic_year_id": yid,
                },
                label=f"{cname}-{sname}/{tname}",
            )
            if d is not None:
                CREATED["fee_student_mappings"] += len(missing)


def payment_extra(method, n):
    if method == "upi":
        return {"upi_reference": f"UPI26{n:06d}"}
    if method == "bank_transfer":
        return {"bank_reference": f"NEFT26{n:07d}"}
    if method == "cheque":
        return {"cheque_number": f"{480100 + n}", "cheque_bank": "HDFC Bank", "cheque_date": "2026-10-01"}
    return {}


def seed_fee_payments():
    section("fee payments")
    studs = IDS.get("students", [])
    types = IDS.get("fee_types", {})
    class_fee = IDS.get("class_fee")
    if not studs or not types or not class_fee:
        return
    methods = ["cash", "upi", "cash", "bank_transfer", "upi", "cash", "upi", "cash"]
    transactions = []
    for i, stu in enumerate(studs):
        status, data = api.call(
            "GET",
            "/fee/transactions/",
            params={"student_id": stu["id"], "academic_year_id": api.year_id, "limit": 5},
            quiet=True,
        )
        prior = rows(data) if ok(status) else []
        if prior:
            existed("fee_payments")
            transactions.append((stu, prior[0]))
            continue
        mode = i % 5
        if mode == 4:
            continue
        cname = stu["class"]
        fee = {t: class_fee(t, cname) for t in types}
        if mode == 0:
            picks = {t: fee[t] for t in types}
        elif mode == 1:
            picks = {
                "Admission Fee": fee["Admission Fee"],
                "Tuition Fee": round(fee["Tuition Fee"] / 3, 2),
                "Books and Stationery": fee["Books and Stationery"],
            }
        elif mode == 2:
            picks = {"Admission Fee": fee["Admission Fee"], "Tuition Fee": round(fee["Tuition Fee"] / 6, 2)}
        else:
            picks = {"Admission Fee": fee["Admission Fee"]}
        method = methods[i % len(methods)]
        body = {
            "student_id": stu["id"],
            "academic_year_id": api.year_id,
            "amount_to_pay": round(sum(picks.values()), 2),
            "fee_items": [{"fee_type_id": types[t], "amount": a} for t, a in picks.items() if t in types],
            "payment_method": method,
            "send_sms": False,
            "print_duplicate": False,
            "remarks": "Demo payment",
        }
        body.update(payment_extra(method, i + 1))
        d = create("fee_payments", "POST", "/fee/collection/pay", body, label=stu["name"])
        if d is not None:
            st2, d2 = api.call(
                "GET",
                "/fee/transactions/",
                params={"student_id": stu["id"], "academic_year_id": api.year_id, "limit": 5},
                quiet=True,
            )
            tx = rows(d2)
            if ok(st2) and tx:
                transactions.append((stu, tx[0]))

    section("fee refunds")
    status, data = api.call("GET", "/fee/refunds/", params={"limit": 50}, quiet=True)
    existing_refunds = rows(data) if ok(status) else []
    EXISTING["fee_refunds"] += len(existing_refunds)
    done_tx = {r.get("fee_transaction_id") for r in existing_refunds}
    candidates = [
        (s, t)
        for s, t in transactions
        if t.get("status") == "completed" and t["id"] not in done_tx and float(t.get("total_amount", 0)) >= 3000
    ]
    if len(existing_refunds) < 2 and candidates:
        stu, tx = candidates[0]
        create(
            "fee_refunds",
            "POST",
            "/fee/refunds/",
            {
                "fee_transaction_id": tx["id"],
                "refund_amount": 1000,
                "refund_reason": "excess_payment",
                "detailed_reason": "Books and stationery kit returned unused",
                "student_id": stu["id"],
                "student_admission_num": stu["admission_number"],
                "academic_year_id": api.year_id,
                "requested_by_user_id": api.user_id,
            },
        )
        if len(candidates) > 1:
            stu2, tx2 = candidates[1]
            r2 = create(
                "fee_refunds",
                "POST",
                "/fee/refunds/",
                {
                    "fee_transaction_id": tx2["id"],
                    "refund_amount": 500,
                    "refund_reason": "fee_adjustment",
                    "detailed_reason": "Activity fee adjusted after sibling concession",
                    "student_id": stu2["id"],
                    "student_admission_num": stu2["admission_number"],
                    "academic_year_id": api.year_id,
                    "requested_by_user_id": api.user_id,
                },
            )
            if r2:
                a = api.call(
                    "POST",
                    "/fee/refunds/approve",
                    json={
                        "refund_id": r2["id"],
                        "action": "approve",
                        "approval_remarks": "Verified with accounts",
                        "approved_by_user_id": api.user_id,
                    },
                )
                if ok(a[0]):
                    CREATED["fee_refunds_approved"] += 1
                    p = api.call(
                        "POST",
                        "/fee/refunds/process",
                        json={
                            "refund_id": r2["id"],
                            "refund_method": "bank_transfer",
                            "refund_reference": "NEFTREF2601",
                            "processing_remarks": "Refunded to parent account",
                            "processed_by_user_id": api.user_id,
                        },
                    )
                    if ok(p[0]):
                        CREATED["fee_refunds_processed"] += 1

    section("fee concessions")
    if len(studs) > 1 and "Tuition Fee" in types:
        target = studs[1]
        cs, cd = api.call("GET", f"/fee/concessions/student/{target['id']}", params={"academic_year_id": api.year_id})
        if ok(cs):
            existing = cd.get("concessions") if isinstance(cd, dict) else cd
            if existing:
                existed("fee_concessions")
            else:
                create(
                    "fee_concessions",
                    "POST",
                    "/fee/concessions/bulk",
                    {
                        "student_id": target["id"],
                        "academic_year_id": api.year_id,
                        "concessions": [
                            {
                                "fee_type_id": types["Tuition Fee"],
                                "concession_amount": 2000,
                                "reason": "Sibling concession approved by management",
                                "approved_by": "principal",
                            }
                        ],
                    },
                )


GRADE_BANDS = [
    (90, 100, "A+", 10, "Outstanding", True),
    (80, 89.99, "A", 9, "Excellent", True),
    (70, 79.99, "B+", 8, "Very Good", True),
    (60, 69.99, "B", 7, "Good", True),
    (50, 59.99, "C", 6, "Satisfactory", True),
    (35, 49.99, "D", 5, "Needs Improvement", True),
    (0, 34.99, "E", 0, "Fail", False),
]

EXAM_SUBJECTS = {
    "Class 1": ["English", "Hindi", "Telugu", "Mathematics", "Environmental Studies"],
    "Class 2": ["English", "Hindi", "Telugu", "Mathematics", "Environmental Studies"],
    "Class 3": ["English", "Hindi", "Telugu", "Mathematics", "General Science", "Social Studies"],
    "Class 4": ["English", "Hindi", "Telugu", "Mathematics", "General Science", "Social Studies"],
    "Class 5": ["English", "Hindi", "Telugu", "Mathematics", "General Science", "Social Studies"],
}


def grade_bands():
    return [
        {
            "from_percent": a,
            "to_percent": b,
            "grade_label": g,
            "gpa": gpa,
            "remarks": r,
            "is_pass": p,
            "sort_order": i,
        }
        for i, (a, b, g, gpa, r, p) in enumerate(GRADE_BANDS)
    ]


def seed_exam_setup():
    section("exam setup")
    status, data = api.call("GET", "/grade-schemes/exam", quiet=True)
    have = {g["name"]: g for g in rows(data)} if ok(status) else {}
    if "Standard Percentage Grading" in have:
        existed("exam_grade_schemes")
        IDS["exam_scheme"] = have["Standard Percentage Grading"]["id"]
    else:
        d = create(
            "exam_grade_schemes",
            "POST",
            "/grade-schemes/exam",
            {
                "name": "Standard Percentage Grading",
                "description": "Overall grade on total percentage",
                "is_default": True,
                "bands": grade_bands(),
            },
        )
        IDS["exam_scheme"] = d["id"] if d else None

    status, data = api.call("GET", "/grade-schemes/subject", quiet=True)
    have = {g["name"]: g for g in rows(data)} if ok(status) else {}
    if "Subject Grading" in have:
        existed("subject_grade_schemes")
        IDS["subject_scheme"] = have["Subject Grading"]["id"]
    else:
        d = create(
            "subject_grade_schemes",
            "POST",
            "/grade-schemes/subject",
            {
                "name": "Subject Grading",
                "description": "Grade per subject",
                "is_default": True,
                "bands": grade_bands(),
            },
        )
        IDS["subject_scheme"] = d["id"] if d else None

    status, data = api.call("GET", "/board-patterns", quiet=True)
    have = {(b["board"], b["level"]) for b in rows(data)} if ok(status) else set()
    patterns = [
        (
            "primary",
            [
                ("Unit Test", "formative", 20, 4, 1),
                ("Half Yearly Examination", "summative", 30, 1, 2),
                ("Annual Examination", "summative", 50, 1, 3),
            ],
        ),
        (
            "pre_primary",
            [("Oral and Activity Assessment", "formative", 40, 2, 1), ("Annual Assessment", "summative", 60, 1, 2)],
        ),
    ]
    for level, types in patterns:
        if ("State", level) in have:
            existed("board_patterns")
            continue
        create(
            "board_patterns",
            "POST",
            "/board-patterns",
            {
                "board": "State",
                "level": level,
                "is_active": True,
                "exam_types": [
                    {
                        "exam_type_name": n,
                        "nature": nat,
                        "weightage_percent": w,
                        "count_per_year": c,
                        "sort_order": so,
                    }
                    for n, nat, w, c, so in types
                ],
            },
        )

    status, data = api.call("GET", "/exam-settings", quiet=True)
    if ok(status):
        existed("exam_settings")
    else:
        create(
            "exam_settings",
            "PUT",
            "/exam-settings",
            {
                "default_board": "State",
                "hall_ticket_min_attendance": 60,
                "grace_max_per_subject": 2,
                "grace_max_subjects": 1,
                "grace_auto_apply": False,
                "reconduct_max_failed_subjects": 2,
            },
        )


def build_exam_payload(
    name, nature, term, class_names, comps, dates_start, scheme_ids, attendance_range, only_section=None
):
    class_sections = []
    configs = []
    dates = []
    for cname in class_names:
        c = IDS["classes"].get(cname)
        if not c:
            continue
        targets = [(n, i) for n, i in sorted(c["sections"].items()) if only_section in (None, n)]
        for sname, sid in targets:
            class_sections.append({"class_id": c["id"], "section_id": sid})
            subs = [s for s in EXAM_SUBJECTS[cname] if s in IDS["subjects"]]
            for idx, sub in enumerate(subs):
                configs.append(
                    {
                        "class_id": c["id"],
                        "section_id": sid,
                        "subject_id": IDS["subjects"][sub],
                        "subject_grade_scheme_id": scheme_ids[1],
                        "sort_order": idx + 1,
                        "has_internal_external_split": False,
                        "components": [
                            {
                                "component_name": cn,
                                "entry_type": "marks",
                                "max_marks": mx,
                                "include_in_total": True,
                                "is_internal": False,
                                "sort_order": ci + 1,
                            }
                            for ci, (cn, mx) in enumerate(comps)
                        ],
                    }
                )
                d = next_weekday(dates_start, idx)
                dates.append(
                    {
                        "class_id": c["id"],
                        "section_id": sid,
                        "subject_id": IDS["subjects"][sub],
                        "exam_date": d.isoformat(),
                        "start_time": "09:30:00",
                        "end_time": "11:30:00",
                        "venue": f"Room {cname[-1] if cname[-1].isdigit() else 1}{sname[-1:] or 'A'}",
                        "notes": "Bring your own stationery",
                    }
                )
    exam = {
        "exam_name": name,
        "board": "State",
        "level": "primary",
        "exam_type": "Unit Test" if nature == "formative" else "Half Yearly Examination",
        "nature": nature,
        "is_internal": False,
        "academic_year_id": api.year_id,
        "exam_grade_scheme_id": scheme_ids[0],
        "term": term,
    }
    if attendance_range:
        exam["attendance_from_date"] = attendance_range[0]
        exam["attendance_to_date"] = attendance_range[1]
        exam["attendance_mode"] = "date_range"
    return {"exam": exam, "class_sections": class_sections, "subject_configs": configs, "exam_dates": dates}


def next_weekday(start, offset):
    d = start
    n = 0
    while True:
        if d.weekday() < 5:
            if n == offset:
                return d
            n += 1
        d += timedelta(days=1)


def pseudo_marks(seed, max_marks):
    h = (seed * 2654435761) % 1000
    pct = 0.38 + (h / 1000.0) * 0.6
    return round(max_marks * pct * 2) / 2


def seed_exams():
    section("exams")
    if not IDS.get("exam_scheme"):
        return
    status, data = api.call("GET", "/exams", params={"academic_year_id": api.year_id}, quiet=True)
    have = {e["exam_name"]: e for e in rows(data)} if ok(status) else {}
    schemes = (IDS["exam_scheme"], IDS.get("subject_scheme"))
    specs = [
        (
            "Unit Test 1 - Class 1B",
            "formative",
            "Term 1",
            ["Class 1"],
            [("Written", 25)],
            date(2026, 9, 16),
            ("2026-06-10", "2026-09-30"),
            "1-B",
        ),
        (
            "Half Yearly Examination 2026",
            "summative",
            "Term 1",
            ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5"],
            [("Written", 80), ("Internal Assessment", 20)],
            date(2026, 12, 7),
            ("2026-09-25", "2026-10-01"),
            None,
        ),
    ]
    IDS["exams"] = {}
    for name, nature, term, classes, comps, start, att, only_section in specs:
        if name in have:
            existed("exams")
            IDS["exams"][name] = have[name]["id"]
            continue
        payload = build_exam_payload(name, nature, term, classes, comps, start, schemes, att, only_section)
        d = create("exams", "POST", "/exams", payload, label=name)
        if d:
            exam_id = d.get("exam_id") or (d.get("exam") or d).get("id")
            IDS["exams"][name] = exam_id
            CREATED["exam_class_sections"] += len(payload["class_sections"])
            CREATED["exam_subject_configs"] += len(payload["subject_configs"])
            CREATED["exam_dates"] += len(payload["exam_dates"])
    for name, eid in IDS["exams"].items():
        status, data = api.call("GET", f"/exams/{eid}", quiet=True)
        if ok(status) and (data.get("status") == "draft" or (data.get("exam") or {}).get("status") == "draft"):
            a = api.call("POST", f"/exams/{eid}/activate", label=name)
            if ok(a[0]):
                CREATED["exams_activated"] += 1


def seed_exam_marks_and_results():
    section("exam marks")
    name = "Unit Test 1 - Class 1B"
    eid = IDS.get("exams", {}).get(name)
    if not eid:
        return
    status, data = api.call("GET", f"/exams/{eid}/results", quiet=True)
    if ok(status) and rows(data):
        existed("exam_results")
        return
    status, cfgs = api.call("GET", f"/exams/{eid}/subject-configs", quiet=True)
    if not ok(status):
        return
    for cfg in rows(cfgs):
        sec = cfg.get("section_id") or "00000000-0000-0000-0000-000000000000"
        st, grid = api.call(
            "GET",
            f"/exams/{eid}/marks",
            params={"class_id": cfg["class_id"], "section_id": sec, "subject_config_id": cfg["id"], "page_size": 100},
            label="marks grid",
        )
        if not ok(st):
            continue
        students = grid if isinstance(grid, list) else (grid.get("items") or [])
        comp_max = {c["id"]: float(c.get("max_marks") or 25) for c in cfg.get("components", [])}
        entries = []
        for s_i, srow in enumerate(students):
            for cid, mx in comp_max.items():
                seed = (s_i + 3) * 31 + sum(ord(ch) for ch in str(cfg["subject_id"])[:6]) + len(entries) * 7
                absent = (s_i + sum(ord(ch) for ch in str(cfg["subject_id"])[:2])) % 23 == 0
                entries.append(
                    {
                        "student_id": srow["student_id"],
                        "component_id": cid,
                        "marks_obtained": None if absent else pseudo_marks(seed, mx),
                        "is_absent": absent,
                    }
                )
        if entries:
            d = create(
                "exam_mark_batches",
                "POST",
                f"/exams/{eid}/marks",
                {"exam_id": eid, "subject_config_id": cfg["id"], "marks": entries, "attempt_number": 1},
                label="marks",
            )
            if d is not None:
                CREATED["exam_marks"] += len(entries)

    section("exam results")
    d = create("exam_results_computed", "POST", f"/exams/{eid}/compute", None, label="compute")
    api.call("POST", f"/exams/{eid}/publish", label="publish results")

    section("hall tickets")
    hid = IDS.get("exams", {}).get("Half Yearly Examination 2026")
    if hid:
        create(
            "hall_ticket_computations", "POST", f"/exams/{hid}/hall-tickets/compute", None, label="hall ticket compute"
        )
        api.call("POST", f"/exams/{hid}/hall-tickets/publish", label="hall ticket publish")


def seed_transport():
    section("transport")
    status, data = api.call("GET", "/masters/route-types/all", quiet=True)
    have = {t["type_name"] for t in rows(data)} if ok(status) else set()
    for name, desc in [("Pickup", "Home to school"), ("Drop", "School to home")]:
        if name in have:
            existed("route_types")
            continue
        create(
            "route_types", "POST", "/masters/route-types/", {"type_name": name, "description": desc, "is_active": True}
        )
    status, data = api.call("GET", "/masters/trip-types/all", quiet=True)
    have = {t["type_name"] for t in rows(data)} if ok(status) else set()
    for name, desc in [("Morning", "Morning run"), ("Evening", "Evening run")]:
        if name in have:
            existed("trip_types")
            continue
        create(
            "trip_types", "POST", "/masters/trip-types/", {"type_name": name, "description": desc, "is_active": True}
        )

    routes_def = [
        (
            "Route 1 - Kukatpally",
            "Kukatpally Bus Stand",
            "Demo School Campus",
            "07:00:00",
            "08:15:00",
            [
                ("Kukatpally Bus Stand", "07:00:00", "07:00:00", "17:15:00", 1200),
                ("KPHB Phase 1", "07:10:00", "07:10:00", "17:05:00", 1200),
                ("JNTU Junction", "07:20:00", "07:20:00", "16:55:00", 1000),
                ("Moosapet", "07:35:00", "07:35:00", "16:40:00", 900),
                ("Demo School Campus", "08:15:00", "08:15:00", "16:30:00", 0),
            ],
        ),
        (
            "Route 2 - Uppal",
            "Uppal Ring Road",
            "Demo School Campus",
            "07:15:00",
            "08:15:00",
            [
                ("Uppal Ring Road", "07:15:00", "07:15:00", "17:10:00", 1500),
                ("Habsiguda", "07:30:00", "07:30:00", "16:55:00", 1300),
                ("Tarnaka", "07:45:00", "07:45:00", "16:45:00", 1100),
                ("Demo School Campus", "08:15:00", "08:15:00", "16:30:00", 0),
            ],
        ),
    ]
    status, data = api.call("GET", "/masters/routes/all_routes", quiet=True)
    have_routes = {r["route_name"]: r for r in rows(data)} if ok(status) else {}
    route_ids = {}
    for name, start, end, st, et, stops in routes_def:
        if name in have_routes:
            existed("routes")
            route_ids[name] = have_routes[name]["id"]
            continue
        d = create(
            "routes",
            "POST",
            "/masters/routes/",
            {
                "route_name": name,
                "starting_stop": start,
                "ending_stop": end,
                "number_of_stops": len(stops),
                "route_type": "Pickup",
                "trip_type": "Morning",
                "start_time": st,
                "end_time": et,
                "is_active": True,
            },
        )
        if d:
            route_ids[name] = d["id"]
    IDS["route_ids"] = route_ids

    status, data = api.call("GET", "/masters/route-stops/", quiet=True)
    have_stops = {(s["route_id"], s["name"]): s for s in rows(data)} if ok(status) else {}
    stop_ids = {}
    for name, start, end, st, et, stops in routes_def:
        rid = route_ids.get(name)
        if not rid:
            continue
        for n, (sname, reach, pick, drop, fee) in enumerate(stops, start=1):
            if (rid, sname) in have_stops:
                existed("route_stops")
                stop_ids[(name, sname)] = have_stops[(rid, sname)]["id"]
                continue
            d = create(
                "route_stops",
                "POST",
                "/masters/route-stops/",
                {
                    "route_id": rid,
                    "name": sname,
                    "number": n,
                    "reaching_time": reach,
                    "pickup_time": pick,
                    "drop_time": drop,
                    "fees": fee,
                    "is_active": True,
                },
            )
            if d:
                stop_ids[(name, sname)] = d["id"]
    IDS["stop_ids"] = stop_ids

    vehicles_def = [
        ("School Bus 1", "TS09UA1234", "Bus", "Ramesh Yadav", 1, True),
        ("School Bus 2", "TS09UB5678", "Mini Bus", "Mohan Singh", 1, False),
    ]
    status, data = api.call("GET", "/masters/vehicles/", params={"active_only": "false"}, quiet=True)
    have_v = {v["registration_number"]: v for v in rows(data)} if ok(status) else {}
    vehicle_ids = {}
    for name, reg, vtype, driver, trips, ac in vehicles_def:
        if reg in have_v:
            existed("vehicles")
            vehicle_ids[reg] = have_v[reg]["id"]
            continue
        d = create(
            "vehicles",
            "POST",
            "/masters/vehicles/",
            {
                "name": name,
                "registration_number": reg,
                "vehicle_type": vtype,
                "last_inspected_date": "2026-05-20",
                "pollution_renewal_date": "2026-05-25",
                "fees": 1500,
                "driver_name": driver,
                "co_driver_name": "Helper Raju" if ac else "Helper Kishan",
                "driving_licence_no": f"TS09201100{len(reg) * 1111:05d}",
                "driving_licence_exp_date": "2031-03-31",
                "bus_insurance_vendor": "New India Assurance",
                "number_of_trips": 2,
                "insurance_expiry_date": "2027-03-31",
                "is_ac": ac,
                "is_active": True,
            },
        )
        if d:
            vehicle_ids[reg] = d["id"]
    IDS["vehicle_ids"] = vehicle_ids

    status, data = api.call("GET", "/staff/drivers", quiet=True)
    driver_ids = [d["user_id"] for d in rows(data)] if ok(status) else []
    status, data = api.call("GET", "/masters/trips/", quiet=True)
    have_t = {(t["vehicle_id"], t["route_id"]) for t in rows(data)} if ok(status) else set()
    trip_plan = [
        ("TS09UA1234", "Route 1 - Kukatpally", 0),
        ("TS09UB5678", "Route 2 - Uppal", 1),
    ]
    trips = {}
    for reg, rname, di in trip_plan:
        vid, rid = vehicle_ids.get(reg), route_ids.get(rname)
        if not vid or not rid:
            continue
        if (vid, rid) in have_t:
            existed("trips")
            continue
        body = {"vehicle_id": vid, "route_id": rid, "trip_number": 1}
        if driver_ids:
            body["driver_id"] = driver_ids[di % len(driver_ids)]
        create("trips", "POST", "/masters/trips/", body)
    status, data = api.call("GET", "/masters/trips/", quiet=True)
    for t in rows(data) if ok(status) else []:
        trips[(t["vehicle_id"], t["route_id"])] = t["id"]
    IDS["trips"] = trips

    status, data = api.call("GET", "/masters/transport-pricing/", quiet=True)
    have_p = {(p["vehicle_id"], p.get("route_id"), p["billing_cycle"]) for p in rows(data)} if ok(status) else set()
    pricing = [
        ("TS09UA1234", "Route 1 - Kukatpally", "annual", "Annual 2026-27", 12000),
        ("TS09UA1234", "Route 1 - Kukatpally", "monthly", "Monthly 2026-27", 1300),
        ("TS09UB5678", "Route 2 - Uppal", "annual", "Annual 2026-27", 14000),
        ("TS09UB5678", "Route 2 - Uppal", "semester", "Half Yearly 2026-27", 7500),
    ]
    for reg, rname, cycle, cname, amount in pricing:
        vid, rid = vehicle_ids.get(reg), route_ids.get(rname)
        if not vid or not rid:
            continue
        if (vid, rid, cycle) in have_p:
            existed("transport_pricing")
            continue
        create(
            "transport_pricing",
            "POST",
            "/masters/transport-pricing/",
            {
                "vehicle_id": vid,
                "route_id": rid,
                "billing_cycle": cycle,
                "cycle_name": cname,
                "amount": amount,
                "start_date": "2026-06-01",
                "end_date": "2027-03-31",
                "is_active": True,
            },
        )

    section("student transport")
    studs = IDS.get("students", [])
    status, data = api.call("GET", "/students/student-transport/", quiet=True)
    assigned = {a["student_id"] for a in rows(data)} if ok(status) else set()
    trip1 = trips.get((vehicle_ids.get("TS09UA1234"), route_ids.get("Route 1 - Kukatpally")))
    trip2 = trips.get((vehicle_ids.get("TS09UB5678"), route_ids.get("Route 2 - Uppal")))
    plan = [
        (trip1, "Route 1 - Kukatpally", ["Kukatpally Bus Stand", "KPHB Phase 1", "JNTU Junction"], 4000),
        (trip2, "Route 2 - Uppal", ["Uppal Ring Road", "Habsiguda", "Tarnaka"], 4667),
    ]
    picks = [s for s in studs if s["class"] in ("Class 1", "Class 2", "Class 3", "Class 4", "Class 5")][:8]
    for i, stu in enumerate(picks):
        if stu["id"] in assigned:
            existed("student_transport")
            continue
        trip, rname, stops, fee = plan[i % 2]
        if not trip:
            continue
        stop = IDS["stop_ids"].get((rname, stops[i % len(stops)]))
        if not stop:
            continue
        create(
            "student_transport",
            "POST",
            "/students/student-transport/",
            {"student_id": stu["id"], "trip_id": trip, "stop_id": stop, "fee_per_term": fee},
            label=stu["name"],
        )


def seed_expense():
    section("expense")
    cats = {
        "Infrastructure": ["Building Repairs", "Furniture and Fixtures"],
        "Utilities": ["Electricity Bill", "Water Bill", "Internet and Telephone"],
        "Academic Supplies": ["Stationery", "Lab Equipment"],
        "Transport and Fuel": ["Fuel", "Vehicle Maintenance"],
        "Events and Functions": ["Annual Day", "Sports Day"],
    }
    status, data = api.call("GET", "/expense/categories/", params={"active_only": "false"}, quiet=True)
    cat_ids = {c["name"]: c["id"] for c in rows(data)} if ok(status) else {}
    for name in cats:
        if name in cat_ids:
            existed("expense_categories")
            continue
        d = create(
            "expense_categories",
            "POST",
            "/expense/categories/",
            {"name": name, "description": f"{name} expenses", "is_active": True},
        )
        if d:
            cat_ids[name] = d["id"]

    status, data = api.call("GET", "/expense/departments/", params={"active_only": "false"}, quiet=True)
    dept_ids = {c["name"]: c["id"] for c in rows(data)} if ok(status) else {}
    for name in ["Administration", "Academics", "Transport", "Maintenance", "Sports"]:
        if name in dept_ids:
            existed("expense_departments")
            continue
        d = create(
            "expense_departments",
            "POST",
            "/expense/departments/",
            {"name": name, "description": f"{name} department", "is_active": True},
        )
        if d:
            dept_ids[name] = d["id"]

    status, data = api.call("GET", "/expense/types/", params={"active_only": "false"}, quiet=True)
    type_ids = {t["name"]: t["id"] for t in rows(data)} if ok(status) else {}
    for cname, tnames in cats.items():
        for tname in tnames:
            if tname in type_ids:
                existed("expense_types")
                continue
            if cname not in cat_ids:
                continue
            d = create(
                "expense_types",
                "POST",
                "/expense/types/",
                {"name": tname, "category_id": cat_ids[cname], "description": f"{tname} spend", "is_active": True},
            )
            if d:
                type_ids[tname] = d["id"]

    txs = [
        (
            "Electricity Bill",
            "Administration",
            18450,
            "2026-09-05",
            "Electricity bill for August 2026",
            "bank_transfer",
            "TSSPDCL",
            "BILL-AUG-2026",
            "approve",
            "Verified against meter reading",
        ),
        (
            "Water Bill",
            "Maintenance",
            3200,
            "2026-09-07",
            "Water tanker supply for September",
            "upi",
            "Sri Sai Water Suppliers",
            "WTR-0907",
            "approve",
            "Approved for payment",
        ),
        (
            "Internet and Telephone",
            "Administration",
            1499,
            "2026-09-10",
            "Broadband plan renewal for office",
            "upi",
            "ACT Fibernet",
            "ACT-26-1499",
            None,
            None,
        ),
        (
            "Stationery",
            "Academics",
            850,
            "2026-09-11",
            "Chart paper and markers for classrooms",
            "cash",
            "Balaji Book Depot",
            "CASH-0911",
            None,
            None,
        ),
        (
            "Fuel",
            "Transport",
            12000,
            "2026-09-12",
            "Diesel for school buses (September)",
            "cash",
            "Indian Oil Petrol Bunk",
            "FUEL-0912",
            None,
            None,
        ),
        (
            "Vehicle Maintenance",
            "Transport",
            7800,
            "2026-09-14",
            "Brake pad replacement for School Bus 1",
            "bank_transfer",
            "Sri Ganesh Auto Works",
            "INV-2231",
            "reject",
            "Quote is higher than the market rate, please get another quote",
        ),
        (
            "Annual Day",
            "Administration",
            45000,
            "2026-09-16",
            "Stage and decoration advance for Annual Day",
            "bank_transfer",
            "Vasavi Event Decorators",
            "EVT-ADV-01",
            "approve",
            "Approved by the principal",
        ),
        (
            "Lab Equipment",
            "Academics",
            22500,
            "2026-09-18",
            "Science lab models and charts",
            "bank_transfer",
            "Scientific Traders",
            "SCI-8841",
            None,
            None,
        ),
        (
            "Building Repairs",
            "Maintenance",
            65000,
            "2026-09-20",
            "Roof waterproofing for the primary block",
            "cheque",
            "Raju Constructions",
            "CHQ-480221",
            "approve",
            "Urgent repair approved",
        ),
        (
            "Furniture and Fixtures",
            "Administration",
            15750,
            "2026-09-22",
            "Ten student desks for Class 1",
            "bank_transfer",
            "Modern Furniture Mart",
            "FUR-1022",
            "reject",
            "Postpone to next quarter",
        ),
        (
            "Sports Day",
            "Sports",
            6400,
            "2026-09-25",
            "Trophies and medals for Sports Day",
            "upi",
            "Champion Sports",
            "SPT-0925",
            None,
            None,
        ),
        (
            "Fuel",
            "Transport",
            11500,
            "2026-09-28",
            "Diesel for school buses (late September)",
            "cash",
            "Indian Oil Petrol Bunk",
            "FUEL-0928",
            "approve",
            "Approved",
        ),
    ]
    status, data = api.call("GET", "/expense/transactions/", params={"limit": 200}, quiet=True)
    have = {t.get("idempotency_key"): t for t in rows(data)} if ok(status) else {}
    for i, (tname, dname, amount, day, desc, method, vendor, ref, action, comment) in enumerate(txs, start=1):
        key = f"demo-seed-expense-{i:02d}"
        tx = have.get(key)
        if tx:
            existed("expense_transactions")
        else:
            if tname not in type_ids:
                continue
            tx = create(
                "expense_transactions",
                "POST",
                "/expense/transactions/",
                {
                    "expense_type_id": type_ids[tname],
                    "amount": amount,
                    "transaction_date": day,
                    "description": desc,
                    "reference_number": ref,
                    "payment_method": method,
                    "vendor_name": vendor,
                    "department_id": dept_ids.get(dname),
                    "academic_year_id": api.year_id,
                    "idempotency_key": key,
                },
                label=desc,
            )
        if tx and action and tx.get("status", "pending") == "pending" and tx.get("requires_approval", True):
            a = api.call(
                "POST",
                f"/expense/transactions/{tx['id']}/approval",
                json={"action": action, "approval_comment": comment},
                label=desc,
            )
            if ok(a[0]):
                CREATED[f"expense_{action}s"] += 1


def count_of(path, params=None, page=100):
    status, data = api.call("GET", path, params=params, quiet=True)
    if not ok(status):
        return f"error {status}"
    if isinstance(data, dict) and "total_count" in data:
        return data["total_count"]
    return len(rows(data))


def verify():
    section("verify")
    yid = api.year_id
    exam_ids = IDS.get("exams", {})
    checks = [
        ("holidays", "/masters/holidays/", {"active_only": "false", "limit": 100}),
        ("subject categories", "/masters/subject_categories/categories", {"limit": 100}),
        ("subjects", "/masters/subjects/", {"active_only": "false", "limit": 1000}),
        ("designations", "/staff/designations/", {"limit": 100}),
        ("staff", "/staff/", None),
        ("students", "/students/admission/students/dropdown", {"active_only": "false"}),
        ("fee terms", "/fee/terms/", None),
        ("fee categories", "/fee/categories/", None),
        ("fee types", "/fee/types/", None),
        ("fee class mappings", "/fee/class-mappings/", {"limit": 500}),
        ("fee student mappings", "/fee/student-mappings/", {"limit": 500}),
        ("fee transactions", "/fee/transactions/", {"limit": 100}),
        ("fee receipts", "/fee/receipts/", {"limit": 100}),
        ("fee refunds", "/fee/refunds/", {"limit": 100}),
        ("exam grade schemes", "/grade-schemes/exam", None),
        ("subject grade schemes", "/grade-schemes/subject", None),
        ("board patterns", "/board-patterns", None),
        ("exams", "/exams", {"academic_year_id": yid}),
        ("route types", "/masters/route-types/all", None),
        ("trip types", "/masters/trip-types/all", None),
        ("routes", "/masters/routes/all_routes", None),
        ("route stops", "/masters/route-stops/", None),
        ("vehicles", "/masters/vehicles/", {"active_only": "false"}),
        ("trips", "/masters/trips/", None),
        ("transport pricing", "/masters/transport-pricing/", None),
        ("student transport", "/students/student-transport/", None),
        ("expense categories", "/expense/categories/", {"active_only": "false"}),
        ("expense departments", "/expense/departments/", {"active_only": "false"}),
        ("expense types", "/expense/types/", {"active_only": "false"}),
        ("expense transactions", "/expense/transactions/", {"limit": 200}),
    ]
    for eid_name, eid in exam_ids.items():
        checks.append((f"exam results [{eid_name}]", f"/exams/{eid}/results", None))
        checks.append((f"exam eligible hall tickets [{eid_name}]", f"/exams/{eid}/hall-tickets/eligible", None))
        checks.append((f"exam ineligible hall tickets [{eid_name}]", f"/exams/{eid}/hall-tickets/ineligible", None))
    status, data = api.call("GET", "/masters/class_sections/read_all", quiet=True)
    classes = rows(data) if ok(status) else []
    print(f"  classes: {len(classes)}")
    print(f"  sections: {sum(len(c.get('sections') or []) for c in classes)}")
    mapped = 0
    for c in classes:
        st, d = api.call("GET", f"/masters/class-subject-mappings/by-class/{c['id']}", quiet=True)
        mapped += len([m for m in rows(d) if m.get("is_active", True)]) if ok(st) else 0
    print(f"  class subject mappings: {mapped}")
    total_att = 0
    for day in WEEKDAYS:
        st, d = api.call("GET", f"/student/attendance/by-date/{day.isoformat()}", quiet=True)
        total_att += len(rows(d)) if ok(st) else 0
    print(f"  student attendance rows: {total_att}")
    total_att = 0
    for day in WEEKDAYS:
        st, d = api.call("GET", f"/staff/attendance/by-date/{day.isoformat()}", quiet=True)
        total_att += len(rows(d)) if ok(st) else 0
    print(f"  staff attendance rows: {total_att}")
    for label, path, params in checks:
        print(f"  {label}: {count_of(path, params)}")
    st, d = api.call("GET", "/expense/transactions/", params={"limit": 200}, quiet=True)
    if ok(st):
        by_status = Counter(t.get("status") for t in rows(d))
        print(f"  expense transaction statuses: {dict(by_status)}")
    st, d = api.call("GET", "/fee/transactions/", params={"limit": 100}, quiet=True)
    if ok(st):
        by_status = Counter(t.get("status") for t in rows(d))
        print(f"  fee transaction statuses: {dict(by_status)}")


def main():
    if not PASSWORD:
        print("DEMO_ADMIN_PASSWORD is not set")
        sys.exit(2)
    api.login()
    print(f"logged in to tenant {TENANT} as {USERNAME}, year {api.year_id}")
    steps = [
        seed_masters,
        seed_staff,
        seed_students,
        seed_fee_structure,
        seed_fee_student_mappings,
        seed_fee_payments,
        seed_exam_setup,
        seed_exams,
        seed_exam_marks_and_results,
        seed_transport,
        seed_expense,
        verify,
    ]
    for step in steps:
        try:
            step()
        except Exception as e:
            FAILURES.append((step.__name__, "exception", 0, repr(e)[:300]))
    print("== created")
    for k, v in sorted(CREATED.items()):
        print(f"  {k}: {v}")
    print("== already existing (skipped)")
    for k, v in sorted(EXISTING.items()):
        print(f"  {k}: {v}")
    print("== failures")
    grouped = Counter()
    sample = {}
    for sec, ep, code, detail in FAILURES:
        key = (sec, ep, code)
        grouped[key] += 1
        sample.setdefault(key, detail)
    for key, n in grouped.items():
        print(f"   [{key[0]}] {key[1]} -> {key[2]} x{n}: {sample[key]}")


if __name__ == "__main__":
    main()
