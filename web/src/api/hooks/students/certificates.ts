import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import CAxios from '@/api';
import { CERTIFICATES_BASE, CERTIFICATE_TYPES_BASE } from '@/constants/api/certificates';
import { useAuthStore } from '@/lib/authStore';
import type {
  CertificateRead,
  CertificateTypeRead,
  CertificateTypeCreate,
  CertificateTypeUpdate,
  CertificateTypeDropdown,
  PresignedUrlResponse,
  PaginatedResponse,
} from '@/types/certificates/types';

// Re-export CertificateRead as CertificateResponse for backward-compat
export type CertificateResponse = CertificateRead;
export type { CertificateRead };

// ─── Type interfaces kept inline for hook consumers ───────────────────────────

export interface CertificateTypeBase {
  name: string;
  description?: string;
}

export type { CertificateTypeCreate, CertificateTypeUpdate, CertificateTypeDropdown };

export interface CertificateTypesResponse {
  items: CertificateTypeRead[];
  total: number;
  has_next: boolean;
}

export interface CertificateCreateRequest {
  student_id: string;
  certificate_type_id: string;
  issue_date?: string;
  remarks?: string;
  certificate_file?: File;
}

export interface CertificateUpdateRequest {
  certificate_type_id: string;
  issue_date?: string;
  remarks?: string;
  certificate_file?: File;
}

// ─── Certificate Type Hooks ────────────────────────────────────────────────────

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

// ─── Certificate Query Hooks ───────────────────────────────────────────────────

// Admin/Staff — list all certificates, optionally filtered by student
export function useCertificates(params?: {
  student_id?: string;
  skip?: number;
  limit?: number;
}) {
  return useQuery<PaginatedResponse<CertificateRead>>({
    queryKey: ['certificates', params],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params?.student_id) queryParams.append('student_id', params.student_id);
      if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
      if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());

      const response = await CAxios.get(`${CERTIFICATES_BASE}/?${queryParams.toString()}`);
      return response.data;
    },
  });
}

// Admin/Staff — list certificates for a specific student
export function useStudentCertificates(studentId: string) {
  return useQuery<PaginatedResponse<CertificateRead>>({
    queryKey: ['student-certificates', studentId],
    queryFn: async () => {
      const response = await CAxios.get(`${CERTIFICATES_BASE}/?student_id=${studentId}`);
      return response.data;
    },
    enabled: !!studentId,
  });
}

// Student — own certificates via /certificates/my
export function useMyCertificates() {
  return useQuery<PaginatedResponse<CertificateRead>>({
    queryKey: ['my-certificates'],
    queryFn: async () => {
      const response = await CAxios.get(`${CERTIFICATES_BASE}/my`);
      return response.data;
    },
  });
}

// Parent — child's certificates via /certificates/my-child/{student_id}
export function useMyChildCertificates(studentId: string) {
  return useQuery<PaginatedResponse<CertificateRead>>({
    queryKey: ['my-child-certificates', studentId],
    queryFn: async () => {
      const response = await CAxios.get(`${CERTIFICATES_BASE}/my-child/${studentId}`);
      return response.data;
    },
    enabled: !!studentId,
  });
}

export function useCertificate(id: string) {
  return useQuery<CertificateRead>({
    queryKey: ['certificate', id],
    queryFn: async () => {
      const response = await CAxios.get(`${CERTIFICATES_BASE}/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

// Dropdown of certificate types (for form selects)
export function useCertificateTypes() {
  return useQuery<CertificateTypeDropdown[]>({
    queryKey: ['certificate-types'],
    queryFn: async () => {
      const response = await CAxios.get(`${CERTIFICATE_TYPES_BASE}/dropdown`);
      return response.data;
    },
  });
}

// ─── Certificate Mutation Hooks ────────────────────────────────────────────────

export function useCreateCertificate() {
  const queryClient = useQueryClient();
  return useMutation<CertificateRead, Error, CertificateCreateRequest>({
    mutationFn: async (data) => {
      const formData = new FormData();
      formData.append('student_id', data.student_id);
      formData.append('certificate_type_id', data.certificate_type_id);
      if (data.issue_date) formData.append('issue_date', data.issue_date);
      if (data.remarks) formData.append('remarks', data.remarks);
      if (data.certificate_file) formData.append('certificate_file', data.certificate_file);

      const response = await CAxios.post(`${CERTIFICATES_BASE}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
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
  return useMutation<CertificateRead, Error, { id: string; data: CertificateUpdateRequest }>({
    mutationFn: async ({ id, data }) => {
      const formData = new FormData();
      formData.append('certificate_type_id', data.certificate_type_id);
      if (data.issue_date) formData.append('issue_date', data.issue_date);
      if (data.remarks) formData.append('remarks', data.remarks);
      if (data.certificate_file) formData.append('certificate_file', data.certificate_file);

      const response = await CAxios.patch(`${CERTIFICATES_BASE}/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
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
      await CAxios.delete(`${CERTIFICATES_BASE}/${id}`);
    },
    onSuccess: () => {
      toast.success('Certificate deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
      queryClient.invalidateQueries({ queryKey: ['my-certificates'] });
    },
    onError: (error) => {
      toast.error(`Failed to delete certificate: ${error.message}`);
    },
  });
}

// Download — returns presigned S3 URL; caller does window.location = presigned_url
export function useDownloadCertificateDocument() {
  return useMutation<PresignedUrlResponse, Error, string>({
    mutationFn: async (id) => {
      const response = await CAxios.get(`${CERTIFICATES_BASE}/${id}/download`);
      return response.data;
    },
    onError: (error) => {
      toast.error(`Failed to get download link: ${error.message}`);
    },
  });
}
