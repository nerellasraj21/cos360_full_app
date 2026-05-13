"""
Rebuild context/COS360_Roles_Permissions.docx as the source of truth.
Data sourced 100% from seed_endpoints.py _ROLE_PERMISSIONS — nothing invented.
"""

from docx import Document
from docx.shared import Pt, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement


# ── helpers ──────────────────────────────────────────────────────────────────
def shade(cell, hex_color):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_color)
    tcPr.append(shd)


def make_header_row(table, texts, bg="2C3E50", fg="FFFFFF"):
    row = table.rows[0].cells
    for i, txt in enumerate(texts):
        row[i].text = txt
        shade(row[i], bg)
        for p in row[i].paragraphs:
            for run in p.runs:
                run.bold = True
                run.font.color.rgb = RGBColor(*bytes.fromhex(fg))
                run.font.size = Pt(9)


def add_heading(doc, text, level):
    h = doc.add_heading(text, level=level)
    sizes = {1: 13, 2: 11, 3: 10}
    for run in h.runs:
        run.font.size = Pt(sizes.get(level, 10))
    return h


def set_cell_font(cell, size=9, bold=False, color=None, italic=False):
    for p in cell.paragraphs:
        for run in p.runs:
            run.font.size = Pt(size)
            run.bold = bold
            run.italic = italic
            if color:
                run.font.color.rgb = RGBColor(*bytes.fromhex(color))


# ── exact data from seed_endpoints.py _ROLE_PERMISSIONS ──────────────────────
ROLES = [
    ("Admin",   "System administrator. Full access to every resource and action seeded."),
    ("Staff",   "Administrative staff. Can create/update student, fee, transport, expense records. Cannot delete student data or approve fees/expenses."),
    ("Teacher", "Teaching staff. Read-only on academic masters; can create/update attendance and exam marks. No fee access."),
    ("Student", "Student user. Read/list own personal data only."),
    ("Parent",  "Parent user. Read/list linked children data only. No write access."),
]

ROLE_COLOURS = {
    "Admin":   ("1A5276", "D6EAF8"),
    "Staff":   ("1E8449", "D5F5E3"),
    "Teacher": ("7D6608", "FDFBD8"),
    "Student": ("6C3483", "F5EEF8"),
    "Parent":  ("784212", "FEF9E7"),
}

