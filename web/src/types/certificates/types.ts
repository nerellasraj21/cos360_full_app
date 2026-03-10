// Certificate Types API Types

export interface CertificateTypeBase {
  name: string;           // Required: Certificate type name
  description?: string;   // Optional: Description of the certificate type
}

export interface CertificateTypeCreate extends CertificateTypeBase {
  // Inherits all fields from CertificateTypeBase
}

export interface CertificateTypeUpdate {
  name?: string;          // Optional: Update certificate type name
  description?: string;   // Optional: Update description
}

export interface CertificateTypeRead extends CertificateTypeBase {
  id: string;             // UUID of the certificate type
}

export interface CertificateTypeDropdown {
  id: string;             // UUID of the certificate type
  name: string;           // Certificate type name
}

// Certificate type search result — from GET /certificates/types/search
export interface CertificateTypeSearchResult {
  id: string;
  name: string;
  description?: string;
}

// CertificateRead — matches backend CertificateRead schema
export interface CertificateRead {
  id: string;
  student_id: string;
  certificate_type_id: string | null;
  type_name: string;                    // Populated from type JOIN
  file_path: string | null;             // S3 key (not local path)
  issue_date: string | null;
  remarks: string | null;
  created_at: string;
  updated_at: string;
}

// Cascade selector types — admin student picker flow
export interface SelectorClass {
  id: string;
  name: string;
}

export interface SelectorSection {
  id: string;
  name: string;
}

export interface SelectorStudent {
  student_id: string;
  full_name: string;
  admission_no: string;
}

// Presigned URL download response — replaces binary blob stream
export interface PresignedUrlResponse {
  presigned_url: string;
  expires_in_seconds: number;
  certificate_id: string;
  filename?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  has_next: boolean;
}

export interface ErrorResponse {
  detail: string;  // Human-readable error message
}
