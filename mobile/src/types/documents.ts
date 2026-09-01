export interface StudentDocumentBase {
  document_type: string;
  file_path: string;
}

export interface StudentDocumentCreate extends StudentDocumentBase {
  student_id: string;
}

export interface StudentDocumentUpdate {
  document_type?: string;
  file_path?: string;
}

export interface StudentDocumentOut extends StudentDocumentBase {
  id: string;
  student_id: string;
  upload_date: string;
}

// Legacy types for backward compatibility
export interface Document extends StudentDocumentOut {
  file_name?: string;
  uploaded_at?: string;
}

export interface DocumentInput {
  student_id: string;
  document_type: string;
  document_file: File;
}

export interface DocumentUpdateInput {
  document_type?: string;
  document_name?: string;
  is_verified?: boolean;
  verified_by?: string;
}

export interface DocumentListParams {
  student_id?: string;
  document_type?: string;
  is_verified?: boolean;
  skip?: number;
  limit?: number;
}

export interface DocumentUploadResponse {
  id: string;
  student_id: string;
  document_type: string;
  document_name: string;
  file_path: string;
  uploaded_at: string;
  is_verified: boolean;
  verified_by: string | null;
  verified_at: string | null;
  file_size: number;
  mime_type: string;
}

export interface DocumentVerificationRequest {
  document_id: string;
  verified_by: string;
  remarks?: string;
}

// Document Type definitions
export interface DocumentType {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  max_file_size?: number;
  allowed_extensions?: string[];
}

export interface DocumentTypeInput {
  name: string;
  description?: string;
  is_active?: boolean;
  max_file_size?: number;
  allowed_extensions?: string[];
}

// Unified "all documents" item returned by GET /students/documents/all
export interface StudentAllDocumentItem {
  id: string;
  student_id: string;
  source: 'document' | 'certificate' | 'receipt';
  document_type?: string;
  file_path?: string;
  upload_date?: string;
  // certificate-specific
  certificate_category?: string;
  type_name?: string;
  // receipt-specific
  receipt_number?: string;
}
