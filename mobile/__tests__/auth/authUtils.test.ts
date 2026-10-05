import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '@/src/api/client';
import {
  clearAuthData,
  getStoredTokens,
  getValidAccessToken,
  initializeAuth,
  isAuthenticated,
  isTokenExpired,
  logoutUser,
  normalisePermissions,
  refreshAccessToken,
  storeAuthData,
} from '@/services/authUtils';

const mockSecure = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockSecure.set(key, value);
  }),
  getItemAsync: jest.fn(async (key: string) => (mockSecure.has(key) ? (mockSecure.get(key) as string) : null)),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockSecure.delete(key);
  }),
}));

jest.mock('@/src/api/client', () => ({
  __esModule: true,
  default: { post: jest.fn(), get: jest.fn() },
}));

const post = apiClient.post as jest.Mock;

const NOW = 1_800_000_000_000;
const MINUTE = 60 * 1000;

const SECURE_KEYS = ['auth_access_token', 'auth_refresh_token', 'auth_token_expiry', 'auth_change_password_token'];
const ASYNC_KEYS = [
  '@auth/user_data',
  '@auth/role_data',
  '@auth/permissions_data',
  '@auth/selected_student',
  '@auth/available_students',
  '@auth/student_id',
  '@auth/menu_data',
  '@auth/client_schema',
];

const seedSession = async (expiryOffsetMs: number) => {
  mockSecure.set('auth_access_token', 'access-1');
  mockSecure.set('auth_refresh_token', 'refresh-1');
  mockSecure.set('auth_token_expiry', String(NOW + expiryOffsetMs));
  await AsyncStorage.setItem('@auth/user_data', JSON.stringify({ id: 'u1', username: 'alice' }));
};

const authResponse = (extra: Record<string, unknown> = {}) =>
  ({
    user: { id: 'u1', username: 'alice', email: 'a@x.com', is_active: true },
    role: { id: 'r1', name: 'Admin', description: '' },
    menu: [],
    permissions: { students: ['list'] },
    access_token: 'access-1',
    refresh_token: 'refresh-1',
    token_type: 'bearer',
    ...extra,
  }) as never;

