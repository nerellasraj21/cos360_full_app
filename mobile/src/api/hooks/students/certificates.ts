import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToastContext as useToast } from '../../../../components/ToastProvider';
import { useAuth } from '../../../../contexts/AuthContext';
import { usePermissionProtectedMutation } from '../../../../hooks/use-permission-protected-api';
import { PERMISSION_RESOURCES } from '../../../types/permissions';
import {
  studentCertificatesApi,
  certificateTypesApi,
  issuableCertificatesApi,
  CertificateResponse,
  CertificateCreate,
  CertificateUpdate,
  CertificateTypeRead,
  CertificateTypeDropdown,
  CertificateTypeCreate,
  CertificateTypeUpdate,
  IssuableCertificateTemplate,
  IssuableCertificateTemplateCreate,
  IssuableCertificateTemplateUpdate,
  GenerateCertificateRequest,
  GenerateCertificateResponse,
} from '../../students';

// Types imported from students.ts

// Get all issued certificates (admin view) - plain query; let backend return 403 on permission denied
export function useAllCertificates(params?: { student_id?: string; certificate_type_id?: string }) {
  return useQuery<CertificateResponse[]>({
    queryKey: ['certificates', 'all', params],
    queryFn: () => studentCertificatesApi.listCertificates(params),
  });
}

// Get all received/uploaded documents (admin view) — GET /certificates/received
export function useAllReceivedCertificates(params?: { student_id?: string; certificate_type_id?: string }) {
  return useQuery<CertificateResponse[]>({
    queryKey: ['certificates', 'received', params],
    queryFn: async () => {
      const data = await studentCertificatesApi.listReceived(params);
      // Tag each item so the UI can show a "Received" badge
      return (Array.isArray(data) ? data : (data as any)?.items ?? []).map((c: any) => ({
        ...c,
        _cert_source: 'received' as const,
      }));
    },
  });
}

// Get student's own certificates (student: /my, parent: /my-child/{id})
export function useMyCertificates() {
  const { studentId, selectedStudent, role } = useAuth();
  const roleName = role?.name?.toLowerCase() ?? '';
  const isParent = ['parent', 'guardian', 'father', 'mother'].includes(roleName);
  const childId = selectedStudent?.id;
  const effectiveId = isParent ? childId : studentId;
  return useQuery<CertificateResponse[]>({
    queryKey: ['certificates', 'my', effectiveId],
    queryFn: () => isParent
      ? studentCertificatesApi.myChildCertificates(childId!, { limit: 100 })
      : studentCertificatesApi.myCertificates({ limit: 100 }),
    // Only the parent call needs an id (it goes in the URL). Web parity: a
    // student hits GET /certificates/my unconditionally — the backend resolves
    // the student from the token, so don't gate it on a locally cached id.
    enabled: isParent ? !!childId : true,
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
      queryClient.invalidateQueries({ queryKey: ['certs-by-student'] });
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
      queryClient.invalidateQueries({ queryKey: ['certs-by-student'] });
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
      queryClient.invalidateQueries({ queryKey: ['certs-by-student'] });
    },
    onError: (error) => {
      showError('Error', `Failed to delete certificate: ${error.message}`);
    },
  });
}

// ─── Issuable Certificate Template hooks ─────────────────────────────────────

// List all issuable certificate templates
export function useIssuableCertificateTemplates() {
  return useQuery<IssuableCertificateTemplate[]>({
    queryKey: ['issuable-certificate-templates'],
    queryFn: () => issuableCertificatesApi.listTemplates(),
  });
}

// Get a single template by ID
export function useIssuableCertificateTemplate(id: string) {
  return useQuery<IssuableCertificateTemplate>({
    queryKey: ['issuable-certificate-templates', 'detail', id],
    queryFn: () => issuableCertificatesApi.getTemplate(id),
    enabled: !!id,
  });
}

// Create a new template
export function useCreateIssuableCertificateTemplate() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  return useMutation<IssuableCertificateTemplate, Error, IssuableCertificateTemplateCreate>({
    mutationFn: (data) => issuableCertificatesApi.createTemplate(data),
    onSuccess: (tpl) => {
      showSuccess('Created', `Template "${tpl.name}" created successfully.`);
      queryClient.invalidateQueries({ queryKey: ['issuable-certificate-templates'] });
    },
    onError: (error) => showError('Error', `Failed to create template: ${error.message}`),
  });
}

// Update an existing template
export function useUpdateIssuableCertificateTemplate() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  return useMutation<
    IssuableCertificateTemplate,
    Error,
    { templateId: string; data: IssuableCertificateTemplateUpdate }
  >({
    mutationFn: ({ templateId, data }) => issuableCertificatesApi.updateTemplate(templateId, data),
    onSuccess: (tpl) => {
      showSuccess('Updated', `Template "${tpl.name}" updated successfully.`);
      queryClient.invalidateQueries({ queryKey: ['issuable-certificate-templates'] });
    },
    onError: (error) => showError('Error', `Failed to update template: ${error.message}`),
  });
}

// Delete a template
export function useDeleteIssuableCertificateTemplate() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  return useMutation<void, Error, string>({
    mutationFn: (id) => issuableCertificatesApi.deleteTemplate(id),
    onSuccess: () => {
      showSuccess('Deleted', 'Template deleted successfully.');
      queryClient.invalidateQueries({ queryKey: ['issuable-certificate-templates'] });
    },
    onError: (error) => showError('Error', `Failed to delete template: ${error.message}`),
  });
}

// Generate and save an issuable certificate
export function useGenerateIssuableCertificate() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  return useMutation<GenerateCertificateResponse, Error, GenerateCertificateRequest>({
    mutationFn: (data) => issuableCertificatesApi.generateCertificate(data),
    onSuccess: () => {
      showSuccess('Generated', 'Certificate generated successfully!');
      // Invalidate all certificate-related query keys used across the app
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
      queryClient.invalidateQueries({ queryKey: ['certs-by-student'] });
      queryClient.invalidateQueries({ queryKey: ['issuable-certs-by-student'] });
    },
    onError: (error) => {
      showError('Error', `Failed to generate certificate: ${error.message}`);
    },
  });
}