export interface OrganizationBase {
    name: string;
    description: string;
    is_active: boolean;
    subdomain: string;
    schema_name: string;
}

export interface OrganizationCreate extends OrganizationBase {
    plan_id: number;
}

export interface OrganizationUpdate extends Partial<OrganizationBase> {
    id: number;
    plan_id?: number;
}

export interface OrganizationRead extends OrganizationBase {
    id: number;
    plan_id: number;
}

export interface Plan {
    id: number;
    name: string;
    description: string;
    price: number;
    features: string[];
}

// Multi-step form data structure
export interface SuperOrgFormData {
    // Step 1: Basic Information
    name: string;
    description: string;
    subdomain: string;

    // Step 2: Technical Configuration
    schema_name: string;
    is_active: boolean;

    // Step 3: Plan Selection
    plan_id: number;

    // Step 4: Review & Confirmation
    terms_accepted: boolean;
}