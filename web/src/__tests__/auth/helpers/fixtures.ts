import type { LoginResponse, Student } from '@/types/auth'

export const makeStudent = (id: string, extra: Partial<Student> = {}): Student => ({
  id,
  name: `Student ${id}`,
  first_name: 'First',
  last_name: id,
  admission_number: `ADM${id}`,
  class_id: `class-${id}`,
  class_name: 'Class 1',
  academic_year: '2025-2026',
  academic_year_id: `year-${id}`,
  is_active: true,
  ...extra,
})

export const makeLogin = (roleName: string, extra: Partial<LoginResponse> = {}): LoginResponse => ({
  access_token: 'access-1',
  refresh_token: 'refresh-1',
  token_type: 'bearer',
  user: { id: 'user-1', username: 'alice', email: null, is_active: true },
  role: { id: 'role-1', name: roleName, description: null },
  menu: [],
  permissions: {},
  ...extra,
})