# Resource -> {role: [actions]}
# Copied directly from seed_endpoints.py — no additions.
PERMS = {
    # ── Academic / Masters ────────────────────────────────────────────────────
    "academic_years": {
        "Admin":   ["create", "read", "update", "delete", "list"],
        "Staff":   ["read", "list"],
        "Teacher": ["read", "list"],
        "Student": ["read", "list"],
        "Parent":  ["read", "list"],
    },
    "classes": {
        "Admin":   ["create", "read", "update", "delete", "list"],
        "Staff":   ["read", "list"],
        "Teacher": ["read", "list"],
        "Student": ["read", "list"],
        "Parent":  ["read", "list"],
    },
    "sections": {
        "Admin":   [],
        "Staff":   ["read", "list"],
        "Teacher": ["read", "list"],
        "Student": [],
        "Parent":  [],
    },
    "subjects": {
        "Admin":   ["create", "read", "update", "delete", "list"],
        "Staff":   ["read", "list"],
        "Teacher": ["read", "list"],
        "Student": ["read", "list"],
        "Parent":  ["read", "list"],
    },
    "subject_categories": {
        "Admin":   ["create", "read", "update", "delete", "list"],
        "Staff":   ["read", "list"],
        "Teacher": ["read", "list"],
        "Student": [],
        "Parent":  [],
    },
    "class_subject_mappings": {
        "Admin":   ["create", "read", "update", "delete", "list"],
        "Staff":   ["read", "list"],
        "Teacher": ["read", "list"],
        "Student": [],
        "Parent":  [],
    },
    "designations": {
        "Admin":   ["create", "read", "update", "delete", "list"],
        "Staff":   ["read", "list"],
        "Teacher": ["read", "list"],
        "Student": [],
        "Parent":  [],
    },
    "locations": {
        "Admin":   ["create", "read", "update", "delete", "list"],
        "Staff":   ["read", "list"],
        "Teacher": ["read", "list"],
        "Student": [],
        "Parent":  [],
    },
    "castes": {
        "Admin":   ["create", "read", "update", "delete", "list"],
        "Staff":   ["read", "list"],
        "Teacher": ["read", "list"],
        "Student": [],
        "Parent":  [],
    },
    "certificate_types": {
        "Admin":   ["create", "read", "update", "delete", "list"],
        "Staff":   ["read", "list"],
        "Teacher": ["read", "list"],
        "Student": ["read", "list"],
        "Parent":  [],
    },
    "holiday_management": {
        "Admin":   ["create", "read", "update", "delete", "list"],
        "Staff":   ["read", "list"],
        "Teacher": ["read", "list"],
        "Student": [],
        "Parent":  [],
    },
    # ── Staff / Parents master ────────────────────────────────────────────────
    "staff": {
        "Admin":   ["create", "read", "update", "delete", "list"],
        "Staff":   ["read", "list"],
        "Teacher": [],
        "Student": [],
        "Parent":  [],
    },
    "parent_management": {
        "Admin":   ["create", "read", "update", "delete", "list"],
        "Staff":   ["create", "read", "update", "list"],
        "Teacher": [],
        "Student": [],
        "Parent":  [],
    },
    # ── Students ──────────────────────────────────────────────────────────────
    "students": {
        "Admin":   ["list"],
        "Staff":   ["list"],
        "Teacher": ["list"],
        "Student": [],
        "Parent":  [],
    },
    "student_admissions": {
        "Admin":   ["create", "read", "update", "delete"],  # list NOT seeded for Admin
        "Staff":   ["create", "read", "update", "list"],
        "Teacher": ["read", "list"],
        "Student": ["read_own", "list_own"],
        "Parent":  ["read_related", "list_related"],
    },
    "student_attendance": {
        "Admin":   ["create", "read", "update", "delete", "list"],
        "Staff":   ["create", "read", "update", "list"],
        "Teacher": ["create", "read", "update", "list"],
        "Student": ["read_own", "list_own"],
        "Parent":  ["read_related", "list_related"],
    },
    "student_certificates": {
        "Admin":   ["create", "read", "update", "delete", "list"],
        "Staff":   ["create", "read", "update", "list"],
        "Teacher": ["read", "list"],
        "Student": ["read_own", "list_own"],
        "Parent":  ["read_related", "list_related"],
    },
    "student_documents": {
        "Admin":   ["create", "read", "update", "delete", "list"],
        "Staff":   ["create", "read", "update", "list"],
        "Teacher": ["read", "list"],
        "Student": ["read_own", "list_own"],
        "Parent":  ["read_related", "list_related"],
    },
    "student_transport": {
        "Admin":   ["create", "read", "update", "delete", "list"],
        "Staff":   ["create", "read", "update", "list"],
        "Teacher": [],
        "Student": ["read_own"],           # list_own NOT seeded
        "Parent":  ["read_related"],       # list_related NOT seeded
    },
    "profile": {
        "Admin":   [],
        "Staff":   [],
        "Teacher": [],
        "Student": ["read_own", "update_own"],
        "Parent":  [],
    },
    # ── Exam ──────────────────────────────────────────────────────────────────
    "exams": {
        "Admin":   ["create", "read", "update", "delete", "list"],
        "Staff":   ["read", "list"],
        "Teacher": ["read", "list"],
        "Student": ["read", "list"],
        "Parent":  ["read", "list"],
    },
    "exam_marks": {
        "Admin":   ["create", "read", "list"],
        "Staff":   ["read", "list"],
        "Teacher": ["create", "read", "list"],
        "Student": ["read_own", "list_own"],
        "Parent":  ["read_related", "list_related"],
    },
    "exam_results": {
        "Admin":   [],
        "Staff":   [],
        "Teacher": [],
        "Student": ["read_own", "list_own"],
        "Parent":  [],
    },
    "exam_hall_tickets": {
        "Admin":   [],
        "Staff":   [],
        "Teacher": [],
        "Student": ["read_own", "list_own"],
        "Parent":  ["read_related", "list_related"],
    },
    # ── Fee ───────────────────────────────────────────────────────────────────
    "fee_categories": {
        "Admin":   ["create", "read", "update", "delete", "list"],
        "Staff":   ["read", "list"],
        "Teacher": [],
        "Student": [],
        "Parent":  [],
    },
    "fee_types": {
        "Admin":   ["create", "read", "update", "delete", "list"],
        "Staff":   ["read", "list"],
        "Teacher": [],
        "Student": [],
        "Parent":  [],
    },
    "fee_terms": {
        "Admin":   ["create", "read", "update", "delete", "list"],
        "Staff":   ["read", "list"],
        "Teacher": [],
        "Student": [],
        "Parent":  [],
    },
    "fee_class_mappings": {
        "Admin":   ["create", "read", "update", "delete", "list"],
        "Staff":   ["read", "list"],
        "Teacher": [],
        "Student": [],
        "Parent":  [],
    },
    "fee_class_mapping_term_amounts": {
        "Admin":   ["create", "read", "update", "delete", "list"],
        "Staff":   ["read", "list"],
        "Teacher": [],
        "Student": [],
        "Parent":  [],
    },
    "fee_student_mappings": {
        "Admin":   ["create", "read", "update", "delete", "list"],
        "Staff":   ["create", "read", "update", "list"],
        "Teacher": [],
        "Student": [],
        "Parent":  [],
    },
    "fee_transactions": {
        "Admin":   ["create", "read", "update", "list"],   # delete NOT seeded
        "Staff":   ["create", "read", "update", "list"],
        "Teacher": [],
        "Student": ["read_own", "list_own"],
        "Parent":  [],
    },
    "fee_receipts": {
        "Admin":   ["create", "read", "update", "list"],   # delete NOT seeded
        "Staff":   ["create", "read", "list"],              # update NOT seeded for Staff
        "Teacher": [],
        "Student": ["read_own", "list_own"],
        "Parent":  [],
    },
    "fee_refunds": {
        "Admin":   ["create", "read", "list", "approve", "process"],
        "Staff":   ["create", "read", "list"],
        "Teacher": [],
        "Student": [],
        "Parent":  [],
    },
    # ── Transport ─────────────────────────────────────────────────────────────
    "routes": {
        "Admin":   ["create", "read", "update", "delete", "list"],
        "Staff":   ["read", "list"],
        "Teacher": ["read", "list"],
        "Student": [],
        "Parent":  [],
    },
    "route_types": {
        "Admin":   ["create", "read", "update", "delete", "list"],
        "Staff":   ["read", "list"],
        "Teacher": ["read", "list"],
        "Student": [],
        "Parent":  [],
    },
    "route_stops": {
        "Admin":   ["create", "read", "update", "delete", "list"],
        "Staff":   ["read", "list"],
        "Teacher": ["read", "list"],
        "Student": [],
        "Parent":  [],
    },
    "vehicles": {
        "Admin":   ["create", "read", "update", "delete", "list"],
        "Staff":   ["read", "list"],
        "Teacher": ["read", "list"],
        "Student": [],
        "Parent":  [],
    },
    "transport_trips": {
        "Admin":   ["create", "read", "update", "delete", "list"],
        "Staff":   ["create", "read", "update", "list"],    # delete NOT seeded for Staff
        "Teacher": ["read", "list"],
        "Student": [],
        "Parent":  [],
    },
    "trip_types": {
        "Admin":   ["create", "read", "update", "delete", "list"],
        "Staff":   ["read", "list"],
        "Teacher": ["read", "list"],
        "Student": [],
        "Parent":  [],
    },
    # ── Expenses ──────────────────────────────────────────────────────────────
    "expense_categories": {
        "Admin":   ["create", "read", "update", "delete", "list"],
        "Staff":   ["read", "list"],
        "Teacher": [],
        "Student": [],
        "Parent":  [],
    },
    "expense_types": {
        "Admin":   ["create", "read", "update", "delete", "list"],
        "Staff":   ["read", "list"],
        "Teacher": [],
        "Student": [],
        "Parent":  [],
    },
    "expense_settings": {
        "Admin":   ["create", "read", "update", "delete", "list"],
        "Staff":   [],
        "Teacher": [],
        "Student": [],
        "Parent":  [],
    },
    "expense_transactions": {
        "Admin":   ["create", "read", "update", "list", "approve"],
        "Staff":   ["create", "read", "list"],   # update/approve NOT seeded for Staff
        "Teacher": [],
        "Student": [],
        "Parent":  [],
    },
    "expense_attachments": {
        "Admin":   ["create", "read", "update", "delete"],
        "Staff":   ["create", "read"],
        "Teacher": [],
        "Student": [],
        "Parent":  [],
    },
    "expense_audit_logs": {
        "Admin":   ["read", "delete"],
        "Staff":   [],
        "Teacher": [],
        "Student": [],
        "Parent":  [],
    },
    # ── Reports ───────────────────────────────────────────────────────────────
    "fee_reports": {
        "Admin":   ["read", "export"],
        "Staff":   ["read", "export"],
        "Teacher": [],
        "Student": [],
        "Parent":  [],
    },
    "financial_reports": {
        "Admin":   ["read", "export"],
        "Staff":   [],
        "Teacher": [],
        "Student": [],
        "Parent":  [],
    },
    "student_reports": {
        "Admin":   ["read", "export"],
        "Staff":   ["read", "export"],
        "Teacher": ["read", "export"],
        "Student": [],
        "Parent":  [],
    },
    "staff_reports": {
        "Admin":   ["read", "export"],
        "Staff":   ["read"],          # export NOT seeded for Staff
        "Teacher": [],
        "Student": [],
        "Parent":  [],
    },
    "attendance_reports": {
        "Admin":   ["read", "export"],
        "Staff":   ["read", "export"],
        "Teacher": ["read", "export"],
        "Student": [],
        "Parent":  [],
    },
    "reports": {
        "Admin":   ["read"],
        "Staff":   ["read"],
        "Teacher": ["read"],
        "Student": [],
        "Parent":  [],
    },
    # ── Administration ────────────────────────────────────────────────────────
    "role_management": {
        "Admin":   ["create", "read", "update", "delete", "list"],
        "Staff":   [],
        "Teacher": [],
        "Student": [],
        "Parent":  [],
    },
    "permission_management": {
        "Admin":   ["create", "list"],
        "Staff":   [],
        "Teacher": [],
        "Student": [],
        "Parent":  [],
    },
    "resource_permission_management": {
        "Admin":   ["create", "read", "update", "delete", "list"],
        "Staff":   [],
        "Teacher": [],
        "Student": [],
        "Parent":  [],
    },
    "user_management": {
        "Admin":   ["read", "update", "list"],
        "Staff":   [],
        "Teacher": [],
        "Student": [],
        "Parent":  [],
    },
    "menu_management": {
        "Admin":   ["create", "list"],
        "Staff":   [],
        "Teacher": [],
        "Student": [],
        "Parent":  [],
    },
    "organizations": {
        "Admin":   ["create", "read", "update", "delete", "list"],
        "Staff":   [],
        "Teacher": [],
        "Student": [],
        "Parent":  [],
    },
    "monitoring": {
        "Admin":   ["read", "admin"],
        "Staff":   [],
        "Teacher": [],
        "Student": [],
        "Parent":  [],
    },
}

