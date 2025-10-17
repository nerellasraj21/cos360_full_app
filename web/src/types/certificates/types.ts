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

export interface PaginatedResponse<T> {
  items: T[];
  total_count: number;
  has_next: boolean;
}

export interface ErrorResponse {
  detail: string;  // Human-readable error message
}