"""
Seed exam module menus into test_tenant_schema.
Run from the COS360 backend root directory.
"""
import asyncio
import asyncpg
import uuid

ADMIN_ROLE_ID = '2fe97570-0740-44c5-911f-9826e0258a9b'
DB_URL = 'postgresql://neondb_owner:npg_3BRCMxJ8aKdN@ep-old-salad-a1x7ae1e-pooler.ap-southeast-1.aws.neon.tech/neondb'

# Pre-generate UUIDs so they're stable
exam_mgmt_id    = str(uuid.uuid4())
exam_dash_id    = str(uuid.uuid4())
exam_list_id    = str(uuid.uuid4())
board_pat_id    = str(uuid.uuid4())
grading_id      = str(uuid.uuid4())
exam_scheme_id  = str(uuid.uuid4())
subj_scheme_id  = str(uuid.uuid4())
remarks_id      = str(uuid.uuid4())
mark_entry_id   = str(uuid.uuid4())
hall_ticket_id  = str(uuid.uuid4())
results_id      = str(uuid.uuid4())
settings_id     = str(uuid.uuid4())
audit_id        = str(uuid.uuid4())

# (id, name, url, level, parent_id, display_order)
MENUS = [
    (exam_mgmt_id,   'Exam Management',       '/exam',                         'L0', None,          49),
    (exam_dash_id,   'Exam Dashboard',        '/exam',                         'L1', exam_mgmt_id,  50),
    (exam_list_id,   'Exams',                 '/exam/exams',                   'L1', exam_mgmt_id,  51),
    (board_pat_id,   'Board Patterns',        '/exam/board-patterns',          'L1', exam_mgmt_id,  52),
    (grading_id,     'Grading',               '/exam/grading',                 'L1', exam_mgmt_id,  53),
    (exam_scheme_id, 'Exam Grade Schemes',    '/exam/grading/exam-schemes',    'L2', grading_id,    54),
    (subj_scheme_id, 'Subject Grade Schemes', '/exam/grading/subject-schemes', 'L2', grading_id,    55),
    (remarks_id,     'Remark Grade Sets',     '/exam/grading/remarks',         'L2', grading_id,    56),
    (mark_entry_id,  'Mark Entry',            '/exam/marks',                   'L1', exam_mgmt_id,  57),
    (hall_ticket_id, 'Hall Tickets',          '/exam/hall-tickets',            'L1', exam_mgmt_id,  58),
    (results_id,     'Results',               '/exam/results',                 'L1', exam_mgmt_id,  59),
    (settings_id,    'Exam Settings',         '/exam/settings',                'L1', exam_mgmt_id,  60),
    (audit_id,       'Audit Log',             '/exam/audit',                   'L1', exam_mgmt_id,  61),
]


async def main():
    conn = await asyncpg.connect(DB_URL, ssl='require')

    async with conn.transaction():
        # 1. Insert menus (check existence first — no unique constraint)
        print('Inserting exam menus into test_tenant_schema...')
        for m in MENUS:
            mid, name, url, level, parent_id, order = m
            exists = await conn.fetchval(
                "SELECT 1 FROM test_tenant_schema.menus WHERE id = $1", mid
            )
            if not exists:
                # Also check by name to avoid duplicates if script was run before
                name_exists = await conn.fetchval(
                    "SELECT 1 FROM test_tenant_schema.menus WHERE name = $1", name
                )
                if name_exists:
                    print(f'  ~ SKIP (name exists) | {level} | {name}')
                    # Update mid to existing one for permission linking
                    existing_id = await conn.fetchval(
                        "SELECT id FROM test_tenant_schema.menus WHERE name = $1", name
                    )
                    MENUS[MENUS.index(m)] = (existing_id, name, url, level, parent_id, order)
                    continue
                await conn.execute(
                    """
                    INSERT INTO test_tenant_schema.menus (id, name, url, level, parent_id, display_order)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    """,
                    mid, name, url, level, parent_id, order
                )
                print(f'  + {level} | {name:<30} -> {url}')
            else:
                print(f'  ~ EXISTS | {level} | {name}')

        # 2. Grant Admin access to all exam menus
        print('\nGranting Admin permissions...')
        for m in MENUS:
            mid = m[0]
            name = m[1]
            # Check if permission already exists
            perm_exists = await conn.fetchval(
                "SELECT 1 FROM test_tenant_schema.role_menu_permissions WHERE role_id = $1 AND menu_id = $2",
                ADMIN_ROLE_ID, mid
            )
            if not perm_exists:
                perm_id = str(uuid.uuid4())
                await conn.execute(
                    """
                    INSERT INTO test_tenant_schema.role_menu_permissions (id, role_id, menu_id, can_view, can_edit)
                    VALUES ($1, $2, $3, true, true)
                    """,
                    perm_id, ADMIN_ROLE_ID, mid
                )
                print(f'  + Admin -> {name} (can_view=true, can_edit=true)')
            else:
                print(f'  ~ EXISTS | Admin -> {name}')

    print('\nDone! Exam module menus seeded successfully.')
    print('Restart the frontend dev server and log in again to see the Exam Management menu.')
    await conn.close()


if __name__ == '__main__':
    asyncio.run(main())
