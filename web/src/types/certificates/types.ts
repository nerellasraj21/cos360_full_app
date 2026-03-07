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

// CertificateRead — new backend model (Mar 2026)
export interface CertificateRead {
  id: string;
  student_id: string;
  certificate_type_id: string;
  type_name: string;          // Populated from type JOIN
  file_path: string | null;   // S3 key (not local path)
  issue_date: string;
  remarks: string | null;
  created_at: string;
  updated_at: string;
}

// Presigned URL download response — replaces binary blob stream
export interface PresignedUrlResponse {
  presigned_url: string;
  expires_in_seconds: number;
  certificate_id: string;
  filename: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  has_next: boolean;
}

export interface ErrorResponse {
  detail: string;  // Human-readable error message
}
