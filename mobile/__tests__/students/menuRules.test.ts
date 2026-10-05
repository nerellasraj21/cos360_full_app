import { applyRoleMenuRules, menuChildrenFor, RoleMenuItem } from '../../src/lib/menuUtils';

const item = (name: string, children?: RoleMenuItem[]): RoleMenuItem => ({
  id: name,
  name,
  path: `/${name.toLowerCase().replace(/\s+/g, '-')}`,
  display_order: 1,
  children: children ?? null,
});

const tree = (): RoleMenuItem[] => [
  item('Students', [item('Admission'), item('Attendance'), item('Student Transport')]),
  item('Communication'),
];

describe('students menu rules (mobile)', () => {
  it('TC-STU-01-U01 hides Student Transport from the Students section case-insensitively', () => {
    const names = menuChildrenFor(tree(), 'admin', ['students']).map((c) => c.name);
    expect(names).toEqual(['Admission', 'Attendance']);
  });

  it('TC-STU-01-U01 matches the hidden label regardless of case', () => {
    const items = [item('Students', [item('Admission'), item('STUDENT TRANSPORT')])];
    expect(menuChildrenFor(items, 'admin', ['students']).map((c) => c.name)).toEqual(['Admission']);
  });

  it.each(['Parent', 'guardian', 'Father', 'MOTHER'])(
    'TC-STU-01-U02 parent-like role %s is treated as self service',
    (role) => {
      const names = applyRoleMenuRules(tree(), role).map((n) => n.name);
      expect(names).not.toContain('Communication');
      expect(names).toContain('Students');
    }
  );

  it('TC-STU-01-U02 Teacher is not treated as self service', () => {
    const names = applyRoleMenuRules(tree(), 'Teacher').map((n) => n.name);
    expect(names).toContain('Communication');
  });
});
