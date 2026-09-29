import { useMutation, useQuery } from '@tanstack/react-query';
import CAxios from '@/api';
import type {
  StudentAdmissionRequest,
  StudentAdmissionResponse,
  StudentDropdownItem
} from '@/types/admission';
import { getAdmissionByStudentId } from '@/api/students/admissions';

export const useAdmission = () => {
  const createAdmission = useMutation<
    StudentAdmissionResponse,
    Error,
    StudentAdmissionRequest
  >({
    mutationFn: async (data: StudentAdmissionRequest) => {
      const response = await CAxios.post('/students/admission/', data);
      return response.data;
    },
  });

  return {
    createAdmission,
  };
};

export const useStudentAdmissionDetail = (studentId: string) => {
  return useQuery<StudentAdmissionResponse>({
    queryKey: ['students', 'admission-detail', studentId],
    queryFn: () => getAdmissionByStudentId(studentId),
    enabled: !!studentId,
  });
};

export const useStudentsDropdown = (activeOnly: boolean = true) => {
  return useQuery<StudentDropdownItem[]>({
    queryKey: ['students', 'dropdown', activeOnly],
    queryFn: async () => {
      const response = await CAxios.get('/students/admission/students/dropdown', {
        params: { active_only: activeOnly }
      });
      return response.data;
    },
  });
};
