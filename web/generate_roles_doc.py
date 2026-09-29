from docx import Document
from docx.shared import Pt, RGBColor, Inches, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_ALIGN_VERTICAL, WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import copy

doc = Document()

# ── Page margins ──────────────────────────────────────────────────────────────
for section in doc.sections:
    section.top_margin    = Cm(2)
    section.bottom_margin = Cm(2)
    section.left_margin   = Cm(2.5)
    section.right_margin  = Cm(2.5)

# ── Colour palette ────────────────────────────────────────────────────────────
DARK_BLUE  = RGBColor(0x1e, 0x3a, 0x5f)
MED_BLUE   = RGBColor(0x2c, 0x5f, 0x8a)
WHITE      = RGBColor(0xFF, 0xFF, 0xFF)
GREEN      = RGBColor(0x1a, 0x7a, 0x2e)
RED        = RGBColor(0xc0, 0x39, 0x2b)
ORANGE     = RGBColor(0xd3, 0x54, 0x00)
PURPLE     = RGBColor(0x8e, 0x44, 0xad)
GREY       = RGBColor(0xaa, 0xaa, 0xaa)
LIGHT_BLUE = RGBColor(0xd0, 0xe4, 0xf7)
HEADER_BG  = RGBColor(0x1e, 0x3a, 0x5f)
ROW_ALT    = RGBColor(0xf5, 0xf8, 0xfc)
NOTE_BG    = RGBColor(0xff, 0xfb, 0xe6)

# ── Helpers ───────────────────────────────────────────────────────────────────
def rgb_to_hex(rgb):
    # RGBColor stores as integer, access via index or str
    s = str(rgb)  # returns 'RRGGBB'
    return s.upper()

def set_cell_bg(cell, rgb: RGBColor):
    tc   = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd  = OxmlElement('w:shd')
    hex_color = rgb_to_hex(rgb)
    shd.set(qn('w:val'),   'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'),  hex_color)
    tcPr.append(shd)

def set_cell_border(cell, top=None, bottom=None, left=None, right=None):
    tc   = cell._tc
    tcPr = tc.get_or_add_tcPr()
    tcBorders = OxmlElement('w:tcBorders')
    for side, val in [('top',top),('bottom',bottom),('left',left),('right',right)]:
        if val:
            el = OxmlElement(f'w:{side}')
            el.set(qn('w:val'),   val.get('val','single'))
            el.set(qn('w:sz'),    val.get('sz','4'))
            el.set(qn('w:space'),'0')
            el.set(qn('w:color'), val.get('color','auto'))
            tcBorders.append(el)
    tcPr.append(tcBorders)

def cell_para(cell, text, bold=False, color=None, size=9, align=WD_ALIGN_PARAGRAPH.LEFT):
    cell.paragraphs[0].clear()
    p   = cell.paragraphs[0]
    p.alignment = align
    run = p.add_run(text)
    run.bold      = bold
    run.font.size = Pt(size)
    if color:
        run.font.color.rgb = color
    return run

def heading(doc, text, level=1):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    run = p.add_run(text)
    run.bold = True
    if level == 1:
        run.font.size  = Pt(16)
        run.font.color.rgb = DARK_BLUE
        p.paragraph_format.space_before = Pt(16)
        p.paragraph_format.space_after  = Pt(4)
        # underline via border
        pPr  = p._p.get_or_add_pPr()
        pBdr = OxmlElement('w:pBdr')
        bot  = OxmlElement('w:bottom')
        bot.set(qn('w:val'),   'single')
        bot.set(qn('w:sz'),    '6')
        bot.set(qn('w:space'), '1')
        bot.set(qn('w:color'), '1e3a5f')
        pBdr.append(bot)
        pPr.append(pBdr)
    elif level == 2:
        run.font.size  = Pt(12)
        run.font.color.rgb = MED_BLUE
        p.paragraph_format.space_before = Pt(12)
        p.paragraph_format.space_after  = Pt(2)
    return p

