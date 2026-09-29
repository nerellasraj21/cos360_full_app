import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Document, DocumentInput, StudentAllDocumentItem } from '@/types/documents';
import {
  uploadStudentDocument,
  getStudentDocuments,
  getStudentDocument,
  updateStudentDocument,
  deleteStudentDocument,
  downloadStudentDocument,
  getAllStudentDocuments,
} from '@/api/students/documents';
import { useAuthStore } from '@/lib/authStore';

// Upload document hook
export function useUploadStudentDocument() {
  const queryClient = useQueryClient();
  return useMutation<Document, Error, DocumentInput>({
    mutationFn: uploadStudentDocument,
    onSuccess: () => {
      toast.success('Document uploaded successfully!');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (error) => {
      toast.error(`Failed to upload document: ${error.message}`);
    },
  });
}

// Upload document hook that automatically uses studentId from auth store
export function useUploadMyDocument() {
  const { studentId } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation<Document, Error, Omit<DocumentInput, 'student_id'>>({
    mutationFn: (documentData) => {
      if (!studentId) {
        throw new Error('Student ID not available');
      }
      return uploadStudentDocument({
        ...documentData,
        student_id: studentId,
      });
    },
    onSuccess: () => {
      toast.success('Document uploaded successfully!');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (error) => {
      toast.error(`Failed to upload document: ${error.message}`);
    },
  });
}

// Get student documents hook
export function useStudentDocuments(studentId: string) {
  return useQuery<Document[]>({
    queryKey: ['documents', 'student', studentId],
    queryFn: () => getStudentDocuments(studentId),
    enabled: !!studentId,
  });
}

// Get document by ID hook
export function useStudentDocument(documentId: string) {
  return useQuery<Document>({
    queryKey: ['document', documentId],
    queryFn: () => getStudentDocument(documentId),
    enabled: !!documentId,
  });
}

// Update document hook
export function useUpdateStudentDocument() {
  const queryClient = useQueryClient();
  return useMutation<Document, Error, { id: string; data: { document_type: string; document_file: File } }>({
    mutationFn: ({ id, data }) => updateStudentDocument(id, data),
    onSuccess: () => {
      toast.success('Document updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (error) => {
      toast.error(`Failed to update document: ${error.message}`);
    },
  });
}

// Delete document hook
export function useDeleteStudentDocument() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: deleteStudentDocument,
    onSuccess: () => {
      toast.success('Document deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (error) => {
      toast.error(`Failed to delete document: ${error.message}`);
    },
  });
}

// Download document hook
export function useDownloadStudentDocument() {
  return useMutation<Blob, Error, string>({
    mutationFn: downloadStudentDocument,
    onSuccess: (blob, documentId) => {
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `document_${documentId}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Document downloaded successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to download document: ${error.message}`);
    },
  });
}

// Get document types hook (if needed for dropdown)
export function useDocumentTypes() {
  return useQuery<string[]>({
    queryKey: ['document-types'],
    queryFn: async () => {
      // This could be a static list or fetched from API
      return [
        'birth_certificate',
        'marksheet',
        'aadhar_card',
        'passport',
        'medical_certificate',
        'other'
      ];
    },
  });
}

// Hook that automatically uses studentId from auth store
export function useMyDocuments() {
  const { studentId } = useAuthStore();
  return useStudentDocuments(studentId || "");
}

// Get unified all-documents list (documents + certificates + receipts)
export function useAllStudentDocuments(studentId: string) {
  return useQuery<StudentAllDocumentItem[]>({
    queryKey: ['documents', 'all', studentId],
    queryFn: () => getAllStudentDocuments(studentId),
    enabled: !!studentId,
  });
}