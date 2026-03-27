import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import apiClient from '../src/api/client';

// ── Secure keys (stored in OS Keychain / Keystore, plaintext-protected) ──────
// SecureStore key names must match [A-Za-z0-9._-] — no @ or /
const ACCESS_TOKEN_KEY = 'auth_access_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';
const TOKEN_EXPIRY_KEY = 'auth_token_expiry';
const CHANGE_PASSWORD_TOKEN_KEY = 'auth_change_password_token';

// ── Non-sensitive keys (stored in AsyncStorage — role, menu, profile data) ───
const USER_DATA_KEY = '@auth/user_data';
const ROLE_DATA_KEY = '@auth/role_data';
const PERMISSIONS_DATA_KEY = '@auth/permissions_data';
const CLIENT_SCHEMA_KEY = '@auth/client_schema';
const SELECTED_STUDENT_KEY = '@auth/selected_student';
const AVAILABLE_STUDENTS_KEY = '@auth/available_students';
const STUDENT_ID_KEY = '@auth/student_id';
const MENU_DATA_KEY = '@auth/menu_data';

// ── Secure storage helpers ────────────────────────────────────────────────────
// expo-secure-store is native-only (iOS/Android). On web, fall back to
// AsyncStorage with a namespaced key — tokens are less secure on web but
// the app must remain functional during development / web testing.
const SECURE_WEB_PREFIX = '@secure/';

const secureSet = async (key: string, value: string): Promise<void> => {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(SECURE_WEB_PREFIX + key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
};

const secureGet = async (key: string): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return AsyncStorage.getItem(SECURE_WEB_PREFIX + key);
  }
  return SecureStore.getItemAsync(key);
};

const secureDelete = async (key: string): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(SECURE_WEB_PREFIX + key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  } catch {
    // Key may not exist (e.g. first run, or partial migration) — treat as success
  }
};

// Token expiry buffer (5 minutes before actual expiry)
const TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000;

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in?: number;
}

export interface User {
  id: string;
  username: string;
  email: string;
  is_active: boolean;
  first_name?: string;
  last_name?: string;
  role?: string;
  // M-3: parent_profile returned by login for parent users; needed to populate availableStudents
  parent_profile?: {
    id: string;
    children?: Array<{ student_id: string; student_name?: string }>;
  };
}

export interface Permission {
  id: string;
  resource: string;
  action: string;
  is_granted: boolean;
}

/**
 * Normalise raw permissions from the API into a flat Permission array.
 * Handles both the array format (already correct) and the object format
 * `{"resource": ["action1", "action2"]}` returned by the login endpoint.
 */
export const normalisePermissions = (
  raw: Permission[] | Record<string, string[]> | undefined | null
): Permission[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  return Object.entries(raw as Record<string, string[]>).flatMap(([resource, actions]) =>
    Array.isArray(actions)
      ? actions.map(action => ({ id: `${resource}:${action}`, resource, action, is_granted: true }))
      : []
  );
};

export interface AuthResponse {
  user: User;
  role: {
    id: string;
    name: string;
    description: string;
  };
  menu: any[];
  permissions?: Permission[];
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in?: number;
  entity_id?: string;
  requires_password_change?: boolean;
  /** Short-lived JWT (15 min) returned when requires_password_change=true */
  change_password_token?: string;
  academic_year_id?: string;
  academic_year_title?: string;
}

/**
 * Store authentication tokens and user data
 */
