export interface Parent {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  occupation?: string;
  aadhar_number?: string;
  gender?: string;
  relation_to_student: 'Father' | 'Mother' | 'Guardian';
  user_id: string;
  students?: Student[];
  created_at: string;
  updated_at: string;
}

export interface ParentInput {
  name: string;
  email?: string;
  phone?: string;
  occupation?: string;
  aadhar_number?: string;
  gender?: 'Male' | 'Female' | 'Other';
  relation_to_student: 'Father' | 'Mother' | 'Guardian';
  user_id: string;
}

export interface ParentUpdateRequest {
  name?: string;
  email?: string;
  phone?: string;
  occupation?: string;
  aadhar_number?: string;
  gender?: 'Male' | 'Female' | 'Other';
  relation_to_student?: 'Father' | 'Mother' | 'Guardian';
}

export interface StudentParentLink {
  id: string;
  student_id: string;
  parent_id: string;
  student?: Student;
  parent?: Parent;
}

export interface StudentParentLinkInput {
  student_id: string;
  parent_id: string;
}

export interface Student {
  id: string;
  name: string;
  admission_number?: string;
  email?: string;
}

// API Response types
export interface ParentListResponse {
  items: Parent[];
  total: number;
  skip: number;
  limit: number;
}

export interface ParentCreateRequest extends ParentInput {}

export interface ParentUpdateRequest extends Partial<ParentInput> {}