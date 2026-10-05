import {
  checkPermissionWithFallbacks,
  generateFallbackPatterns,
  hasPermissionWithFallbacks,
} from '@/utils/permission-compatibility';
import { buildPermissionMap } from '@/src/stores/mobileAuthStore';
import { TEACHER_PERMISSION_MATRIX, getTeacherAllowedActions } from '@/src/lib/teacherPermissionMatrix';
import { STAFF_PERMISSION_MATRIX, getStaffAllowedActions } from '@/src/lib/staffPermissionMatrix';
import { isAdminRole } from '@/src/lib/roles';
import {
  applyRoleMenuRules,
  filterMenuForRole,
  roleBlocksFees,
  roleBlocksSchoolSettings,
  roleTopLevelMenu,
} from '@/src/lib/menuUtils';
import type { RoleMenuItem } from '@/src/lib/menuUtils';

const granted = (...keys: string[]) =>
  Object.fromEntries(
    keys.map(key => {
      const [resource, action] = key.split(':');
      return [key, { id: key, resource, action, is_granted: true }];
    })
  );

describe('permission fallback patterns', () => {
  test('TC-AUTH-05-U12 fee_types list generates the documented fallbacks', () => {
    const patterns = generateFallbackPatterns('fee_types', 'list');
    expect(patterns).toEqual(
      expect.arrayContaining([
        'fees_types:list',
        'feetypes:list',
        'fee_types:read',
        'fee_types:read_own',
        'fee_types:read_related',
      ])
    );
  });

  test('TC-AUTH-05-U13 a scoped read_related grant satisfies a list check', () => {
    const map = granted('student_attendance:read_related');
    const result = checkPermissionWithFallbacks(map, 'student_attendance', 'list');
    expect(result.hasPermission).toBe(true);
    expect(result.matchedPermission).toBe('student_attendance:read_related');
    expect(hasPermissionWithFallbacks(map, 'student_attendance', 'list')).toBe(true);
  });

  test('TC-AUTH-05-U13 an ungranted entry does not satisfy a check', () => {
    const map = { 'students:list': { id: 'students:list', resource: 'students', action: 'list', is_granted: false } };
    expect(hasPermissionWithFallbacks(map, 'students', 'list')).toBe(false);
    expect(hasPermissionWithFallbacks(map, 'students', 'delete')).toBe(false);
  });

  test('TC-AUTH-05-U13 write actions do not fall back to scoped or read grants', () => {
    const map = granted('students:read', 'students:read_own');
    expect(hasPermissionWithFallbacks(map, 'students', 'delete')).toBe(false);
    expect(hasPermissionWithFallbacks(map, 'students', 'create')).toBe(false);
  });

  test('TC-AUTH-05-U10 buildPermissionMap groups actions by resource', () => {
    const map = buildPermissionMap([
      { resource: 'students', action: 'list', is_granted: true },
      { resource: 'students', action: 'delete', is_granted: false },
    ]);
    expect(map).toEqual({ students: { list: true, delete: false } });
  });
});

describe('teacher and staff matrices on mobile', () => {
  test('TC-AUTH-05-U14 teacher exam_marks never includes delete', () => {
    expect(getTeacherAllowedActions('exam_marks')).toEqual(['create', 'read', 'list']);
    expect(getTeacherAllowedActions('exam_marks')).not.toContain('delete');
  });

  test('TC-AUTH-05-U14 teacher matrix mirrors the agreed table', () => {
    expect(TEACHER_PERMISSION_MATRIX.students).toEqual(['list']);
    expect(TEACHER_PERMISSION_MATRIX.student_attendance).toEqual(['create', 'read', 'update', 'list']);
    expect(getTeacherAllowedActions('fee_categories')).toBeUndefined();
  });

  test('TC-AUTH-05-U14 staff matrix keeps refunds, expenses and admissions capped', () => {
    expect(STAFF_PERMISSION_MATRIX.fee_refunds).toEqual(['create', 'read', 'list']);
    expect(STAFF_PERMISSION_MATRIX.expense_transactions).toEqual(['create', 'read', 'list']);
    expect(STAFF_PERMISSION_MATRIX.student_admissions).not.toContain('delete');
    expect(getStaffAllowedActions('unknown_resource')).toBeUndefined();
  });

  test('TC-AUTH-05-U14 the teacher and staff matrices are the same data as on web', () => {
    expect(Object.keys(TEACHER_PERMISSION_MATRIX).length).toBeGreaterThan(20);
    expect(TEACHER_PERMISSION_MATRIX.academic_years).toEqual(['read', 'list']);
    expect(STAFF_PERMISSION_MATRIX.academic_years).toEqual(['read', 'list']);
  });

  test('TC-AUTH-05-U14 admin role names are recognised case-insensitively', () => {
    expect(isAdminRole('Admin')).toBe(true);
    expect(isAdminRole('PRINCIPAL')).toBe(true);
    expect(isAdminRole('Teacher')).toBe(false);
    expect(isAdminRole(undefined)).toBe(false);
  });
});