MODULES = [
    ("Academic / Masters",  ["academic_years", "classes", "sections", "subjects",
                              "subject_categories", "class_subject_mappings",
                              "designations", "locations", "castes",
                              "certificate_types", "holiday_management"]),
    ("Staff",               ["staff", "parent_management"]),
    ("Students",            ["students", "student_admissions", "student_attendance",
                              "student_certificates", "student_documents",
                              "student_transport", "profile"]),
    ("Exam",                ["exams", "exam_marks", "exam_results", "exam_hall_tickets"]),
    ("Fee",                 ["fee_categories", "fee_types", "fee_terms",
                              "fee_class_mappings", "fee_class_mapping_term_amounts",
                              "fee_student_mappings", "fee_transactions",
                              "fee_receipts", "fee_refunds"]),
    ("Transport",           ["routes", "route_types", "route_stops", "vehicles",
                              "transport_trips", "trip_types"]),
    ("Expenses",            ["expense_categories", "expense_types", "expense_settings",
                              "expense_transactions", "expense_attachments",
                              "expense_audit_logs"]),
    ("Reports",             ["fee_reports", "financial_reports", "student_reports",
                              "staff_reports", "attendance_reports", "reports"]),
    ("Administration",      ["role_management", "permission_management",
                              "resource_permission_management", "user_management",
                              "menu_management", "organizations", "monitoring"]),
]

