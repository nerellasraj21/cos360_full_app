import { attendancePercentage } from '@/src/utils/attendance';

describe('attendancePercentage', () => {
  it('counts half days as half a present day', () => {
    expect(attendancePercentage(18, 4, 24)).toBe(83);
    expect(attendancePercentage(8, 2, 10)).toBe(90);
  });

  it('does not count late, absent or leave as present', () => {
    expect(attendancePercentage(10, 0, 20)).toBe(50);
  });

  it('returns 0 when there are no records', () => {
    expect(attendancePercentage(0, 0, 0)).toBe(0);
  });
});