beforeEach(async () => {
  mockSecure.clear();
  await AsyncStorage.clear();
  post.mockReset();
  jest.spyOn(Date, 'now').mockReturnValue(NOW);
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('normalisePermissions', () => {
  test('TC-AUTH-05-U10 converts a resource map into granted items with composite ids', () => {
    const result = normalisePermissions({ students: ['list', 'read'] });
    expect(result).toHaveLength(2);
    expect(result.map(item => item.id)).toEqual(['students:list', 'students:read']);
    expect(result.every(item => item.is_granted === true)).toBe(true);
    expect(result[0]).toEqual({ id: 'students:list', resource: 'students', action: 'list', is_granted: true });
  });

  test('TC-AUTH-05-U11 null, undefined and arrays are handled', () => {
    const list = [{ id: 'a:b', resource: 'a', action: 'b', is_granted: true }];
    expect(normalisePermissions(null)).toEqual([]);
    expect(normalisePermissions(undefined)).toEqual([]);
    expect(normalisePermissions(list)).toBe(list);
  });

  test('TC-AUTH-05-U10 non-array action values are ignored', () => {
    expect(normalisePermissions({ students: 'list' } as never)).toEqual([]);
  });
});

describe('token expiry', () => {
  test('TC-AUTH-07-U01 expires inside the 5 minute buffer', async () => {
    mockSecure.set('auth_token_expiry', String(NOW + 4 * MINUTE));
    expect(await isTokenExpired()).toBe(true);
    mockSecure.set('auth_token_expiry', String(NOW + 5 * MINUTE));
    expect(await isTokenExpired()).toBe(true);
    mockSecure.set('auth_token_expiry', String(NOW + 6 * MINUTE));
    expect(await isTokenExpired()).toBe(false);
  });

  test('TC-AUTH-07-U02 a missing expiry counts as expired', async () => {
    expect(await isTokenExpired()).toBe(true);
  });

  test('TC-AUTH-07-U03 storeAuthData stores expiry from expires_in or one hour by default', async () => {
    await storeAuthData(authResponse({ expires_in: 86400 }));
    expect(Number(mockSecure.get('auth_token_expiry'))).toBe(NOW + 86400 * 1000);
    await storeAuthData(authResponse());
    expect(Number(mockSecure.get('auth_token_expiry'))).toBe(NOW + 3600 * 1000);
  });

  test('TC-AUTH-07-U03 storeAuthData normalises permissions and keeps tokens in secure storage', async () => {
    await storeAuthData(authResponse({ client_name: 'qa_school' }));
    expect(mockSecure.get('auth_access_token')).toBe('access-1');
    expect(mockSecure.get('auth_refresh_token')).toBe('refresh-1');
    const stored = JSON.parse((await AsyncStorage.getItem('@auth/permissions_data')) as string);
    expect(stored[0].id).toBe('students:list');
    expect(await AsyncStorage.getItem('@auth/client_schema')).toBe('qa_school');
    expect(await AsyncStorage.getItem('access_token')).toBeNull();
  });
});

describe('stored session', () => {
  test('TC-AUTH-07-U04 getStoredTokens returns null when only the access token is stored', async () => {
    mockSecure.set('auth_access_token', 'access-1');
    expect(await getStoredTokens()).toBeNull();
  });

  test('TC-AUTH-07-U05 clearAuthData removes every session key', async () => {
    SECURE_KEYS.forEach(key => mockSecure.set(key, 'x'));
    for (const key of ASYNC_KEYS) {
      await AsyncStorage.setItem(key, 'x');
    }
    await clearAuthData();
    SECURE_KEYS.forEach(key => expect(mockSecure.has(key)).toBe(false));
    for (const key of ASYNC_KEYS) {
      expect(await AsyncStorage.getItem(key)).toBeNull();
    }
  });

  test('TC-AUTH-07-U06 isAuthenticated is false with tokens but no stored user', async () => {
    mockSecure.set('auth_access_token', 'access-1');
    mockSecure.set('auth_refresh_token', 'refresh-1');
    mockSecure.set('auth_token_expiry', String(NOW + 60 * MINUTE));
    expect(await isAuthenticated()).toBe(false);
  });

  test('TC-AUTH-07-U06 isAuthenticated is true with tokens, user and a fresh expiry', async () => {
    await seedSession(60 * MINUTE);
    expect(await isAuthenticated()).toBe(true);
    expect(post).not.toHaveBeenCalled();
  });

  test('TC-AUTH-07-U07 an expired token with a failing refresh gives false and clears the session', async () => {
    await seedSession(-MINUTE);
    post.mockRejectedValue(new Error('refresh rejected'));
    expect(await isAuthenticated()).toBe(false);
    expect(post).toHaveBeenCalledWith('/auth/refresh', { refresh_token: 'refresh-1' });
    expect(mockSecure.has('auth_access_token')).toBe(false);
    expect(mockSecure.has('auth_refresh_token')).toBe(false);
    expect(await AsyncStorage.getItem('@auth/user_data')).toBeNull();
  });

  test('TC-AUTH-07-U07 an expired token with a working refresh stores the new pair and gives true', async () => {
    await seedSession(-MINUTE);
    post.mockResolvedValue({ data: { access_token: 'access-2', refresh_token: 'refresh-2', token_type: 'bearer', expires_in: 7200 } });
    expect(await isAuthenticated()).toBe(true);
    expect(mockSecure.get('auth_access_token')).toBe('access-2');
    expect(mockSecure.get('auth_refresh_token')).toBe('refresh-2');
    expect(Number(mockSecure.get('auth_token_expiry'))).toBe(NOW + 7200 * 1000);
  });

  test('TC-AUTH-07-U08 initializeAuth returns the empty state when not authenticated', async () => {
    expect(await initializeAuth()).toEqual({
      isAuthenticated: false,
      user: null,
      role: null,
      permissions: [],
      menu: [],
    });
  });

  test('TC-AUTH-07-U08 initializeAuth restores stored data when authenticated', async () => {
    await seedSession(60 * MINUTE);
    await AsyncStorage.setItem('@auth/role_data', JSON.stringify({ name: 'Admin' }));
    await AsyncStorage.setItem('@auth/permissions_data', JSON.stringify([{ id: 'a:b', resource: 'a', action: 'b', is_granted: true }]));
    const state = await initializeAuth();
    expect(state.isAuthenticated).toBe(true);
    expect(state.role).toEqual({ name: 'Admin' });
    expect(state.permissions).toHaveLength(1);
    expect(state.menu).toEqual([]);
  });
});

describe('access token retrieval and refresh', () => {
  test('TC-AUTH-08-U14 getValidAccessToken(false) returns null for an expired token without refreshing', async () => {
    await seedSession(-MINUTE);
    expect(await getValidAccessToken(false)).toBeNull();
    expect(post).not.toHaveBeenCalled();
  });

  test('TC-AUTH-08-U14 getValidAccessToken(false) returns the token while it is fresh', async () => {
    await seedSession(60 * MINUTE);
    expect(await getValidAccessToken(false)).toBe('access-1');
  });

  test('TC-AUTH-08-U15 a failed refresh clears the session and returns null without throwing', async () => {
    await seedSession(-MINUTE);
    post.mockRejectedValue(new Error('network'));
    await expect(refreshAccessToken()).resolves.toBeNull();
    expect(mockSecure.has('auth_refresh_token')).toBe(false);
    expect(await AsyncStorage.getItem('@auth/user_data')).toBeNull();
  });

  test('TC-AUTH-08-U15 refresh without stored tokens returns null and does not call the API', async () => {
    await expect(refreshAccessToken()).resolves.toBeNull();
    expect(post).not.toHaveBeenCalled();
  });
});

describe('logout', () => {
  test('TC-AUTH-14-U09 logoutUser reads tokens, clears storage, then posts logout with _retry', async () => {
    await seedSession(60 * MINUTE);
    const order: string[] = [];
    post.mockImplementation(async () => {
      order.push(`post:${mockSecure.size}`);
      return { data: {} };
    });
    await logoutUser();
    expect(post).toHaveBeenCalledTimes(1);
    const [url, body, options] = post.mock.calls[0];
    expect(url).toBe('/auth/logout');
    expect(body).toEqual({ refresh_token: 'refresh-1' });
    expect(options._retry).toBe(true);
    expect(options.headers.Authorization).toBe('Bearer access-1');
    expect(order).toEqual(['post:0']);
    expect(mockSecure.has('auth_access_token')).toBe(false);
  });

  test('TC-AUTH-14-U09 a failing logout request does not throw', async () => {
    await seedSession(60 * MINUTE);
    post.mockRejectedValue(new Error('offline'));
    await expect(logoutUser()).resolves.toBeUndefined();
    await Promise.resolve();
    expect(mockSecure.has('auth_refresh_token')).toBe(false);
  });

  test('TC-AUTH-14-U09 without stored tokens nothing is posted', async () => {
    await logoutUser();
    expect(post).not.toHaveBeenCalled();
  });
});
