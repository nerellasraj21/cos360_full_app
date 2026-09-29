import { useEffect } from 'react';
import { useStudentProfile } from '@/api/hooks/students/profile';
import { useAuthStore } from '@/lib/authStore';

export const StudentProfileFetcher: React.FC = () => {
  const { role, isAuthenticated, setStudentId } = useAuthStore();

  // Only fetch profile for student role to get the actual student ID
  const shouldFetch = isAuthenticated && role?.name?.toLowerCase() === 'student';

  const { data: profile, error } = useStudentProfile(shouldFetch);

  // useEffect(() => {
  //   if (profile && shouldFetch) {
  //     console.log('Setting studentId from profile:', profile.id);
  //     // Set studentId from profile for student role
  //     setStudentId(profile.id);
  //   }
  // }, [profile, shouldFetch, setStudentId]);

  // useEffect(() => {
  //   if (error) {
  //     console.error('Error fetching student profile:', error);
  //   }
  // }, [error]);

  return null; // Side-effect only component
};