export interface ClassAndSection {
    id: number;
    class_name: string;
    section_name: string;
    class_code: string;
    is_active: boolean;
    academic_year_id: number;
    created_at: string;
    updated_at: string;
}

export interface SectionInput {
    section_name: string;
}

export interface ClassAndSectionInput {
    class_name: string;
    class_code: string;
    is_active: boolean;
    academic_year_id: number;
    sections: SectionInput[];
} 