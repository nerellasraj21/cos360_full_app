// Super Admin Module Types

export interface TenantCreate {
    name: string;
    domain: string;
    admin_email: string;
    plan_id: string;
    settings?: Record<string, any>;
}

export interface TenantUpdate {
    name?: string;
    domain?: string;
    status?: 'active' | 'suspended' | 'terminated';
    plan_id?: string;
    settings?: Record<string, any>;
}

export interface TenantRead {
    id: string;
    name: string;
    domain: string;
    status: 'active' | 'suspended' | 'terminated';
    plan_id: string;
    admin_email: string;
    settings?: Record<string, any>;
    created_at: string;
    updated_at: string;
}

export interface SystemHealth {
    status: 'healthy' | 'unhealthy' | 'warning';
    database: 'connected' | 'disconnected' | 'error';
    redis: 'connected' | 'disconnected' | 'error';
    disk_usage?: {
        used: number;
        total: number;
        percentage: number;
    };
    memory_usage?: {
        used: number;
        total: number;
        percentage: number;
    };
    timestamp: string;
}

export interface SystemLog {
    timestamp: string;
    level: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
    message: string;
    module: string;
    user_id?: string;
    tenant_id?: string;
}

export interface PlanCreate {
    name: string;
    description?: string;
    features: string[];
    price: number;
    limits?: Record<string, any>;
}

export interface PlanUpdate {
    name?: string;
    description?: string;
    features?: string[];
    price?: number;
    limits?: Record<string, any>;
    is_active?: boolean;
}

export interface PlanRead {
    id: string;
    name: string;
    description?: string;
    features: string[];
    price: number;
    limits?: Record<string, any>;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

// API Response types
export interface TenantsListResponse {
    items: TenantRead[];
    total: number;
    skip: number;
    limit: number;
}

export interface SystemLogsResponse {
    items: SystemLog[];
    total: number;
    skip: number;
    limit: number;
}

export interface PlansListResponse {
    items: PlanRead[];
    total: number;
}

// Error types
export interface SuperAdminError {
    detail: string;
    error_code?: string;
    field_errors?: Record<string, string[]>;
}