export const storeAuthData = async (authResponse: AuthResponse): Promise<void> => {
  try {
    const tokens: AuthTokens = {
      access_token: authResponse.access_token,
      refresh_token: authResponse.refresh_token,
      token_type: authResponse.token_type,
    };

    // Use expires_in from backend response; fall back to 1 hour if absent
    const expiryTime = Date.now() + ((authResponse.expires_in ?? 3600) * 1000);

    const permissionsToStore = normalisePermissions(authResponse.permissions as any);

    await Promise.all([
      secureSet(ACCESS_TOKEN_KEY, tokens.access_token),
      secureSet(REFRESH_TOKEN_KEY, tokens.refresh_token),
      secureSet(TOKEN_EXPIRY_KEY, expiryTime.toString()),
      AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(authResponse.user)),
      AsyncStorage.setItem(ROLE_DATA_KEY, JSON.stringify(authResponse.role)),
      AsyncStorage.setItem(PERMISSIONS_DATA_KEY, JSON.stringify(permissionsToStore || [])),
      AsyncStorage.setItem(MENU_DATA_KEY, JSON.stringify(authResponse.menu || [])),
    ]);
  } catch (error) {
    console.error('Error storing auth data:', error);
    throw new Error('Failed to store authentication data');
  }
};

/**
 * Retrieve stored authentication tokens
 */
export const getStoredTokens = async (): Promise<AuthTokens | null> => {
  try {
    const [accessToken, refreshToken] = await Promise.all([
      secureGet(ACCESS_TOKEN_KEY),
      secureGet(REFRESH_TOKEN_KEY),
    ]);

    if (!accessToken || !refreshToken) {
      return null;
    }

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'bearer',
    };
  } catch (error) {
    console.error('Error retrieving tokens:', error);
    return null;
  }
};

/**
 * Retrieve stored user data
 */
export const getStoredUser = async (): Promise<User | null> => {
  try {
    const userData = await AsyncStorage.getItem(USER_DATA_KEY);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Error retrieving user data:', error);
    return null;
  }
};

/**
 * Retrieve stored role data
 */
export const getStoredRole = async (): Promise<any | null> => {
  try {
    const roleData = await AsyncStorage.getItem(ROLE_DATA_KEY);
    return roleData ? JSON.parse(roleData) : null;
  } catch (error) {
    console.error('Error retrieving role data:', error);
    return null;
  }
};

/**
 * Retrieve stored permissions data
 */
export const getStoredPermissions = async (): Promise<Permission[] | null> => {
  try {
    const permissionsData = await AsyncStorage.getItem(PERMISSIONS_DATA_KEY);
    return permissionsData ? JSON.parse(permissionsData) : null;
  } catch (error) {
    console.error('Error retrieving permissions data:', error);
    return null;
  }
};

/**
 * Retrieve stored menu data
 */
export const getStoredMenu = async (): Promise<any[] | null> => {
  try {
    const menuData = await AsyncStorage.getItem(MENU_DATA_KEY);
    return menuData ? JSON.parse(menuData) : null;
  } catch (error) {
    console.error('Error retrieving menu data:', error);
    return null;
  }
};

/**
 * Store client schema
 */
export const setClientSchema = async (clientSchema: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(CLIENT_SCHEMA_KEY, clientSchema);
  } catch (error) {
    console.error('Error storing client schema:', error);
    throw new Error('Failed to store client schema');
  }
};

/**
 * Retrieve stored client schema
 */
export const getClientSchema = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(CLIENT_SCHEMA_KEY);
  } catch (error) {
    console.error('Error retrieving client schema:', error);
    return null;
  }
};

/**
 * Check if access token is expired or about to expire
 */
export const isTokenExpired = async (): Promise<boolean> => {
  try {
    const expiryTime = await secureGet(TOKEN_EXPIRY_KEY);
    if (!expiryTime) return true;

    const expiry = parseInt(expiryTime, 10);
    return Date.now() + TOKEN_EXPIRY_BUFFER >= expiry;
  } catch (error) {
    console.error('Error checking token expiry:', error);
    return true;
  }
};

/**
 * Refresh access token using refresh token
 */
