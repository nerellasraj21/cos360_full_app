import { useQuery } from '@tanstack/react-query';
import { getStudentProfile, type StudentProfileOut } from '@/api/students/profile';

export function useStudentProfile(enabled: boolean = true) {
  return useQuery<StudentProfileOut, Error>({
    queryKey: ['student-profile'],
    queryFn: getStudentProfile,
    enabled,
  });
}