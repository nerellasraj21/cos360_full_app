import { applyRoleMenuRules, roleTopLevelMenu, type RoleMenuItem } from '../../src/lib/menuUtils';

const item = (id: number, name: string, path: string, children: RoleMenuItem[] | null = null): RoleMenuItem => ({
  id: String(id),
  name,
  path,
  display_order: id,
  children,
});

const names = (items: RoleMenuItem[] | null | undefined) => (items ?? []).map(i => i.name);

describe('mobile menu rules (mirror of the web menuUtils rules)', () => {
  test('TC-RPT-01-U01 teacher loses the Fee node (mobile mirror)', () => {
    const out = applyRoleMenuRules(
      [item(1, 'Students', '/students'), item(2, 'Fee Management', '/fee', [item(21, 'Fee Types', '/fee/types')])],
      'teacher',
    );
    expect(names(out)).toEqual(['Students']);
  });

  test('TC-RPT-01-U01 role matching is case-insensitive (mobile mirror)', () => {
    const out = applyRoleMenuRules([item(2, 'Fees', '/fee')], 'Teacher');
    expect(out).toEqual([]);
  });

  test('TC-RPT-01-U02 student loses My Fees but keeps Fee Receipts (mobile mirror)', () => {
    const out = applyRoleMenuRules(
      [
        item(2, 'Fee', '/fee', [
          item(21, 'My Fees', '/fee/my-fees'),
          item(22, 'Fee Receipts', '/fee/receipts'),
          item(23, 'My Receipts', '/fee/my-receipts'),
          item(24, 'My Transactions', '/fee/my-transactions'),
        ]),
      ],
      'student',
    );
    expect(names(out[0].children)).toEqual(['Fee Receipts', 'My Receipts', 'My Transactions']);
  });

  test('TC-RPT-01-U02 student without a Fee node gets the self-service Fee menu', () => {
    const out = applyRoleMenuRules([item(1, 'Students', '/students')], 'student');
    const fee = out.find(i => i.name === 'Fee');
    expect(fee?.path).toBe('/fee');
    expect(names(fee?.children)).toEqual(['My Receipts', 'My Transactions']);
  });

  test('TC-RPT-01-U03 Route Stops, Transport Trips and Student Transport hidden for admin (mobile mirror)', () => {
    const out = applyRoleMenuRules(
      [
        item(3, 'Transport', '/transport', [
          item(31, 'Routes', '/transport/routes'),
          item(32, 'Route Stops', '/transport/route-stops'),
          item(33, 'Trips', '/transport/trips'),
          item(34, 'Transport Trips', '/transport/trips-x'),
          item(35, 'Student Transport', '/transport/student'),
        ]),
      ],
      'admin',
    );
    expect(names(out[0].children)).toEqual(['Routes', 'Trips']);
  });

  test('TC-TRN-01-U01 Route Stops removed for every role (mobile mirror)', () => {
    for (const role of ['admin', 'staff', 'teacher']) {
      const out = applyRoleMenuRules(
        [item(3, 'Transport', '/transport', [item(31, 'Routes', '/r'), item(32, 'Route Stops', '/rs')])],
        role,
      );
      expect(names(out[0].children)).toEqual(['Routes']);
    }
  });

  test('TC-RPT-01-U06 student and parent-like roles lose Communication, Reports, Masters and Transport (mobile rule, tested on the helper)', () => {
    const menu = [
      item(1, 'Students', '/students'),
      item(2, 'Communication', '/communication'),
      item(3, 'Reports', '/reports'),
      item(4, 'Masters', '/masters'),
      item(5, 'Transport', '/transport'),
    ];
    for (const role of ['student', 'parent', 'guardian', 'father', 'mother']) {
      const out = applyRoleMenuRules(menu, role);
      expect(names(out)).toEqual(['Students', 'Fee']);
    }
    expect(names(applyRoleMenuRules(menu, 'admin'))).toEqual(['Students', 'Communication', 'Reports', 'Masters', 'Transport']);
  });

  test('TC-RPT-01-U04 top level order follows the canonical order (mobile mirror)', () => {
    const out = roleTopLevelMenu(
      [
        item(1, 'Reports', '/reports'),
        item(2, 'Students', '/students'),
        item(3, 'Transport', '/transport'),
        item(4, 'Fee Management', '/fee'),
        item(5, 'Expense', '/expense'),
      ],
      'admin',
    );
    expect(names(out)).toEqual(['Students', 'Fee Management', 'Expense', 'Reports', 'Transport']);
  });

  test('TC-RPT-01-U04 null menu before load gives an empty list', () => {
    expect(roleTopLevelMenu(null, 'admin')).toEqual([]);
    expect(roleTopLevelMenu(undefined, 'admin')).toEqual([]);
  });
});
