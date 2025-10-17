import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import CAxios from '@/api';
import { CERTIFICATES_BASE, CERTIFICATE_TYPES_BASE } from '@/constants/api/certificates';
import { useAuthStore } from '@/lib/authStore';

// Certificate Types
export interface CertificateTypeBase {
  name: string;
  description?: string;
}

export interface CertificateTypeCreate extends CertificateTypeBase {}

export interface CertificateTypeUpdate {
  name?: string;
  description?: string;
}

export interface CertificateTypeRead extends CertificateTypeBase {
  id: string;
}

export interface CertificateTypeDropdown {
  id: string;
  name: string;
}

// Certificate Types Response
export interface CertificateTypesResponse {
  items: CertificateTypeRead[];
  total_count: number;
  has_next: boolean;
}

// Certificates
export interface CertificateIssueBase {
  student_id: string;
  certificate_type_id: string;
  issue_date?: string;
  description?: string;
  certificate_file?: string;
}

export interface CertificateIssueCreate extends CertificateIssueBase {}

export interface CertificateIssueUpdate {
  certificate_type_id: string;
  issue_date?: string;
  description?: string;
  certificate_file?: File;
}

export interface CertificateIssueOut extends CertificateIssueBase {
  id: string;
  student?: any; // StudentAdmissionResponse
}

export interface CertificateFileResponse {
  certificate_type_id: string;
  issue_date?: string;
  file_path?: string;
  exists_on_disk: boolean;
}

// Legacy types for backward compatibility
export interface CertificateCreateRequest {
  student_id: string;
  certificate_type_id: string;
  issue_date?: string;
  description?: string;
  certificate_file?: File;
}

export interface CertificateUpdateRequest extends CertificateIssueUpdate {}

export interface CertificateResponse extends CertificateIssueOut {
  remarks?: string; // For backward compatibility
  file_path?: string; // For backward compatibility
}

export interface CertificateType extends CertificateTypeRead {}

// Certificate Type Hooks
export function useCertificateTypesList(params?: { skip?: number; limit?: number }) {
  return useQuery<CertificateTypesResponse>({
    queryKey: ['certificate-types-list', params],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
      if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());

      const response = await CAxios.get(`${CERTIFICATE_TYPES_BASE}/?${queryParams.toString()}`);
      return response.data;
    },
  });
}