const node = (id: string, name: string, path: string, children: RoleMenuItem[] | null = null): RoleMenuItem => ({
  id,
  name,
  path,
  display_order: 1,
  children,
});

describe('mobile menu role rules', () => {
  const fullMenu = [
    node('1', 'Dashboard', '/dashboard'),
    node('2', 'Communication', '/communication'),
    node('3', 'Reports', '/reports'),
    node('4', 'Masters', '/masters', [node('41', 'Classes', '/masters/classes')]),
    node('5', 'Transport', '/transport'),
    node('6', 'Students', '/students', [node('61', 'Student Transport', '/students/studenttransport')]),
  ];

  test('TC-AUTH-06-U14 parent loses Communication, Reports, Masters and Transport', () => {
    const result = applyRoleMenuRules(fullMenu, 'parent');
    const names = result.map(item => item.name);
    expect(names).toEqual(expect.arrayContaining(['Dashboard', 'Students']));
    for (const hidden of ['Communication', 'Reports', 'Masters', 'Transport']) {
      expect(names).not.toContain(hidden);
    }
    expect(result.find(item => item.name === 'Students')?.children).toEqual([]);
  });

  test('TC-AUTH-06-U14 student gets the same module removals and a self-service Fee node', () => {
    const result = applyRoleMenuRules(fullMenu, 'Student');
    const names = result.map(item => item.name);
    expect(names).not.toContain('Masters');
    const fee = result.find(item => item.name === 'Fee');
    expect(fee?.children?.map(child => child.name)).toEqual(['My Receipts', 'My Transactions']);
  });

  test('TC-AUTH-06-U14 an admin keeps every module', () => {
    const names = applyRoleMenuRules(fullMenu, 'Admin').map(item => item.name);
    expect(names).toEqual(['Dashboard', 'Communication', 'Reports', 'Masters', 'Transport', 'Students']);
  });

  test('TC-AUTH-06-U14 filterMenuForRole only strips fee items for teacher', () => {
    const items = [node('1', 'Fee', '/fee'), node('2', 'Students', '/students')];
    expect(filterMenuForRole(items, 'teacher').map(item => item.name)).toEqual(['Students']);
    expect(filterMenuForRole(items, 'admin')).toBe(items);
  });

  test('TC-AUTH-06-U14 parent aliases guardian, father and mother follow the parent rules', () => {
    for (const alias of ['guardian', 'father', 'mother']) {
      const names = applyRoleMenuRules(fullMenu, alias).map(item => item.name);
      expect(names).not.toContain('Masters');
    }
  });

  test('TC-AUTH-06-U15 role guards for fees and school settings', () => {
    expect(roleBlocksFees('Teacher')).toBe(true);
    expect(roleBlocksSchoolSettings('student')).toBe(true);
    expect(roleBlocksSchoolSettings('teacher')).toBe(true);
    expect(roleBlocksSchoolSettings('admin')).toBe(false);
    expect(roleBlocksFees('Admin')).toBe(false);
  });

  test('TC-AUTH-06-U14 top level menu is ordered like the web sidebar', () => {
    const items = [node('1', 'Reports', '/reports'), node('2', 'Dashboard', '/dashboard'), node('3', 'Zeta', '/zeta')];
    expect(roleTopLevelMenu(items, 'admin').map(item => item.name)).toEqual(['Dashboard', 'Reports', 'Zeta']);
    expect(roleTopLevelMenu(null, 'admin')).toEqual([]);
  });
});
