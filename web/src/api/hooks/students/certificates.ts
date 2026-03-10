import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import CAxios from '@/api';
import { CERTIFICATES_BASE, CERTIFICATE_TYPES_BASE } from '@/constants/api/certificates';
import type {
  CertificateRead,
  CertificateTypeRead,
  CertificateTypeCreate,
  CertificateTypeUpdate,
  CertificateTypeDropdown,
  CertificateTypeSearchResult,
  SelectorClass,
  SelectorSection,
  SelectorStudent,
  PresignedUrlResponse,
  PaginatedResponse,
} from '@/types/certificates/types';

// Re-export types for hook consumers
export type CertificateResponse = CertificateRead;
export type { CertificateRead };
export type { CertificateTypeCreate, CertificateTypeUpdate, CertificateTypeDropdown };
export type { SelectorClass, SelectorSection, SelectorStudent };
export type { CertificateTypeSearchResult };

// ─── Type interfaces kept inline for hook consumers ───────────────────────────

export interface CertificateTypeBase {
  name: string;
  description?: string;
}

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
      queryClient.invalidateQueries({ queryKey: ['certificate-types-search'] });
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
      queryClient.invalidateQueries({ queryKey: ['certificate-types-search'] });
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
      queryClient.invalidateQueries({ queryKey: ['certificate-types-search'] });
    },
    onError: (error) => {
      toast.error(`Failed to delete certificate type: ${error.message}`);
    },
  });
}

// Search certificate types — GET /certificates/types/search?q=&limit=
export function useSearchCertificateTypes(q = '', limit = 100) {
  return useQuery<CertificateTypeSearchResult[]>({
    queryKey: ['certificate-types-search', q, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (q) params.append('q', q);
      params.append('limit', limit.toString());
      const response = await CAxios.get(`${CERTIFICATE_TYPES_BASE}/search?${params}`);
      return response.data;
    },
  });
}

// Dropdown of certificate types (for form selects — legacy)
export function useCertificateTypes() {
  return useQuery<CertificateTypeDropdown[]>({
    queryKey: ['certificate-types'],
    queryFn: async () => {
      const response = await CAxios.get(`${CERTIFICATE_TYPES_BASE}/dropdown`);
      return response.data;
    },
  });
}

// ─── Cascade Selector Hooks (Admin) ───────────────────────────────────────────

// GET /certificates/selector/classes
export function useSelectorClasses() {
  return useQuery<SelectorClass[]>({
    queryKey: ['cert-selector-classes'],
    queryFn: async () => {
      const response = await CAxios.get(`${CERTIFICATES_BASE}/selector/classes`);
      return response.data;
    },
  });
}

// GET /certificates/selector/sections?class_id=
export function useSelectorSections(classId: string) {
  return useQuery<SelectorSection[]>({
    queryKey: ['cert-selector-sections', classId],
    queryFn: async () => {
      const response = await CAxios.get(
        `${CERTIFICATES_BASE}/selector/sections?class_id=${classId}`
      );
      return response.data;
    },
    enabled: !!classId,
  });
}

// GET /certificates/selector/students?class_id=&section_id=
export function useSelectorStudents(classId: string, sectionId?: string) {
  return useQuery<SelectorStudent[]>({
    queryKey: ['cert-selector-students', classId, sectionId],
    queryFn: async () => {
      const params = new URLSearchParams({ class_id: classId });
      if (sectionId) params.append('section_id', sectionId);
      const response = await CAxios.get(
        `${CERTIFICATES_BASE}/selector/students?${params}`
      );
      return response.data;
    },
    enabled: !!classId,
  });
}

// ─── Certificate Query Hooks ───────────────────────────────────────────────────

// Admin — list all received documents
export function useReceivedCertificates(params?: {
  student_id?: string;
  certificate_type_id?: string;
  skip?: number;
  limit?: number;
}) {
  return useQuery<PaginatedResponse<CertificateRead>>({
    queryKey: ['certificates-received', params],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params?.student_id) queryParams.append('student_id', params.student_id);
      if (params?.certificate_type_id) queryParams.append('certificate_type_id', params.certificate_type_id);
      if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
      if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
      const response = await CAxios.get(`${CERTIFICATES_BASE}/received?${queryParams}`);
      return response.data;
    },
  });
}

