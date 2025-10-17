import type { Document, DocumentInput } from '@/types/documents';
import type { ApiError } from '@/types/common';
import CAxios from '../index';

// Helper function to handle API errors
const handleApiError = (error: any): Error => {
  if (error.response?.data) {
    const apiError: ApiError = error.response.data;
    return new Error(apiError.detail || 'An error occurred');
  }
  return new Error(error.message || 'Network error');
};

// Upload student document
export const uploadStudentDocument = async (
  documentData: DocumentInput
): Promise<Document> => {
  try {
    const formData = new FormData();
    formData.append('student_id', documentData.student_id);
    formData.append('document_type', documentData.document_type);
    formData.append('document_file', documentData.document_file);

    const { data } = await CAxios.post('/students/documents/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Get student documents
export const getStudentDocuments = async (
  studentId: string
): Promise<Document[]> => {
  try {
    const { data } = await CAxios.get(`/students/documents/?student_id=${studentId}`);
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Get document by ID
export const getStudentDocument = async (
  documentId: string
): Promise<Document> => {
  try {
    const { data } = await CAxios.get(`/students/documents/${documentId}`);
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Update student document
export const updateStudentDocument = async (
  documentId: string,
  updateData: { document_type: string; document_file: File }
): Promise<Document> => {
  try {
    const formData = new FormData();
    formData.append('document_type', updateData.document_type);
    formData.append('document_file', updateData.document_file);

    const { data } = await CAxios.patch(`/students/documents/${documentId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Delete student document
export const deleteStudentDocument = async (
  documentId: string
): Promise<void> => {
  try {
    await CAxios.delete(`/students/documents/${documentId}`);
  } catch (error) {
    throw handleApiError(error);
  }
};

// Download student document
export const downloadStudentDocument = async (
  documentId: string
): Promise<Blob> => {
  try {
    const response = await CAxios.get(`/students/documents/${documentId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};