ROLE_NAMES = [r for r, _ in ROLES]

# ── build document ────────────────────────────────────────────────────────────
doc = Document()
sec = doc.sections[0]
sec.top_margin = sec.bottom_margin = Inches(0.8)
sec.left_margin = sec.right_margin = Inches(0.7)

# Title block
t = doc.add_heading("COS360 School Management System", 0)
t.alignment = WD_ALIGN_PARAGRAPH.CENTER
s = doc.add_heading("Roles & Permissions — Source of Truth", 1)
s.alignment = WD_ALIGN_PARAGRAPH.CENTER
m = doc.add_paragraph("Date: 13 May 2026  |  Version: 2.0  |  Source: seed_endpoints.py  _ROLE_PERMISSIONS")
m.alignment = WD_ALIGN_PARAGRAPH.CENTER
m.runs[0].font.size = Pt(9)
doc.add_paragraph()

# ── 1. Roles ──────────────────────────────────────────────────────────────────
add_heading(doc, "1.  Roles  (5 roles seeded)", 1)
t1 = doc.add_table(rows=1, cols=3)
t1.style = "Table Grid"
make_header_row(t1, ["Role", "DB Name", "Description"])
for role, desc in ROLES:
    r = t1.add_row().cells
    r[0].text = role
    r[1].text = role
    r[2].text = desc
    shade(r[0], ROLE_COLOURS[role][1])
    shade(r[1], ROLE_COLOURS[role][1])
    for cell in r:
        for p in cell.paragraphs:
            for run in p.runs:
                run.font.size = Pt(9)
    for p in r[0].paragraphs:
        for run in p.runs:
            run.bold = True
