// Authentication provider component
import React from 'react';
import { useAuthStore } from '@/lib/authStore';
import { useParentStudents } from '@/api/parent';
import { logger } from '@/lib/config';
import { StudentProfileFetcher } from '@/components/StudentProfileFetcher';

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const {
    user,
    role,
    isAuthenticated,
    selectedStudent,
    availableStudents,
    setAvailableStudents,
    selectStudent,
  } = useAuthStore();

  // Only fetch parent students if user is authenticated and is a parent
  const isParent = isAuthenticated && role?.name?.toLowerCase() === 'parent';
  const {
    data: parentStudentsData,
    isLoading: studentsLoading,
    error: studentsError
  } = useParentStudents(isParent ? user?.id : undefined);

  // Update available students when data is fetched
  React.useEffect(() => {
    if (parentStudentsData && Array.isArray(parentStudentsData)) {
      // Map API response to Student type
      const mappedStudents = parentStudentsData.map((student: any) => ({
        id: student.id,
        name: `${student.first_name} ${student.last_name}`,
        first_name: student.first_name,
        last_name: student.last_name,
        admission_number: student.admission_number || '',
        class_id: student.class_id || '',
        class_name: student.class_name || '',
        section_id: student.section_id,
        section_name: student.section_name,
        academic_year: student.academic_year || '',
        academic_year_id: student.academic_year_id || '',
        is_active: student.is_active !== false,
        date_of_birth: student.date_of_birth,
        gender: student.gender,
      }));

      logger.debug('Updating available students', {
        count: mappedStudents.length,
        students: mappedStudents.map((s: any) => ({ id: s.id, name: s.name }))
      });
      setAvailableStudents(mappedStudents);
    }
  }, [parentStudentsData, setAvailableStudents]);

  // Sync selectedStudent whenever fresh student data arrives from API
  React.useEffect(() => {
    if (availableStudents.length > 0) {
      const currentId = selectedStudent?.id;
      const freshMatch = availableStudents.find((s) => s.id === currentId);
      // Re-select with fresh data (updates stale persisted ID), or select first if none
      selectStudent(freshMatch ?? availableStudents[0]);
    }
  }, [availableStudents]);

  // Log authentication state changes
  React.useEffect(() => {
    logger.debug('Auth state changed', {
      isAuthenticated,
      userId: user?.id,
      username: user?.username,
      isParent: !!user?.parent_profile,
      selectedStudentId: selectedStudent?.id,
      availableStudentsCount: availableStudents.length
    });
  }, [isAuthenticated, user, selectedStudent, availableStudents]);

  // Handle students loading error
  React.useEffect(() => {
    if (studentsError) {
      logger.error('Failed to load parent students', studentsError);
    }
  }, [studentsError]);

  return (
    <>
      <StudentProfileFetcher />
      {children}
    </>
  );
};