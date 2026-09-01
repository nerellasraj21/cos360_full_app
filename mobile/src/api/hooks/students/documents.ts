import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToastContext as useToast } from '../../../../components/ToastProvider';
import { useAuth } from '../../../../contexts/AuthContext';
import { usePermissionProtectedMutation } from '../../../../hooks/use-permission-protected-api';
import { PERMISSION_RESOURCES } from '../../../types/permissions';
import {
  studentDocumentsApi,
  StudentAllDocumentItem,
  DocumentResponse,
  DocumentCreate,
  DocumentUpdate
} from '../../students';


export function useAllDocuments(params?: { student_id?: string }) {
  return useQuery<StudentAllDocumentItem[]>({
    queryKey: ['documents', 'all', params],
    queryFn: () => studentDocumentsApi.getAllDocuments(params),
    enabled: !!params?.student_id,
  });
}

export function useMyDocuments() {
  const { studentId, selectedStudent, role } = useAuth();
  const isParent = ['parent', 'guardian', 'father', 'mother'].includes(role?.name?.toLowerCase() ?? '');
  const effectiveId = isParent ? selectedStudent?.id : studentId;
  return useQuery<DocumentResponse[]>({
    queryKey: ['documents', 'my', effectiveId],
    queryFn: () => studentDocumentsApi.listDocuments({ student_id: effectiveId || undefined }),
    enabled: !!effectiveId,
  });
}

// Upload document - permission protected
export function useUploadMyDocument() {
  const { studentId, selectedStudent, role } = useAuth();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return usePermissionProtectedMutation<DocumentResponse, Error, Omit<DocumentCreate, 'student_id'>>({
    resource: PERMISSION_RESOURCES.STUDENT_DOCUMENTS,
    action: 'create',
    mutationFn: async (data: Omit<DocumentCreate, 'student_id'>) => {
      const isStudent = role?.name?.toLowerCase() === 'student';
      const currentStudentId = isStudent ? studentId : selectedStudent?.id;
      if (!currentStudentId) {
        throw new Error('Student ID not found');
      }
      return await studentDocumentsApi.uploadDocument({
        ...data,
        student_id: currentStudentId,
      });
    },
    onSuccess: () => {
      showSuccess('Success', 'Document uploaded successfully');
      queryClient.invalidateQueries({ queryKey: ['documents', 'my', studentId] });
    },
    onError: (error) => {
      showError('Error', `Failed to upload document: ${error.message}`);
    },
  });
}

// Update document - permission protected
export function useUpdateDocument() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  return usePermissionProtectedMutation<DocumentResponse, Error, { id: string; data: DocumentUpdate }>({
    resource: PERMISSION_RESOURCES.STUDENT_DOCUMENTS,
    action: 'update',
    mutationFn: ({ id, data }) => studentDocumentsApi.updateDocument(id, data),
    onSuccess: () => {
      showSuccess('Success', 'Document updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (error) => {
      showError('Error', `Failed to update document: ${error.message}`);
    },
  });
}

// Delete document - permission protected
export function useDeleteDocument() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  return usePermissionProtectedMutation<void, Error, string>({
    resource: PERMISSION_RESOURCES.STUDENT_DOCUMENTS,
    action: 'delete',
    mutationFn: studentDocumentsApi.deleteDocument,
    onSuccess: () => {
      showSuccess('Success', 'Document deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (error) => {
      showError('Error', `Failed to delete document: ${error.message}`);
    },
  });
}

// Download document
export function useDownloadDocument() {
  return useMutation({
    mutationFn: (documentId: string): Promise<Blob> =>
      studentDocumentsApi.downloadDocument(documentId),
  });
}