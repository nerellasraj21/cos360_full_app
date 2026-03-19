import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

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

export const refreshToken = async (): Promise<string | null> => {
  try {
    const refreshTokenValue = await getRefreshToken();
    if (!refreshTokenValue) return null;

    const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://www.cos360.app/api/v1';
    const schema = await AsyncStorage.getItem('@auth/client_schema').catch(() => null);
    const response = await fetch(`${apiUrl}/auth/login/refresh`, {
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