// Admin — list all issued certificates
export function useIssuedCertificates(params?: {
  student_id?: string;
  certificate_type_id?: string;
  skip?: number;
  limit?: number;
}) {
  return useQuery<PaginatedResponse<CertificateRead>>({
    queryKey: ['certificates-issued', params],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params?.student_id) queryParams.append('student_id', params.student_id);
      if (params?.certificate_type_id) queryParams.append('certificate_type_id', params.certificate_type_id);
      if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
      if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
      const response = await CAxios.get(`${CERTIFICATES_BASE}/issued?${queryParams}`);
      return response.data;
    },
  });
}

// Admin — certificates by student (datatable view)
export function useCertificatesByStudent(
  studentId: string,
  params?: {
    skip?: number;
    limit?: number;
  }
) {
  return useQuery<PaginatedResponse<CertificateRead>>({
    queryKey: ['certificates-by-student', studentId, params],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
      if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
      const response = await CAxios.get(
        `${CERTIFICATES_BASE}/by-student/${studentId}?${queryParams}`
      );
      return response.data;
    },
    enabled: !!studentId,
  });
}

// Admin/Staff — list all certificates, optionally filtered by student (legacy)
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

// Admin/Staff — list certificates for a specific student (legacy)
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

// Parent — child's received documents
export function useMyChildReceived(studentId: string) {
  return useQuery<PaginatedResponse<CertificateRead>>({
    queryKey: ['my-child-received', studentId],
    queryFn: async () => {
      const response = await CAxios.get(`${CERTIFICATES_BASE}/my-child/${studentId}/received`);
      return response.data;
    },
    enabled: !!studentId,
  });
}

// Parent + Student — child's issued certificates
export function useMyChildIssued(studentId: string) {
  return useQuery<PaginatedResponse<CertificateRead>>({
    queryKey: ['my-child-issued', studentId],
    queryFn: async () => {
      const response = await CAxios.get(`${CERTIFICATES_BASE}/my-child/${studentId}/issued`);
      return response.data;
    },
    enabled: !!studentId,
  });
}

// Parent — child's certificates (combined, legacy)
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

// ─── Certificate Mutation Hooks ────────────────────────────────────────────────

// Admin — upload received document (POST /certificates/received)
export function useUploadReceived() {
  const queryClient = useQueryClient();
  return useMutation<CertificateRead, Error, FormData>({
    mutationFn: async (formData) => {
      const response = await CAxios.post(`${CERTIFICATES_BASE}/received`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('Document uploaded successfully!');
      queryClient.invalidateQueries({ queryKey: ['certificates-by-student', data.student_id] });
      queryClient.invalidateQueries({ queryKey: ['certificates-received'] });
    },
    onError: (error) => {
      toast.error(`Failed to upload document: ${error.message}`);
    },
  });
}

// Admin — issue school certificate (POST /certificates/issued)
export function useUploadIssued() {
  const queryClient = useQueryClient();
  return useMutation<CertificateRead, Error, FormData>({
    mutationFn: async (formData) => {
      const response = await CAxios.post(`${CERTIFICATES_BASE}/issued`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('Certificate issued successfully!');
      queryClient.invalidateQueries({ queryKey: ['certificates-by-student', data.student_id] });
      queryClient.invalidateQueries({ queryKey: ['certificates-issued'] });
    },
    onError: (error) => {
      toast.error(`Failed to issue certificate: ${error.message}`);
    },
  });
}

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
      queryClient.invalidateQueries({ queryKey: ['certificates-by-student', data.student_id] });
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
      queryClient.invalidateQueries({ queryKey: ['certificates-by-student'] });
      queryClient.invalidateQueries({ queryKey: ['certificates-received'] });
      queryClient.invalidateQueries({ queryKey: ['certificates-issued'] });
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
