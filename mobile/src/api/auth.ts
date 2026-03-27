import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from './client';

// M-1: must match authUtils.ts canonical keys — old keys ('auth_token', 'refresh_token') caused reads to return null
const TOKEN_KEY = '@auth/access_token';
const REFRESH_TOKEN_KEY = '@auth/refresh_token';

export const getAuthToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

export const setAuthToken = async (token: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } catch (error) {
    console.error('Error setting auth token:', error);
  }
};

export const getRefreshToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('Error getting refresh token:', error);
    return null;
  }
};

export const setRefreshToken = async (token: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, token);
  } catch (error) {
    console.error('Error setting refresh token:', error);
  }
};

export const clearTokens = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY]);
  } catch (error) {
    console.error('Error clearing tokens:', error);
  }
};

// ─── Auth API types ───────────────────────────────────────────────────────────

export interface AuthMenu {
  id: string;
  name: string;
  path?: string;
  icon?: string;
  parent_id?: string | null;
  order?: number;
  is_active?: boolean;
  children?: AuthMenu[];
}

export interface AuthMenuCreate {
  name: string;
  path?: string;
  icon?: string;
  parent_id?: string | null;
  order?: number;
  is_active?: boolean;
}

export interface AuthMenuUpdate {
  name?: string;
  path?: string;
  icon?: string;
  parent_id?: string | null;
  order?: number;
  is_active?: boolean;
}

export interface AuthBasePermission {
  id: string;
  name: string;
  codename: string;
  content_type?: string;
}

export interface AuthBasePermissionCreate {
  name: string;
  codename: string;
  content_type?: string;
}

// ─── Auth API ─────────────────────────────────────────────────────────────────

export const authApi = {
  /** POST /auth/staff/set-password — used for first-login password change */
  setStaffPassword: async (data: {
    change_password_token: string;
    new_password: string;
    confirm_password: string;
  }): Promise<void> => {
    await apiClient.post('/auth/staff/set-password', data);
  },

  /** GET /auth/user-menu */
  getUserMenu: async (): Promise<AuthMenu[]> => {
    const response = await apiClient.get('/auth/user-menu');
    return response.data.items || response.data || [];
  },

  /** GET /auth/menus/ */
  getMenus: async (): Promise<AuthMenu[]> => {
    const response = await apiClient.get('/auth/menus/');
    return response.data.items || response.data || [];
  },

  /** POST /auth/menus/ */
  createMenu: async (data: AuthMenuCreate): Promise<AuthMenu> => {
    const response = await apiClient.post('/auth/menus/', data);
    return response.data;
  },

  /** PUT /auth/menus/{id} */
  updateMenu: async (id: string, data: AuthMenuUpdate): Promise<AuthMenu> => {
    const response = await apiClient.put(`/auth/menus/${id}`, data);
    return response.data;
  },

  /** DELETE /auth/menus/{id} */
  deleteMenu: async (id: string): Promise<void> => {
    await apiClient.delete(`/auth/menus/${id}`);
  },

  /** GET /auth/permissions/ */
  getBasePermissions: async (): Promise<AuthBasePermission[]> => {
    const response = await apiClient.get('/auth/permissions/');
    return response.data.items || response.data || [];
  },

  /** POST /auth/permissions/ */
  createBasePermission: async (data: AuthBasePermissionCreate): Promise<AuthBasePermission> => {
    const response = await apiClient.post('/auth/permissions/', data);
    return response.data;
  },
};

// ─────────────────────────────────────────────────────────────────────────────

export const refreshToken = async (): Promise<string | null> => {
  try {
    const refreshTokenValue = await getRefreshToken();
    if (!refreshTokenValue) return null;

    const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://www.cos360.app/api/v1';
    const schema = await AsyncStorage.getItem('@auth/client_schema').catch(() => null);
    const response = await fetch(`${apiUrl}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(schema ? { 'cschema': schema } : {}),
      },
      body: JSON.stringify({ refresh_token: refreshTokenValue }),
    });

    if (response.ok) {
      const data = await response.json();
      await setAuthToken(data.access_token);
      await setRefreshToken(data.refresh_token);
      return data.access_token;
    } else {
      await clearTokens();
      return null;
    }
  } catch (error) {
    console.error('Error refreshing token:', error);
    await clearTokens();
    return null;
  }
};