export function useCertificateType(id: string) {
  return useQuery<CertificateTypeRead>({
    queryKey: ['certificate-type', id],
    queryFn: async () => {
      const response = await CAxios.get(`${CERTIFICATE_TYPES_BASE}/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateCertificateType() {
  const queryClient = useQueryClient();
  return useMutation<CertificateTypeRead, Error, CertificateTypeCreate>({
    mutationFn: async (data) => {
      const response = await CAxios.post(CERTIFICATE_TYPES_BASE + '/', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Certificate type created successfully!');
      queryClient.invalidateQueries({ queryKey: ['certificate-types'] });
      queryClient.invalidateQueries({ queryKey: ['certificate-types-list'] });
    },
    onError: (error) => {
      toast.error(`Failed to create certificate type: ${error.message}`);
    },
  });
}

export function useUpdateCertificateType() {
  const queryClient = useQueryClient();
  return useMutation<CertificateTypeRead, Error, { id: string; data: CertificateTypeUpdate }>({
    mutationFn: async ({ id, data }) => {
      const response = await CAxios.put(`${CERTIFICATE_TYPES_BASE}/${id}`, data);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('Certificate type updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['certificate-types'] });
      queryClient.invalidateQueries({ queryKey: ['certificate-types-list'] });
      queryClient.invalidateQueries({ queryKey: ['certificate-type', data.id] });
    },
    onError: (error) => {
      toast.error(`Failed to update certificate type: ${error.message}`);
    },
  });
}

export function useDeleteCertificateType() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await CAxios.delete(`${CERTIFICATE_TYPES_BASE}/${id}`);
    },
    onSuccess: () => {
      toast.success('Certificate type deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['certificate-types'] });
      queryClient.invalidateQueries({ queryKey: ['certificate-types-list'] });
    },
    onError: (error) => {
      toast.error(`Failed to delete certificate type: ${error.message}`);
    },
  });
}

// Query hooks
export function useCertificates(params?: {
  student_id?: string;
  skip?: number;
  limit?: number;
}) {
  return useQuery<{
    items: CertificateResponse[];
    total_count: number;
    has_next: boolean;
  }>({
    queryKey: ['certificates', params],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
      if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());

      const response = await CAxios.get(`/student/certificates/?${queryParams.toString()}`);
      return response.data;
    },
  });
}

export function useStudentCertificates(studentId: string) {
  console.log(studentId, "studentId in useStudentCertificates");
  return useQuery<CertificateResponse[]>({
    queryKey: ['student-certificates', studentId],
    queryFn: async () => {
      const response = await CAxios.get(`/student/certificates/student/${studentId}`);
      return response.data;
    },
    enabled: !!studentId,
  });
}

// Hook that automatically uses studentId from auth store
export function useMyCertificates() {
  // Import here to avoid circular dependency
  const { studentId } = useAuthStore();
  return useStudentCertificates(studentId || "");
}

export function useCertificate(id: string) {
  return useQuery<CertificateResponse>({
    queryKey: ['certificate', id],
    queryFn: async () => {
      const response = await CAxios.get(`${CERTIFICATES_BASE}/certificateid/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCertificateTypes() {
  return useQuery<CertificateTypeDropdown[]>({
    queryKey: ['certificate-types'],
    queryFn: async () => {
      const response = await CAxios.get(`${CERTIFICATE_TYPES_BASE}/dropdown`);
      return response.data;
    },
  });
}

export function useCertificateTypesAlternative() {
  return useQuery<CertificateTypeRead[]>({
    queryKey: ['certificate-types-alternative'],
    queryFn: async () => {
      const response = await CAxios.get(`${CERTIFICATES_BASE}/certificate-types`);
      return response.data;
    },
  });
}

// Mutation hooks
export function useCreateCertificate() {
  const queryClient = useQueryClient();
  return useMutation<CertificateResponse, Error, CertificateCreateRequest>({
    mutationFn: async (data) => {
      const formData = new FormData();
      formData.append('student_id', data.student_id);
      formData.append('certificate_type_id', data.certificate_type_id);
      if (data.issue_date) formData.append('issue_date', data.issue_date);
      if (data.description) formData.append('description', data.description);
      if (data.certificate_file) formData.append('certificate_file', data.certificate_file);

      const response = await CAxios.post('/student/certificates/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('Certificate created successfully!');
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
      queryClient.invalidateQueries({ queryKey: ['student-certificates', data.student_id] });
    },
    onError: (error) => {
      toast.error(`Failed to create certificate: ${error.message}`);
    },
  });
}

export function useUpdateCertificate() {
  const queryClient = useQueryClient();
  return useMutation<CertificateResponse, Error, { id: string; data: CertificateUpdateRequest }>({
    mutationFn: async ({ id, data }) => {
      const formData = new FormData();
      formData.append('certificate_type_id', data.certificate_type_id);
      if (data.issue_date) formData.append('issue_date', data.issue_date);
      if (data.description) formData.append('description', data.description);
      if (data.certificate_file) formData.append('certificate_file', data.certificate_file);

      const response = await CAxios.patch(`${CERTIFICATES_BASE}/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('Certificate updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
      queryClient.invalidateQueries({ queryKey: ['certificate', data.id] });
      queryClient.invalidateQueries({ queryKey: ['student-certificates'] });
    },
    onError: (error) => {
      toast.error(`Failed to update certificate: ${error.message}`);
    },
  });
}

export function useDeleteCertificate() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await CAxios.delete(`/student/certificates/${id}`);
    },
    onSuccess: () => {
      toast.success('Certificate deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
    },
    onError: (error) => {
      toast.error(`Failed to delete certificate: ${error.message}`);
    },
  });
}


export function useDownloadCertificateDocument() {
  return useMutation<Blob, Error, string>({
    mutationFn: async (id) => {
      const response = await CAxios.get(`/student/certificates/certificates/${id}/download`, {
        responseType: 'blob',
      });
      return response.data;
    },
    onError: (error) => {
      toast.error(`Failed to download document: ${error.message}`);
    },
  });
}