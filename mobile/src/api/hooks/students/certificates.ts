import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../../../components/FeedbackToast';
import { useAuth } from '../../../../contexts/AuthContext';
import { usePermissionProtectedQuery, usePermissionProtectedMutation } from '../../../../hooks/use-permission-protected-api';
import { PERMISSION_RESOURCES } from '../../../types/permissions';
import {
  studentCertificatesApi,
  certificateTypesApi,
  CertificateResponse,
  CertificateCreate,
  CertificateUpdate,
  CertificateTypeRead,
  CertificateTypeDropdown,
  CertificateTypeCreate,
  CertificateTypeUpdate
} from '../../students';

// Types imported from students.ts

// Get all certificates (admin view) - permission protected
export function useAllCertificates(params?: { student_id?: string; certificate_type_id?: string }) {
  return usePermissionProtectedQuery<CertificateResponse[]>({
    resource: PERMISSION_RESOURCES.STUDENT_CERTIFICATES,
    action: 'list',
    queryKey: ['certificates', 'all', params],
    queryFn: () => studentCertificatesApi.listCertificates(params),
  });
}

// Get student's certificates - permission protected
export function useMyCertificates() {
  const { studentId } = useAuth();
  return usePermissionProtectedQuery<CertificateResponse[]>({
    resource: PERMISSION_RESOURCES.STUDENT_CERTIFICATES,
    action: 'read',
    queryKey: ['certificates', 'my', studentId],
    queryFn: () => studentCertificatesApi.listCertificates({ student_id: studentId || undefined }),
    enabled: !!studentId,
  });
}

// Get all certificate types (paginated)
export function useCertificateTypes(params?: { skip?: number; limit?: number }) {
  return useQuery<{ items: CertificateTypeRead[]; total_count: number; has_next: boolean }>({
    queryKey: ['certificate-types', 'list', params],
    queryFn: () => certificateTypesApi.listCertificateTypes(params),
  });
}

// Get certificate type by ID
export function useCertificateType(id: string) {
  return useQuery<CertificateTypeRead>({
    queryKey: ['certificate-types', 'detail', id],
    queryFn: () => certificateTypesApi.getCertificateType(id),
    enabled: !!id,
  });
}

// Get certificate types for dropdown
export function useCertificateTypesDropdown() {
  return useQuery<CertificateTypeDropdown[]>({
    queryKey: ['certificate-types', 'dropdown'],
    queryFn: () => certificateTypesApi.getCertificateTypesDropdown(),
  });
}

// Create certificate type
export function useCreateCertificateType() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  return useMutation<CertificateTypeRead, Error, CertificateTypeCreate>({
    mutationFn: certificateTypesApi.createCertificateType,
    onSuccess: () => {
      showSuccess('Success', 'Certificate type created successfully!');
      queryClient.invalidateQueries({ queryKey: ['certificate-types'] });
    },
    onError: (error) => {
      showError('Error', `Failed to create certificate type: ${error.message}`);
    },
  });
}

// Update certificate type
export function useUpdateCertificateType() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  return useMutation<CertificateTypeRead, Error, { id: string; data: CertificateTypeUpdate }>({
    mutationFn: ({ id, data }) => certificateTypesApi.updateCertificateType(id, data),
    onSuccess: () => {
      showSuccess('Success', 'Certificate type updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['certificate-types'] });
    },
    onError: (error) => {
      showError('Error', `Failed to update certificate type: ${error.message}`);
    },
  });
}

// Delete certificate type
export function useDeleteCertificateType() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  return useMutation<{ message: string }, Error, string>({
    mutationFn: certificateTypesApi.deleteCertificateType,
    onSuccess: () => {
      showSuccess('Success', 'Certificate type deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['certificate-types'] });
    },
    onError: (error) => {
      showError('Error', `Failed to delete certificate type: ${error.message}`);
    },
  });
}

// Download certificate
export function useDownloadCertificateDocument() {
  return useMutation({
    mutationFn: async (certificateId: string) => {
      return await studentCertificatesApi.downloadCertificate(certificateId);
    },
  });
}

// Create certificate - permission protected
export function useCreateCertificate() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  return usePermissionProtectedMutation<CertificateResponse, Error, CertificateCreate>({
    resource: PERMISSION_RESOURCES.STUDENT_CERTIFICATES,
    action: 'create',
    mutationFn: studentCertificatesApi.createCertificate,
    onSuccess: () => {
      showSuccess('Success', 'Certificate created successfully!');
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
    },
    onError: (error) => {
      showError('Error', `Failed to create certificate: ${error.message}`);
    },
  });
}

// Update certificate - permission protected
export function useUpdateCertificate() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  return usePermissionProtectedMutation<CertificateResponse, Error, { id: string; data: CertificateUpdate }>({
    resource: PERMISSION_RESOURCES.STUDENT_CERTIFICATES,
    action: 'update',
    mutationFn: ({ id, data }) => studentCertificatesApi.updateCertificate(id, data),
    onSuccess: () => {
      showSuccess('Success', 'Certificate updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
    },
    onError: (error) => {
      showError('Error', `Failed to update certificate: ${error.message}`);
    },
  });
}

// Delete certificate - permission protected
export function useDeleteCertificate() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  return usePermissionProtectedMutation<void, Error, string>({
    resource: PERMISSION_RESOURCES.STUDENT_CERTIFICATES,
    action: 'delete',
    mutationFn: studentCertificatesApi.deleteCertificate,
    onSuccess: () => {
      showSuccess('Success', 'Certificate deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
    },
    onError: (error) => {
      showError('Error', `Failed to delete certificate: ${error.message}`);
    },
  });
}