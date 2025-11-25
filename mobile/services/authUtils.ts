import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../src/api/client';

// Token storage keys
const ACCESS_TOKEN_KEY = '@auth/access_token';
const REFRESH_TOKEN_KEY = '@auth/refresh_token';
const USER_DATA_KEY = '@auth/user_data';
const ROLE_DATA_KEY = '@auth/role_data';
const PERMISSIONS_DATA_KEY = '@auth/permissions_data';
const TOKEN_EXPIRY_KEY = '@auth/token_expiry';
const CLIENT_SCHEMA_KEY = '@auth/client_schema';
const SELECTED_STUDENT_KEY = '@auth/selected_student';
const AVAILABLE_STUDENTS_KEY = '@auth/available_students';
const STUDENT_ID_KEY = '@auth/student_id';
const MENU_DATA_KEY = '@auth/menu_data';

// Token expiry buffer (5 minutes before actual expiry)
const TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000;

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in?: number;
}

export interface User {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
}

export interface Permission {
  id: string;
  resource: string;
  action: string;
  is_granted: boolean;
}

export interface AuthResponse {
  user: User;
  role: {
    id: number;
    name: string;
    description: string;
  };
  menu: any[];
  permissions?: Permission[];
  access_token: string;
  refresh_token: string;
  token_type: string;
  entity_id?: string;
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

    // Calculate token expiry (assuming 1 hour for demo, in real app parse JWT)
    const expiryTime = Date.now() + (60 * 60 * 1000); // 1 hour from now

    // Convert permissions to proper format if needed
    let permissionsToStore = authResponse.permissions;
    if (authResponse.permissions && typeof authResponse.permissions === 'object' && !Array.isArray(authResponse.permissions)) {
      // Convert object format {"resource": ["action1", "action2"]} to array format
      permissionsToStore = Object.entries(authResponse.permissions).flatMap(([resource, actions]) =>
        Array.isArray(actions) ? actions.map(actionItem => ({
          id: `${resource}:${actionItem}`,
          resource,
          action: actionItem,
          is_granted: true
        })) : []
      );
    }

    await Promise.all([
      AsyncStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token),
      AsyncStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token),
      AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(authResponse.user)),
      AsyncStorage.setItem(ROLE_DATA_KEY, JSON.stringify(authResponse.role)),
      AsyncStorage.setItem(PERMISSIONS_DATA_KEY, JSON.stringify(permissionsToStore || [])),
      AsyncStorage.setItem(MENU_DATA_KEY, JSON.stringify(authResponse.menu || [])),
      AsyncStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString()),
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
      AsyncStorage.getItem(ACCESS_TOKEN_KEY),
      AsyncStorage.getItem(REFRESH_TOKEN_KEY),
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
    const expiryTime = await AsyncStorage.getItem(TOKEN_EXPIRY_KEY);
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
      console.log('No refresh token available for refresh');
      return null;
    }

    console.log('Attempting to refresh access token...');
    
    const refreshResponse = await apiClient.post('/auth/login/refresh', {
      refresh_token: tokens.refresh_token
    });

    // Update stored tokens
    const newTokens: AuthTokens = {
      access_token: refreshResponse.data.access_token,
      refresh_token: refreshResponse.data.refresh_token,
      token_type: refreshResponse.data.token_type,
    };

    // Calculate new expiry time
    const newExpiryTime = Date.now() + (60 * 60 * 1000); // 1 hour from now

    await Promise.all([
      AsyncStorage.setItem(ACCESS_TOKEN_KEY, newTokens.access_token),
      AsyncStorage.setItem(REFRESH_TOKEN_KEY, newTokens.refresh_token),
      AsyncStorage.setItem(TOKEN_EXPIRY_KEY, newExpiryTime.toString()),
    ]);

    console.log('Token refresh successful');
    return newTokens;
  } catch (error) {
    console.error('Token refresh failed:', error);
    // Clear tokens on refresh failure to prevent repeated failed attempts
    await clearAuthData();
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
      console.log('Token expired, attempting refresh...');
      const newTokens = await refreshAccessToken();
      return newTokens?.access_token || null;
    } else if (isExpired && !allowRefresh) {
      console.log('Token expired but refresh not allowed');
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
      AsyncStorage.removeItem(ACCESS_TOKEN_KEY),
      AsyncStorage.removeItem(REFRESH_TOKEN_KEY),
      AsyncStorage.removeItem(USER_DATA_KEY),
      AsyncStorage.removeItem(ROLE_DATA_KEY),
      AsyncStorage.removeItem(PERMISSIONS_DATA_KEY),
      AsyncStorage.removeItem(TOKEN_EXPIRY_KEY),
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
      console.log('Tokens expired during initialization, clearing auth data');
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
 * Login user with credentials
 */
export const loginUser = async (username: string, password: string, clientName?: string): Promise<AuthResponse> => {
  try {
    const response = await apiClient.post('/auth/login', {
      username,
      password,
      client_name: clientName,
    });

    // Store auth data
    await storeAuthData(response.data);

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
  try {
    // Call logout API
    await apiClient.post('/auth/logout');

    // Clear local auth data
    await clearAuthData();
  } catch (error) {
    console.error('Logout error:', error);
    // Still clear local data even if API call fails
    await clearAuthData();
  }
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
    const [authenticated, user, role, permissions, menu] = await Promise.all([
      isAuthenticated(),
      getStoredUser(),
      getStoredRole(),
      getStoredPermissions(),
      getStoredMenu(),
    ]);

    return {
      isAuthenticated: authenticated,
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