doc.add_paragraph()

# ── 2. Action legend ──────────────────────────────────────────────────────────
add_heading(doc, "2.  Action Legend", 1)
t2 = doc.add_table(rows=1, cols=2)
t2.style = "Table Grid"
make_header_row(t2, ["Action", "Meaning"])
legend = [
    ("create",       "Add a new record"),
    ("read",         "View a single record by ID"),
    ("update",       "Edit an existing record"),
    ("delete",       "Permanently remove a record"),
    ("list",         "View all records (paginated)"),
    ("approve",      "Approve a pending workflow item"),
    ("process",      "Execute an approved item (e.g. process a refund)"),
    ("export",       "Bulk download data"),
    ("admin",        "System-level administrative operation"),
    ("read_own",     "Read only the requesting user's own record"),
    ("list_own",     "List only the requesting user's own records"),
    ("update_own",   "Update only the requesting user's own record"),
    ("read_related", "Read records belonging to linked children (Parent role)"),
    ("list_related", "List records belonging to linked children (Parent role)"),
]
for act, meaning in legend:
    r = t2.add_row().cells
    r[0].text = act
    r[1].text = meaning
    for cell in r:
        for p in cell.paragraphs:
            for run in p.runs:
                run.font.size = Pt(9)
doc.add_paragraph()