def note_para(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.left_indent  = Cm(0.5)
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after  = Pt(4)
    # yellow left border via paragraph border
    pPr  = p._p.get_or_add_pPr()
    pBdr = OxmlElement('w:pBdr')
    left = OxmlElement('w:left')
    left.set(qn('w:val'),   'single')
    left.set(qn('w:sz'),    '12')
    left.set(qn('w:space'), '4')
    left.set(qn('w:color'), 'f0ad4e')
    pBdr.append(left)
    pPr.append(pBdr)
    run = p.add_run(text)
    run.font.size = Pt(9)
    run.font.color.rgb = RGBColor(0x55, 0x55, 0x00)
    return p

def make_table(doc, headers, rows, col_widths=None):
    t = doc.add_table(rows=1+len(rows), cols=len(headers))
    t.style = 'Table Grid'
    t.alignment = WD_TABLE_ALIGNMENT.LEFT
    # header row
    for i, h in enumerate(headers):
        c = t.cell(0, i)
        set_cell_bg(c, HEADER_BG)
        cell_para(c, h, bold=True, color=WHITE, size=9)
        c.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
    # data rows
    for ri, row in enumerate(rows):
        bg = ROW_ALT if ri % 2 == 0 else WHITE
        for ci, val in enumerate(row):
            c = t.cell(ri+1, ci)
            set_cell_bg(c, bg)
            # colour coding
            text  = val
            color = None
            if val in ('Full','C R U D L','C R U D L + Approve','C R U D L + Approve + Process',
                       'C R U D L Export','Read','C R U L','R L','R L Download','R U L'):
                color = GREEN
            elif val in ('No Access',):
                color = RED
            elif 'own' in val.lower() and 'children' not in val.lower():
                color = ORANGE
            elif 'children' in val.lower() or 'related' in val.lower():
                color = PURPLE
            elif val == '—':
                color = GREY
            cell_para(c, text, color=color, size=9)
            c.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
    # column widths
    if col_widths:
        for i, w in enumerate(col_widths):
            for row in t.rows:
                row.cells[i].width = Cm(w)
    return t

# ═══════════════════════════════════════════════════════════════════════════════
#  TITLE PAGE
# ═══════════════════════════════════════════════════════════════════════════════
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run('COS360 School Management System')
r.bold = True; r.font.size = Pt(22); r.font.color.rgb = DARK_BLUE

p2 = doc.add_paragraph()
p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
r2 = p2.add_run('Roles & Permissions Reference Document')
r2.bold = True; r2.font.size = Pt(16); r2.font.color.rgb = MED_BLUE

doc.add_paragraph()
meta = doc.add_paragraph()
meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
meta.add_run('Date: 12 May 2026     |     Version: 1.0     |     Audience: Development Team & Management').font.size = Pt(10)

doc.add_paragraph()

# ═══════════════════════════════════════════════════════════════════════════════
#  SECTION 1 — LEGEND
# ═══════════════════════════════════════════════════════════════════════════════
heading(doc, '1. Legend', level=1)
legend_rows = [
    ('Full / C R U D L', 'GREEN',  'Complete access — Create, Read, Update, Delete, List'),
    ('R / R L',           'GREEN',  'Read-only or Read + List access'),
    ('Own',               'ORANGE', 'Access restricted to own records only (Student)'),
    ('Related / Children','PURPLE', 'Access restricted to linked children\'s records (Parent)'),
    ('No Access',         'RED',    'Permission not granted for this role'),
    ('—',                 'GREY',   'Not applicable to this role'),
]
t = doc.add_table(rows=1+len(legend_rows), cols=3)
t.style = 'Table Grid'
for i,h in enumerate(['Symbol','Colour','Meaning']):
    c = t.cell(0,i); set_cell_bg(c, HEADER_BG)
    cell_para(c, h, bold=True, color=WHITE, size=9)
color_map = {'GREEN':GREEN,'ORANGE':ORANGE,'PURPLE':PURPLE,'RED':RED,'GREY':GREY}
for ri,(sym,col,meaning) in enumerate(legend_rows):
    bg = ROW_ALT if ri%2==0 else WHITE
    set_cell_bg(t.cell(ri+1,0), bg); cell_para(t.cell(ri+1,0), sym,    color=color_map[col], size=9)
    set_cell_bg(t.cell(ri+1,1), bg); cell_para(t.cell(ri+1,1), col,    color=color_map[col], size=9)
    set_cell_bg(t.cell(ri+1,2), bg); cell_para(t.cell(ri+1,2), meaning, size=9)

# ═══════════════════════════════════════════════════════════════════════════════
#  SECTION 2 — ROLE DESCRIPTIONS
# ═══════════════════════════════════════════════════════════════════════════════
doc.add_paragraph()
heading(doc, '2. Role Descriptions', level=1)

roles_desc = [
    ('Admin / Staff',            'Full system access across all modules. Can manage students, staff, fees, transport, exams, masters, and expenses.'),
    ('Super Admin / Principal',  'Same as Admin plus the ability to create, edit, and delete exams. Also manages roles, permissions, and menu configuration.'),
    ('Teacher',                  'Access to academic and student data. Can mark attendance and enter exam marks. BLOCKED from entire Fee Management module.'),
    ('Student',                  'Read-only access to own data only: own admission, attendance, fees, transport, certificates, and exam results.'),
    ('Parent',                   'Read-only access to linked children\'s data. Child selector shown when multiple children are linked. Cannot access admin modules.'),
]
t2 = doc.add_table(rows=1+len(roles_desc), cols=2)
t2.style = 'Table Grid'
for i,h in enumerate(['Role','Description']):
    c=t2.cell(0,i); set_cell_bg(c,HEADER_BG); cell_para(c,h,bold=True,color=WHITE,size=9)
for ri,(role,desc) in enumerate(roles_desc):
    bg = ROW_ALT if ri%2==0 else WHITE
    set_cell_bg(t2.cell(ri+1,0),bg); cell_para(t2.cell(ri+1,0),role,bold=True,size=9)
    set_cell_bg(t2.cell(ri+1,1),bg); cell_para(t2.cell(ri+1,1),desc,size=9)

# ═══════════════════════════════════════════════════════════════════════════════
#  SECTION 3 — PERMISSIONS MATRIX
# ═══════════════════════════════════════════════════════════════════════════════
doc.add_paragraph()
heading(doc, '3. Module Permissions Matrix', level=1)
p_intro = doc.add_paragraph('C=Create  R=Read  U=Update  D=Delete  L=List')
p_intro.runs[0].font.size = Pt(9); p_intro.runs[0].italic = True

HEADERS = ['Module / Feature', 'Admin / Staff', 'Super Admin / Principal', 'Teacher', 'Student', 'Parent']

def section_header_row(table, text, col_count):
    row = table.add_row()
    cell = row.cells[0]
    # merge all cells
    for i in range(1, col_count):
        cell = cell.merge(row.cells[i])
    set_cell_bg(cell, DARK_BLUE)
    cell_para(cell, text, bold=True, color=WHITE, size=9)

matrix_data = {
    'MASTERS': [
        ('Academic Years',           'C R U D L + Approve','C R U D L + Approve','R L',       '—',            '—'),
        ('Classes & Sections',       'C R U D L',          'C R U D L',          'R L',       '—',            '—'),
        ('Subjects',                 'C R U D L',          'C R U D L',          'R L',       '—',            '—'),
        ('Subject Categories',       'C R U D L',          'C R U D L',          'R L',       '—',            '—'),
        ('Class–Subject Mappings',   'C R U D L',          'C R U D L',          'R L',       '—',            '—'),
        ('Parents (master list)',     'C R U D L',          'C R U D L',          'No Access', '—',            '—'),
        ('Holidays',                 'C R U D L',          'C R U D L',          'R L',       'R L',          'R L'),
    ],
    'STUDENTS': [
        ('Student Admissions',       'C R U D L',          'C R U D L',          'R L',       'R (own)',      'R (children)'),
        ('Student Attendance',       'C R U D L',          'C R U D L',          'C R U L',   'R (own)',      'R (children)'),
        ('Student Documents',        'C R U D L',          'C R U D L',          'R L',       'R (own)',      'R (children)'),
        ('Student Certificates',     'C R U D L',          'C R U D L',          'R L',       'R (own)',      'R (children)'),
        ('Certificate Types',        'C R U D L + Approve','C R U D L + Approve','R L',       '—',            '—'),
        ('Student Transport',        'C R U D L',          'C R U D L',          'R L',       'R (own)',      'R (children)'),
    ],
    'STAFF': [
        ('Staff Enrollment',         'C R U D L',          'C R U D L',          'R (own)',   '—',            '—'),
        ('Staff Attendance',         'C R U D L',          'C R U D L',          'R (own)',   '—',            '—'),
        ('Designations',             'C R U D L',          'C R U D L',          'R L',       '—',            '—'),
    ],
    'FEE MANAGEMENT': [
        ('Fee Categories',           'C R U D L',          'C R U D L',          'No Access', '—',            '—'),
        ('Fee Types',                'C R U D L',          'C R U D L',          'No Access', '—',            '—'),
        ('Fee Terms',                'C R U D L',          'C R U D L',          'No Access', '—',            '—'),
        ('Fee Term Amounts',         'C R U D L',          'C R U D L',          'No Access', '—',            '—'),
        ('Fee Class Mappings',       'C R U D L',          'C R U D L',          'No Access', '—',            '—'),
        ('Fee Collection',           'C R U D L',          'C R U D L',          'No Access', 'R (own)',      'R (children)'),
        ('Fee Transactions',         'C R U D L',          'C R U D L',          'No Access', 'R L (own)',    'R L (children)'),
        ('Fee Receipts',             'C R U D L',          'C R U D L',          'No Access', 'R L (own)',    'R L (children)'),
        ('Fee Refunds',              'C R U D L + Approve','C R U D L + Approve','No Access', '—',            '—'),
        ('Fee Reports',              'Read',               'Read',               'No Access', '—',            '—'),
    ],
    'TRANSPORT': [
        ('Routes / Route Stops',     'C R U D L',          'C R U D L',          'R L',       '—',            '—'),
        ('Vehicles',                 'C R U D L',          'C R U D L',          'R L',       '—',            '—'),
        ('Transport Trips',          'C R U D L',          'C R U D L',          'R L',       'R (own trips)','R (children)'),
        ('Transport Pricing',        'C R U D L',          'C R U D L',          'No Access', '—',            '—'),
        ('Transport Reports',        'Read',               'Read',               'Read',      '—',            '—'),
    ],
    'EXAM MANAGEMENT': [
        ('Exam Dashboard / List',    'R L',                'R L',                'R L',       'R (own)',      'R (children)'),
        ('Create / Edit / Delete Exam','No Access',        'Full',               'No Access', 'No Access',    'No Access'),
        ('Mark Entry',               'C R U L',            'C R U L',            'C R U (assigned)', 'No Access','No Access'),
        ('Hall Tickets',             'R L Download',       'R L Download',       'R L Download','R (own)',    'R (children)'),
        ('Exam Results',             'R L',                'R L',                'R L',       'R (own)',      'R (children)'),
        ('Grading / Schemes',        'C R U D L',          'C R U D L',          'R L',       '—',            '—'),
    ],
    'TIMETABLE': [
        ('Timetable Management',     'C R U D L',          'C R U D L',          'R L',       'R (own class)','R (children)'),
    ],
    'EXPENSE MANAGEMENT': [
        ('Expense Categories/Types', 'C R U D L',          'C R U D L',          'No Access', '—',            '—'),
        ('Expense Transactions',     'C R U D L + Approve','C R U D L + Approve','No Access', '—',            '—'),
        ('Expense Reports',          'C R U D L Export',   'C R U D L Export',   'No Access', '—',            '—'),
        ('Expense Audit Logs',       'R L',                'R L',                'No Access', '—',            '—'),
    ],
    'COMMUNICATION': [
        ('Compose / Send',           'Full',               'Full',               'Limited',   '—',            '—'),
        ('Communication Logs',       'R L',                'R L',                'R (own)',   '—',            '—'),
    ],
    'REPORTS': [
        ('Student Reports',          'Read',               'Read',               'Read',      '—',            '—'),
        ('Staff Reports',            'Read',               'Read',               'No Access', '—',            '—'),
        ('Academic Reports',         'Read',               'Read',               'Read',      '—',            '—'),
        ('Fee Reports',              'Read',               'Read',               'No Access', '—',            '—'),
        ('Transport Reports',        'Read',               'Read',               'Read',      '—',            '—'),
    ],
    'ADMINISTRATION': [
        ('User Management',          'R U L',              'R U L',              'No Access', '—',            '—'),
        ('Role Management',          'No Access',          'C R U D L',          'No Access', '—',            '—'),
        ('Permission Management',    'No Access',          'C R U D L',          'No Access', '—',            '—'),
        ('Menu Management',          'No Access',          'C R U D L',          'No Access', '—',            '—'),
    ],
    'PROFILE': [
        ('Own Profile',              'R U (own)',          'R U (own)',           'R U (own)', 'R U (own)',    'R U (own)'),
    ],
}

all_rows = []
section_positions = {}
for section_name, items in matrix_data.items():
    section_positions[len(all_rows)] = section_name
    for item in items:
        all_rows.append(item)

tbl = doc.add_table(rows=1, cols=len(HEADERS))
tbl.style = 'Table Grid'
tbl.alignment = WD_TABLE_ALIGNMENT.LEFT

# header
for i, h in enumerate(HEADERS):
    c = tbl.cell(0, i)
    set_cell_bg(c, HEADER_BG)
    cell_para(c, h, bold=True, color=WHITE, size=8)
    c.vertical_alignment = WD_ALIGN_VERTICAL.CENTER

# col widths
col_widths_cm = [4.5, 2.8, 3.2, 2.5, 2.5, 2.5]

data_row_index = 0
for ri, row_data in enumerate(all_rows):
    # check if section header needed
    if ri in section_positions:
        sec_row = tbl.add_row()
        merged = sec_row.cells[0]
        for ci in range(1, len(HEADERS)):
            merged = merged.merge(sec_row.cells[ci])
        set_cell_bg(merged, DARK_BLUE)
        cell_para(merged, section_positions[ri], bold=True, color=WHITE, size=9)

    dr = tbl.add_row()
    bg = ROW_ALT if data_row_index % 2 == 0 else WHITE
    data_row_index += 1
    for ci, val in enumerate(row_data):
        c = dr.cells[ci]
        set_cell_bg(c, bg)
        color = None
        if ci == 0:
            cell_para(c, val, size=9)
        else:
            v = val
            if v in ('Full','C R U D L','C R U D L + Approve','C R U D L + Approve + Process',
                     'C R U D L Export','Read','C R U L','R L','R L Download','R U L',
                     'C R U D L + Approve + Process + Export'):
                color = GREEN
            elif v == 'No Access':
                color = RED
            elif 'own' in v.lower() and 'children' not in v.lower():
                color = ORANGE
            elif 'children' in v.lower() or 'related' in v.lower():
                color = PURPLE
            elif v == '—':
                color = GREY
            elif 'limited' in v.lower() or 'assigned' in v.lower():
                color = MED_BLUE
            cell_para(c, v, color=color, size=9)
        c.vertical_alignment = WD_ALIGN_VERTICAL.CENTER

# set col widths
for i, w in enumerate(col_widths_cm):
    for row in tbl.rows:
        row.cells[i].width = Cm(w)

# ═══════════════════════════════════════════════════════════════════════════════
#  SECTION 4 — ROLE RESTRICTIONS
# ═══════════════════════════════════════════════════════════════════════════════
doc.add_paragraph()
heading(doc, '4. Role-Specific Restrictions', level=1)
restrictions = [
    ('Teacher',          'Entire Fee Management module is hidden from the sidebar AND blocked at the URL route level. Redirected to home if accessed directly.',      'menuUtils.ts + routes/_app/fee.tsx'),
    ('Admin / Staff',    'Cannot create, edit, or delete Exams. The "New Exam" and "Create First Exam" buttons are hidden.',                                          'ExamDashboard.tsx'),
    ('Student',          'All pages display own data only. No access to other students\' records, staff data, or administrative modules.',                            'Role dispatch in CertificatePage, AttendancePage, FeeCollection, TransportPage'),
    ('Parent',           'All pages display only linked children\'s data. Child selector shown when multiple children are linked. No access to admin modules.',       'Role dispatch in CertificatePage, AttendancePage, FeeCollection, TransportPage'),
    ('Super Admin / Principal', 'Only role with access to Role Management, Permission Management, and Menu Management.',                                              'routes/_app/admin/* + PermissionGuard'),
]
t4 = doc.add_table(rows=1+len(restrictions), cols=3)
t4.style = 'Table Grid'
for i,h in enumerate(['Role','Restriction','Where Enforced']):
    c=t4.cell(0,i); set_cell_bg(c,HEADER_BG); cell_para(c,h,bold=True,color=WHITE,size=9)
for ri,(role,restr,where) in enumerate(restrictions):
    bg = ROW_ALT if ri%2==0 else WHITE
    set_cell_bg(t4.cell(ri+1,0),bg); cell_para(t4.cell(ri+1,0),role,bold=True,size=9)
    set_cell_bg(t4.cell(ri+1,1),bg); cell_para(t4.cell(ri+1,1),restr,size=9)
    set_cell_bg(t4.cell(ri+1,2),bg); cell_para(t4.cell(ri+1,2),where,size=9,color=MED_BLUE)
for row in t4.rows:
    row.cells[0].width = Cm(3.5)
    row.cells[1].width = Cm(9.0)
    row.cells[2].width = Cm(5.0)

# ═══════════════════════════════════════════════════════════════════════════════
#  SECTION 5 — ACTION TYPES
# ═══════════════════════════════════════════════════════════════════════════════
doc.add_paragraph()
heading(doc, '5. Permission Action Types', level=1)
actions = [
    ('create',       'Add new records to the system',                          'Add a new student admission'),
    ('read',         'View a single record by its ID',                         'Open student detail page'),
    ('update',       'Edit or modify existing records',                        'Edit fee amount, update attendance'),
    ('delete',       'Permanently remove records',                             'Delete a route stop'),
    ('list',         'View all records in a paginated table',                  'View all admissions list'),
    ('read_own',     'Read only the user\'s own record',                       'Student views own profile'),
    ('list_own',     'List only the user\'s own records',                      'Student lists own fee receipts'),
    ('read_related', 'Read records of linked entities (children)',              'Parent reads child\'s admission details'),
    ('list_related', 'List records of linked entities (children)',             'Parent lists child\'s certificates'),
    ('approve',      'Approve pending workflow requests',                       'Approve a fee refund request'),
    ('process',      'Execute/process an approved operation',                  'Process a fee refund payment'),
    ('export',       'Download or export data in bulk',                        'Export expense reports to Excel'),
    ('download',     'Download a specific file or document',                   'Download expense attachment / certificate'),
]
t5 = doc.add_table(rows=1+len(actions), cols=3)
t5.style = 'Table Grid'
for i,h in enumerate(['Action','Meaning','Example']):
    c=t5.cell(0,i); set_cell_bg(c,HEADER_BG); cell_para(c,h,bold=True,color=WHITE,size=9)
for ri,(act,meaning,ex) in enumerate(actions):
    bg = ROW_ALT if ri%2==0 else WHITE
    set_cell_bg(t5.cell(ri+1,0),bg); cell_para(t5.cell(ri+1,0),act,bold=True,color=MED_BLUE,size=9)
    set_cell_bg(t5.cell(ri+1,1),bg); cell_para(t5.cell(ri+1,1),meaning,size=9)
    set_cell_bg(t5.cell(ri+1,2),bg); cell_para(t5.cell(ri+1,2),ex,size=9,color=GREY)
for row in t5.rows:
    row.cells[0].width = Cm(3.0)
    row.cells[1].width = Cm(8.0)
    row.cells[2].width = Cm(7.0)

# ═══════════════════════════════════════════════════════════════════════════════
#  SECTION 6 — PARENT ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════
doc.add_paragraph()
heading(doc, '6. Parent Role — API Endpoints & Permissions', level=1)
note_para(doc, 'The Parent role uses a "related" access pattern. All data is scoped to the parent\'s linked children. The CAxios interceptor automatically adds X-Student-ID, X-Academic-Year-ID, and X-Class-ID headers to every request.')

parent_ep = [
    ('Student Admissions',   'GET /students/admission/ + X-Student-ID header',           'student_admissions:list_related'),
    ('Student Attendance',   'GET /students/attendance/my-child/{id}',                   'student_attendance:list_related'),
    ('Student Certificates', 'GET /certificates/my-child/{student_id}',                  'student_certificates:list_related'),
    ('Student Transport',    'GET /students/student-transport/my-child/{id}',             'student_transport:list_related'),
    ('Fee Summary',          'GET /fee/my-child/{id}/summary',                           'fee_transactions:list_related'),
    ('Fee Receipts',         'GET /fee/my-child/{id}/receipts',                          'fee_receipts:list_related'),
    ('Exam Results',         'GET /exam/my-child/{id}/results',                          'Role-level check'),
    ('Children List',        'GET /student-parent-links/my-children',                    'Token-scoped (auto)'),
]
t6 = doc.add_table(rows=1+len(parent_ep), cols=3)
t6.style = 'Table Grid'
for i,h in enumerate(['Page','API Endpoint','Permission Required']):
    c=t6.cell(0,i); set_cell_bg(c,HEADER_BG); cell_para(c,h,bold=True,color=WHITE,size=9)
for ri,(page,ep,perm) in enumerate(parent_ep):
    bg = ROW_ALT if ri%2==0 else WHITE
    set_cell_bg(t6.cell(ri+1,0),bg); cell_para(t6.cell(ri+1,0),page,bold=True,size=9)
    set_cell_bg(t6.cell(ri+1,1),bg); cell_para(t6.cell(ri+1,1),ep,color=MED_BLUE,size=9)
    set_cell_bg(t6.cell(ri+1,2),bg); cell_para(t6.cell(ri+1,2),perm,color=PURPLE,size=9)
for row in t6.rows:
    row.cells[0].width = Cm(3.5)
    row.cells[1].width = Cm(8.5)
    row.cells[2].width = Cm(5.5)

# ═══════════════════════════════════════════════════════════════════════════════
#  SECTION 7 — STUDENT ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════
doc.add_paragraph()
heading(doc, '7. Student Role — API Endpoints & Permissions', level=1)

student_ep = [
    ('My Admission',     'GET /students/admission/ + X-Student-ID header',  'student_admissions:read_own'),
    ('My Attendance',    'GET /students/attendance/my',                     'student_attendance:read_own'),
    ('My Certificates',  'GET /certificates/my',                            'student_certificates:read_own'),
    ('My Transport',     'GET /students/student-transport/my',              'student_transport:read_own'),
    ('My Fees',          'GET /fee/my-fees/summary',                        'fee_transactions:read_own'),
    ('My Receipts',      'GET /fee/my-receipts',                            'fee_receipts:list_own'),
    ('My Results',       'GET /exam/my/results',                            'Role-level check'),
]
t7 = doc.add_table(rows=1+len(student_ep), cols=3)
t7.style = 'Table Grid'
for i,h in enumerate(['Page','API Endpoint','Permission Required']):
    c=t7.cell(0,i); set_cell_bg(c,HEADER_BG); cell_para(c,h,bold=True,color=WHITE,size=9)
for ri,(page,ep,perm) in enumerate(student_ep):
    bg = ROW_ALT if ri%2==0 else WHITE
    set_cell_bg(t7.cell(ri+1,0),bg); cell_para(t7.cell(ri+1,0),page,bold=True,size=9)
    set_cell_bg(t7.cell(ri+1,1),bg); cell_para(t7.cell(ri+1,1),ep,color=MED_BLUE,size=9)
    set_cell_bg(t7.cell(ri+1,2),bg); cell_para(t7.cell(ri+1,2),perm,color=ORANGE,size=9)
for row in t7.rows:
    row.cells[0].width = Cm(3.5)
    row.cells[1].width = Cm(8.5)
    row.cells[2].width = Cm(5.5)

# ═══════════════════════════════════════════════════════════════════════════════
#  SECTION 8 — NOTES FOR DEV TEAM
# ═══════════════════════════════════════════════════════════════════════════════
doc.add_paragraph()
heading(doc, '8. Notes for Development Team', level=1)
notes = [
    'Permission source: Permissions are NOT hardcoded in the frontend. They come from the backend login response (permissions object) and are stored in authStore.permissionsMap. The frontend checks; the backend enforces.',
    'Menu visibility: The sidebar menu is returned from the backend per role. Menu items appear/disappear based on which permissions the role has in the database (role_resource_access table). The only frontend menu override is hiding Fee items from the Teacher role.',
    'Adding a new permission: (1) Add the constant to src/constants/permissions.ts, (2) Seed the permission in the backend role_resource_access table for the correct role, (3) Use <PermissionGuard resource="x" action="y"> in the component.',
    'Teacher — Fee restriction: Teacher is the ONLY role blocked by a frontend route guard (routes/_app/fee.tsx) AND a sidebar filter (menuUtils.ts). All other restrictions are permission-based.',
    'Parent data scope: All parent API calls are verified server-side via the StudentParentLink table. The backend confirms the parent-child relationship before returning any data.',
]
for n in notes:
    note_para(doc, n)

# ── Footer ────────────────────────────────────────────────────────────────────
doc.add_paragraph()
footer_p = doc.add_paragraph('COS360 School Management System — Roles & Permissions Reference — Generated 12 May 2026')
footer_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
footer_p.runs[0].font.size = Pt(8)
footer_p.runs[0].font.color.rgb = GREY

# ── Save ─────────────────────────────────────────────────────────────────────
out = r'c:\Users\ADMIN\Documents\workspace\ReactWorkspace\Cos360_frontend\cos360_frontend\COS360_Roles_Permissions.docx'
doc.save(out)
print(f'Saved: {out}')
