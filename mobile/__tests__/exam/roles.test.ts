import { ADMIN_ROLE_NAMES, isAdminRole } from '../../src/lib/roles';

describe('exam admin role gate', () => {
  test('TC-EXM-01-U07 isAdminRole matches admin, principal, superadmin case-insensitively', () => {
    expect(isAdminRole('Admin')).toBe(true);
    expect(isAdminRole('PRINCIPAL')).toBe(true);
    expect(isAdminRole('superadmin')).toBe(true);
    expect(isAdminRole('Teacher')).toBe(false);
    expect(isAdminRole(null)).toBe(false);
  });

  test('isAdminRole treats undefined and empty as non-admin', () => {
    expect(isAdminRole(undefined)).toBe(false);
    expect(isAdminRole('')).toBe(false);
    expect(ADMIN_ROLE_NAMES).toEqual(['admin', 'superadmin', 'principal']);
  });
});