# ── 3. Per-role tables ────────────────────────────────────────────────────────
add_heading(doc, "3.  Per-Role Permission Tables", 1)

for idx, (role, _) in enumerate(ROLES):
    hdr_bg = ROLE_COLOURS[role][0]
    add_heading(doc, f"3.{idx+1}  Role: {role}", 2)
    t = doc.add_table(rows=1, cols=3)
    t.style = "Table Grid"
    make_header_row(t, ["Module", "Resource", "Actions Granted"], bg=hdr_bg)

    for module, resources in MODULES:
        first = True
        for res in resources:
            actions = PERMS[res].get(role, [])
            if not actions:
                continue
            row = t.add_row().cells
            row[0].text = module if first else ""
            row[1].text = res
            row[2].text = ", ".join(actions)
            first = False
            shade(row[0], "D5D8DC")
            for cell in row:
                for p in cell.paragraphs:
                    for run in p.runs:
                        run.font.size = Pt(9)

    doc.add_paragraph()

# ── 4. Full combined matrix ───────────────────────────────────────────────────
add_heading(doc, "4.  Full Permissions Matrix  (All Roles x All Resources)", 1)
note = doc.add_paragraph(
    "Each cell lists the exact actions seeded for that role/resource combination. "
    "Dash (—) = no permission seeded.  "
    "Source: seed_endpoints.py  _ROLE_PERMISSIONS — nothing added or removed."
)
note.runs[0].font.size = Pt(9)
note.runs[0].italic = True
doc.add_paragraph()

for module, resources in MODULES:
    add_heading(doc, module, 3)
    col_count = 2 + len(ROLE_NAMES)
    t = doc.add_table(rows=1, cols=col_count)
    t.style = "Table Grid"
    hdr = t.rows[0].cells
    hdr[0].text = "Module"
    hdr[1].text = "Resource"
    shade(hdr[0], "2C3E50")
    shade(hdr[1], "2C3E50")
    for cell in [hdr[0], hdr[1]]:
        for p in cell.paragraphs:
            for run in p.runs:
                run.bold = True
                run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
                run.font.size = Pt(8)
    for i, rn in enumerate(ROLE_NAMES):
        c = hdr[i + 2]
        c.text = rn
        shade(c, ROLE_COLOURS[rn][0])
        for p in c.paragraphs:
            for run in p.runs:
                run.bold = True
                run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
                run.font.size = Pt(8)

    first = True
    for res in resources:
        row = t.add_row().cells
        row[0].text = module if first else ""
        row[1].text = res
        first = False
        shade(row[0], "D5D8DC")
        shade(row[1], "EBF5FB")
        for cell in [row[0], row[1]]:
            for p in cell.paragraphs:
                for run in p.runs:
                    run.font.size = Pt(8)
        for i, rn in enumerate(ROLE_NAMES):
            actions = PERMS[res].get(rn, [])
            c = row[i + 2]
            c.text = ", ".join(actions) if actions else "—"
            shade(c, ROLE_COLOURS[rn][1] if actions else "F2F3F4")
            for p in c.paragraphs:
                for run in p.runs:
                    run.font.size = Pt(8)
                    if not actions:
                        run.font.color.rgb = RGBColor(0xBB, 0xBB, 0xBB)
    doc.add_paragraph()

doc.save("context/COS360_Roles_Permissions_v2.docx")
print("Done — context/COS360_Roles_Permissions_v2.docx rebuilt.")
