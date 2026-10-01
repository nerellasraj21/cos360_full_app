import AsyncStorage from '@react-native-async-storage/async-storage';
import { storeAuthData, type AuthResponse } from '../authUtils';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  getItemAsync: jest.fn().mockResolvedValue(null),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../src/api/client', () => ({ __esModule: true, default: {} }));

const baseResponse: AuthResponse = {
  user: { id: '1', username: 'u', email: 'u@x.com', is_active: true },
  role: { id: '1', name: 'admin', description: '' },
  menu: [],
  access_token: 'a',
  refresh_token: 'r',
  token_type: 'bearer',
};

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('storeAuthData organisation handling', () => {
  it('stores client_name from the login response', async () => {
    await storeAuthData({ ...baseResponse, client_name: 'acme' });
    expect(await AsyncStorage.getItem('@auth/client_schema')).toBe('acme');
  });

  it('keeps the stored organisation when the response has no client_name', async () => {
    await AsyncStorage.setItem('@auth/client_schema', 'acme');
    await storeAuthData({ ...baseResponse, client_name: null });
    expect(await AsyncStorage.getItem('@auth/client_schema')).toBe('acme');
  });

  it('does not default to test_tenant when nothing is known', async () => {
    await storeAuthData(baseResponse);
    expect(await AsyncStorage.getItem('@auth/client_schema')).toBeNull();
  });
});