export const refreshAccessToken = async (): Promise<AuthTokens | null> => {
  try {
    const tokens = await getStoredTokens();
    if (!tokens) {
      if (__DEV__) console.log('No refresh token available for refresh');
      return null;
    }

    if (__DEV__) console.log('Attempting to refresh access token...');

    const refreshResponse = await apiClient.post('/auth/refresh', {
      refresh_token: tokens.refresh_token
    });

    // Update stored tokens
    const newTokens: AuthTokens = {
      access_token: refreshResponse.data.access_token,
      refresh_token: refreshResponse.data.refresh_token,
      token_type: refreshResponse.data.token_type,
    };

    // Use expires_in from refresh response; fall back to 1 hour if absent
    const newExpiryTime = Date.now() + ((refreshResponse.data.expires_in ?? 3600) * 1000);

    await Promise.all([
      secureSet(ACCESS_TOKEN_KEY, newTokens.access_token),
      secureSet(REFRESH_TOKEN_KEY, newTokens.refresh_token),
      secureSet(TOKEN_EXPIRY_KEY, newExpiryTime.toString()),
    ]);

    if (__DEV__) console.log('Token refresh successful');
    return newTokens;
  } catch (error) {
    console.error('Token refresh failed:', error);
    // Clear tokens on refresh failure to prevent repeated attempts.
    // Wrapped in its own try/catch — clearAuthData() throws on AsyncStorage failure and
    // we must always return null here, never re-throw.
    try {
      await clearAuthData();
    } catch (clearError) {
      console.error('Failed to clear auth data after token refresh failure:', clearError);
    }
    return null;
  }
};

/**
 * Get valid access token (refresh if needed)
 */
export const getValidAccessToken = async (allowRefresh: boolean = true): Promise<string | null> => {
  try {
    const isExpired = await isTokenExpired();

    if (isExpired && allowRefresh) {
      if (__DEV__) console.log('Token expired, attempting refresh...');
      const newTokens = await refreshAccessToken();
      return newTokens?.access_token || null;
    } else if (isExpired && !allowRefresh) {
      if (__DEV__) console.log('Token expired but refresh not allowed');
      return null;
    }

    const tokens = await getStoredTokens();
    return tokens?.access_token || null;
  } catch (error) {
    console.error('Error getting valid access token:', error);
    return null;
  }
};

/**
 * Clear all authentication data
 */
export const clearAuthData = async (): Promise<void> => {
  try {
    await Promise.all([
      secureDelete(ACCESS_TOKEN_KEY),
      secureDelete(REFRESH_TOKEN_KEY),
      secureDelete(TOKEN_EXPIRY_KEY),
      secureDelete(CHANGE_PASSWORD_TOKEN_KEY),
      AsyncStorage.removeItem(USER_DATA_KEY),
      AsyncStorage.removeItem(ROLE_DATA_KEY),
      AsyncStorage.removeItem(PERMISSIONS_DATA_KEY),
      AsyncStorage.removeItem(SELECTED_STUDENT_KEY),
      AsyncStorage.removeItem(AVAILABLE_STUDENTS_KEY),
      AsyncStorage.removeItem(STUDENT_ID_KEY),
      AsyncStorage.removeItem(MENU_DATA_KEY),
    ]);
  } catch (error) {
    console.error('Error clearing auth data:', error);
    throw new Error('Failed to clear authentication data');
  }
};

/**
 * Store student selection data
 */
export const storeStudentData = async (
  selectedStudent: any,
  availableStudents: any[],
  studentId: string | null
): Promise<void> => {
  try {
    await Promise.all([
      AsyncStorage.setItem(SELECTED_STUDENT_KEY, JSON.stringify(selectedStudent)),
      AsyncStorage.setItem(AVAILABLE_STUDENTS_KEY, JSON.stringify(availableStudents)),
      AsyncStorage.setItem(STUDENT_ID_KEY, studentId || ''),
    ]);
  } catch (error) {
    console.error('Error storing student data:', error);
    throw new Error('Failed to store student data');
  }
};

/**
 * Retrieve stored selected student
 */
