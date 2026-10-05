import { getStaffAllowedActions, STAFF_PERMISSION_MATRIX } from '../../src/lib/staffPermissionMatrix';
import { getTeacherAllowedActions, TEACHER_PERMISSION_MATRIX } from '../../src/lib/teacherPermissionMatrix';

describe('staff and teacher permission caps (mobile)', () => {
  it('Staff is capped to read and list on staff', () => {
    expect(getStaffAllowedActions('staff')).toEqual(['read', 'list']);
  });

  it('Staff is capped to read and list on designations', () => {
    expect(getStaffAllowedActions('designations')).toEqual(['read', 'list']);
  });

  it('Teacher is capped to read and list on designations and has no staff entry', () => {
    expect(getTeacherAllowedActions('designations')).toEqual(['read', 'list']);
    expect(TEACHER_PERMISSION_MATRIX.staff).toBeUndefined();
  });

  it('staff_attendance and communications are not capped so the backend grant decides', () => {
    expect(getStaffAllowedActions('staff_attendance')).toBeUndefined();
    expect(STAFF_PERMISSION_MATRIX.communications).toBeUndefined();
    expect(getTeacherAllowedActions('staff_attendance')).toBeUndefined();
    expect(TEACHER_PERMISSION_MATRIX.communications).toBeUndefined();
  });

  it('mirrors the web matrix for staff and designations', () => {
    expect(STAFF_PERMISSION_MATRIX.staff).toEqual(['read', 'list']);
    expect(STAFF_PERMISSION_MATRIX.designations).toEqual(['read', 'list']);
  });
});
