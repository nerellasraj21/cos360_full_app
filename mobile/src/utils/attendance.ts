export function attendancePercentage(present: number, halfDay: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round(((present + halfDay * 0.5) / total) * 100);
}