export const getStoredSelectedStudent = async (): Promise<any | null> => {
  try {
    const data = await AsyncStorage.getItem(SELECTED_STUDENT_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error retrieving selected student:', error);
    return null;
  }
};

/**
 * Retrieve stored available students
 */
export const getStoredAvailableStudents = async (): Promise<any[]> => {
  try {
    const data = await AsyncStorage.getItem(AVAILABLE_STUDENTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error retrieving available students:', error);
    return [];
  }
};

/**
 * Retrieve stored student ID
 */
export const getStoredStudentId = async (): Promise<string | null> => {
  try {
    const data = await AsyncStorage.getItem(STUDENT_ID_KEY);
    return data || null;
  } catch (error) {
    console.error('Error retrieving student ID:', error);
    return null;
  }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const [tokens, user] = await Promise.all([
      getStoredTokens(),
      getStoredUser(),
    ]);

    if (!tokens || !user) {
      return false;
    }

    // Check if tokens are expired
    const expired = await isTokenExpired();
    if (expired) {
      // Don't try to refresh during initialization - just clear and return false
      // This prevents refresh token errors on app startup
      if (__DEV__) console.log('Tokens expired during initialization, clearing auth data');
      await clearAuthData();
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error checking authentication status:', error);
    return false;
  }
};

/**
 * Store the short-lived change_password_token for first-login flow
 */
export const storeChangePasswordToken = async (token: string): Promise<void> => {
  try {
    await secureSet(CHANGE_PASSWORD_TOKEN_KEY, token);
  } catch (error) {
    console.error('Error storing change_password_token:', error);
    throw new Error('Failed to store change password token');
  }
};

/**
 * Retrieve the stored change_password_token
 */
export const getChangePasswordToken = async (): Promise<string | null> => {
  try {
    return await secureGet(CHANGE_PASSWORD_TOKEN_KEY);
  } catch (error) {
    console.error('Error retrieving change_password_token:', error);
    return null;
  }
};

/**
 * Remove the change_password_token after it has been used
 */
export const clearChangePasswordToken = async (): Promise<void> => {
  try {
    await secureDelete(CHANGE_PASSWORD_TOKEN_KEY);
  } catch (error) {
    console.error('Error clearing change_password_token:', error);
  }
};

/**
 * Login user with credentials
 */
export const loginUser = async (username: string, password: string, clientName?: string, academicYearId?: string): Promise<AuthResponse> => {
  try {
    const payload: Record<string, string> = { username, password };
    if (clientName) payload.client_name = clientName;
    if (academicYearId) payload.academic_year_id = academicYearId;
    const response = await apiClient.post('/auth/login', payload);

    if (response.data?.requires_password_change) {
      // First-login challenge — store the short-lived token so set-password screen can use it
      if (response.data.change_password_token) {
        await storeChangePasswordToken(response.data.change_password_token);
      }
    } else {
      await storeAuthData(response.data);
    }

    return response.data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

/**
 * Logout user
 */
export const logoutUser = async (): Promise<void> => {
  // Clear local auth data immediately — don't wait for the API
  await clearAuthData();
  // Notify server in background (fire-and-forget)
  apiClient.post('/auth/logout').catch(() => {});
};

/**
 * Initialize auth state on app start
 */
export const initializeAuth = async (): Promise<{
  isAuthenticated: boolean;
  user: User | null;
  role: any | null;
  permissions: Permission[];
  menu: any[];
}> => {
  try {
    // Check authentication FIRST (may clear expired tokens) before reading user data,
    // to avoid a race where getStoredUser() returns stale data while tokens are being cleared.
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return { isAuthenticated: false, user: null, role: null, permissions: [], menu: [] };
    }

    const [user, role, permissions, menu] = await Promise.all([
      getStoredUser(),
      getStoredRole(),
      getStoredPermissions(),
      getStoredMenu(),
    ]);

    return {
      isAuthenticated: true,
      user,
      role,
      permissions: Array.isArray(permissions) ? permissions : [],
      menu: Array.isArray(menu) ? menu : [],
    };
  } catch (error) {
    console.error('Error initializing auth:', error);
    return {
      isAuthenticated: false,
      user: null,
      role: null,
      permissions: [],
      menu: [],
    };
  }
};