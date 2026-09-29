// Hook to manage student context for API calls
import { useAuthStore } from '@/lib/authStore';
import type { StudentContext } from '@/types/auth';

export const useStudentContext = (): StudentContext => {
  const selectedStudent = useAuthStore((state) => state.selectedStudent);

  return {
    studentId: selectedStudent?.id || null,
    academicYearId: selectedStudent?.academic_year_id || null,
    classId: selectedStudent?.class_id || null,
  };
};

// Hook to get current selected student
export const useSelectedStudent = () => {
  return useAuthStore((state) => state.selectedStudent);
};

// Hook to get available students
export const useAvailableStudents = () => {
  return useAuthStore((state) => state.availableStudents);
};

// Hook to check if user is a parent with students
export const useIsParent = () => {
  const user = useAuthStore((state) => state.user);
  const availableStudents = useAuthStore((state) => state.availableStudents);
  
  return !!(user?.parent_profile || availableStudents.length > 0);
};