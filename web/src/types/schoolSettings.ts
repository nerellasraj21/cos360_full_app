export interface SchoolSettings {
  id: string
  school_name: string | null
  contact_no: string | null
  alt_contact_no: string | null
  school_email: string | null
  address: string | null
  city: string | null
  state: string | null
  district: string | null
  pin_code: string | null
  country: string | null
  academic_year: string | null
  installation_date: string | null
  image_url: string | null
  principal_signature_url: string | null
  school_board: string | null
}

export interface SchoolSettingsUpdateRequest {
  school_name?: string | null
  contact_no?: string | null
  alt_contact_no?: string | null
  school_email?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  district?: string | null
  pin_code?: string | null
  country?: string | null
  academic_year?: string | null
  installation_date?: string | null
  school_board?: string | null
}
