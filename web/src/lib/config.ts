/**
 * COS360 Frontend Configuration
 * Centralized configuration management for API, authentication, and application settings
 */

interface AppConfig {
  api: {
    baseURL: string;
    timeout: number;
  };
  auth: {
    jwtRefreshThreshold: number;
    sessionTimeout: number;
  };
  tenant: {
    defaultTenant: string;
    headerName: string;
  };
  files: {
    maxSize: number;
    supportedTypes: string[];
  };
  cache: {
    ttl: number;
    maxSize: number;
  };
  rateLimit: {
    requests: number;
    window: number;
  };
  dev: {
    mode: boolean;
    logLevel: string;
  };
}

// Environment variable getters with defaults
const getEnvVar = (key: string, defaultValue: string = ''): string => {
  return import.meta.env[key] || defaultValue;
};

const getEnvNumber = (key: string, defaultValue: number): number => {
  const value = import.meta.env[key];
  return value ? parseInt(value, 10) : defaultValue;
};

const getEnvBoolean = (key: string, defaultValue: boolean): boolean => {
  const value = import.meta.env[key];
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
};

const getEnvArray = (key: string, defaultValue: string[]): string[] => {
  const value = import.meta.env[key];
  return value ? value.split(',') : defaultValue;
};

// Configuration object
export const config: AppConfig = {
  api: {
    baseURL: getEnvVar('VITE_API_BASE_URL', 'http://localhost:8000/api/v1'),
    timeout: getEnvNumber('VITE_API_TIMEOUT', 30000),
  },
  auth: {
    jwtRefreshThreshold: getEnvNumber('VITE_JWT_REFRESH_THRESHOLD', 300000), // 5 minutes
    sessionTimeout: getEnvNumber('VITE_SESSION_TIMEOUT', 3600000), // 1 hour
  },
  tenant: {
    defaultTenant: getEnvVar('VITE_DEFAULT_TENANT', 'test_tenant'),
    headerName: getEnvVar('VITE_TENANT_HEADER', 'cschema'),
  },
  files: {
    maxSize: getEnvNumber('VITE_MAX_FILE_SIZE', 5242880), // 5MB
    supportedTypes: getEnvArray('VITE_SUPPORTED_FILE_TYPES', ['pdf', 'jpg', 'jpeg', 'png']),
  },
  cache: {
    ttl: getEnvNumber('VITE_CACHE_TTL', 300000), // 5 minutes
    maxSize: getEnvNumber('VITE_CACHE_MAX_SIZE', 50),
  },
  rateLimit: {
    requests: getEnvNumber('VITE_API_RATE_LIMIT', 100),
    window: getEnvNumber('VITE_API_RATE_WINDOW', 60000), // 1 minute
  },
  dev: {
    mode: getEnvBoolean('VITE_DEV_MODE', true),
    logLevel: getEnvVar('VITE_LOG_LEVEL', 'debug'),
  },
};

// Utility functions
export const isDevelopment = (): boolean => config.dev.mode;
export const isProduction = (): boolean => !config.dev.mode;

export const getApiUrl = (endpoint: string): string => {
  return `${config.api.baseURL}${endpoint}`;
};

export const getTenantFromHostname = (hostname: string): string => {
  // Extract subdomain from hostname (e.g., school1.abc.com -> school1)
  const cleanHost = hostname.replace(/^www\./, '');
  const match = cleanHost.match(/^([^.]+)\./);
  return match ? match[1] : config.tenant.defaultTenant;
};

export const validateFileType = (file: File): boolean => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  return extension ? config.files.supportedTypes.includes(extension) : false;
};

export const validateFileSize = (file: File): boolean => {
  return file.size <= config.files.maxSize;
};

// Logging utility
export const logger = {
  debug: (message: string, ...args: any[]) => {
    if (config.dev.logLevel === 'debug') {
      console.debug(`[COS360] ${message}`, ...args);
    }
  },
  info: (message: string, ...args: any[]) => {
    console.info(`[COS360] ${message}`, ...args);
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(`[COS360] ${message}`, ...args);
  },
  error: (message: string, ...args: any[]) => {
    console.error(`[COS360] ${message}`, ...args);
  },
};

export default config;