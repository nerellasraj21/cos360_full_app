import { roleBlocksFees } from '@/src/lib/menuUtils';

describe('fee role guard', () => {
  test('TC-FEE-17-U05 roleBlocksFees is true for teacher in any case', () => {
    expect(roleBlocksFees('teacher')).toBe(true);
    expect(roleBlocksFees('Teacher')).toBe(true);
  });

  test('TC-FEE-17-U05 roleBlocksFees is false for admin, student and parent', () => {
    expect(roleBlocksFees('admin')).toBe(false);
    expect(roleBlocksFees('student')).toBe(false);
    expect(roleBlocksFees('parent')).toBe(false);
    expect(roleBlocksFees(null)).toBe(false);
    expect(roleBlocksFees(undefined)).toBe(false);
  });
});
