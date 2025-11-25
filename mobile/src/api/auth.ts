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

    // Assuming refresh endpoint exists
    const response = await fetch('http://localhost:8003/api/v1/auth/login/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'cschema': 'test_tenant', 
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