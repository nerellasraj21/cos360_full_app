import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import CAxios from './index';
import type {
  Document,
  DocumentInput,
  DocumentUpdateInput,
  DocumentListParams,
  DocumentUploadResponse,
  DocumentVerificationRequest,
  DocumentType,
  DocumentTypeInput
} from '@/types/documents';

// Legacy types for backward compatibility
export interface DocumentUploadRequest {
  student_id: string;
  document_type: string;
  document_name: string;
  document_file: File;
}

export interface DocumentError {
  detail: string;
  error_code: string;
}

// Document upload mutation hook
export function useDocumentUploadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: DocumentUploadRequest): Promise<DocumentUploadResponse> => {
      const formData = new FormData();
      formData.append('student_id', data.student_id);
      formData.append('document_type', data.document_type);
      formData.append('document_name', data.document_name);
      formData.append('document_file', data.document_file);

      const { data: response } = await CAxios.post<DocumentUploadResponse>('/students/documents/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response;
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['student-documents', data.student_id] });
    },
    onError: (error: any) => {
      console.error('Document upload error:', error);

      // Handle specific file upload errors
      if (error.response?.status === 400) {
        const errorData = error.response.data as DocumentError;
        if (errorData.error_code === 'INVALID_FILE_TYPE') {
          throw new Error('Invalid file type. Allowed: pdf, jpg, png');
        }
      } else if (error.response?.status === 413) {
        const errorData = error.response.data as DocumentError;
        if (errorData.error_code === 'FILE_TOO_LARGE') {
          throw new Error('File too large. Maximum size: 5MB');
        }
      }

      // Re-throw the error for component handling
      throw error;
    },
  });
}

// Document CRUD operations
export async function fetchDocuments(params?: DocumentListParams): Promise<Document[]> {
  const queryParams = new URLSearchParams();
  if (params?.student_id) queryParams.append('student_id', params.student_id);
  if (params?.document_type) queryParams.append('document_type', params.document_type);
  if (params?.is_verified !== undefined) queryParams.append('is_verified', params.is_verified.toString());
  if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
  if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());

  const { data } = await CAxios.get<Document[]>(`/students/documents/?${queryParams.toString()}`);
  return data;
}

export async function fetchDocumentById(id: string): Promise<Document> {
  const { data } = await CAxios.get<Document>(`/students/documents/${id}`);
  return data;
}

export async function updateDocument(id: string, documentData: DocumentUpdateInput): Promise<Document> {
  const { data } = await CAxios.put<Document>(`/students/documents/${id}`, documentData);
  return data;
}

export async function deleteDocument(id: string): Promise<void> {
  await CAxios.delete(`/students/documents/${id}`);
}

// Document verification
export async function verifyDocument(verificationData: DocumentVerificationRequest): Promise<Document> {
  const { data } = await CAxios.post<Document>(`/students/documents/${verificationData.document_id}/verify`, {
    verified_by: verificationData.verified_by,
    remarks: verificationData.remarks
  });
  return data;
}

// Document download
export async function downloadDocument(id: string): Promise<Blob> {
  const response = await CAxios.get(`/students/documents/${id}/download`, {
    responseType: 'blob'
  });
  return response.data;
}

// Document types management
export async function fetchDocumentTypes(params?: {
  skip?: number;
  limit?: number;
  is_active?: boolean;
}): Promise<DocumentType[]> {
  const queryParams = new URLSearchParams();
  if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
  if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
  if (params?.is_active !== undefined) queryParams.append('is_active', params.is_active.toString());

  const { data } = await CAxios.get<DocumentType[]>(`/students/document-types/?${queryParams.toString()}`);
  return data;
}

export async function createDocumentType(documentTypeData: DocumentTypeInput): Promise<DocumentType> {
  const { data } = await CAxios.post<DocumentType>('/students/document-types/', documentTypeData);
  return data;
}

export async function updateDocumentType(id: string, documentTypeData: Partial<DocumentTypeInput>): Promise<DocumentType> {
  const { data } = await CAxios.put<DocumentType>(`/students/document-types/${id}`, documentTypeData);
  return data;
}

export async function deleteDocumentType(id: string): Promise<void> {
  await CAxios.delete(`/students/document-types/${id}`);
}

// Utility function to validate file before upload
export const validateDocumentFile = (file: File): { isValid: boolean; error?: string } => {
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'Invalid file type. Allowed: PDF, JPG, PNG'
    };
  }

  if (file.size > maxSize) {
    return {
      isValid: false,
      error: 'File too large. Maximum size: 5MB'
    };
  }

  return { isValid: true };
};

// React Query hooks for Documents
export function useDocuments(params?: DocumentListParams) {
  return useQuery({
    queryKey: ['documents', params],
    queryFn: () => fetchDocuments(params),
  });
}

export function useDocument(id: string) {
  return useQuery({
    queryKey: ['document', id],
    queryFn: () => fetchDocumentById(id),
    enabled: !!id,
  });
}

export function useUpdateDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: DocumentUpdateInput }) => updateDocument(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

export function useVerifyDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: verifyDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

export function useDownloadDocument() {
  return useMutation({
    mutationFn: downloadDocument,
  });
}

// React Query hooks for Document Types
export function useDocumentTypes(params?: { skip?: number; limit?: number; is_active?: boolean }) {
  return useQuery({
    queryKey: ['document-types', params],
    queryFn: () => fetchDocumentTypes(params),
  });
}

export function useCreateDocumentType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createDocumentType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-types'] });
    },
  });
}

export function useUpdateDocumentType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<DocumentTypeInput> }) => updateDocumentType(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-types'] });
    },
  });
}

export function useDeleteDocumentType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteDocumentType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-types'] });
    },
  });
}