import apiClient from '../client';
import { getClientSchema, getValidAccessToken } from '../../../services/authUtils';

jest.mock('../../../services/authUtils', () => ({
  getClientSchema: jest.fn(),
  getValidAccessToken: jest.fn(),
  refreshAccessToken: jest.fn(),
}));

jest.mock('../students', () => ({}));

const mockGetClientSchema = getClientSchema as jest.Mock;
const mockGetValidAccessToken = getValidAccessToken as jest.Mock;

let sentHeaders: Record<string, unknown> = {};

beforeEach(() => {
  sentHeaders = {};
  mockGetClientSchema.mockResolvedValue('acme');
  mockGetValidAccessToken.mockResolvedValue(null);
  apiClient.defaults.adapter = async (config) => {
    sentHeaders = config.headers.toJSON();
    return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
  };
});

describe('request interceptor tenant header', () => {
  it('sends cschema on a request without Authorization', async () => {
    await apiClient.get('/auth/academic-years');
    expect(sentHeaders.cschema).toBe('acme');
  });

  it('sends cschema on login', async () => {
    await apiClient.post('/auth/login', {});
    expect(sentHeaders.cschema).toBe('acme');
  });

  it('sends cschema on /auth/refresh', async () => {
    await apiClient.post('/auth/refresh', { refresh_token: 'r' });
    expect(sentHeaders.cschema).toBe('acme');
  });

  it('does not send cschema on an authenticated request', async () => {
    mockGetValidAccessToken.mockResolvedValue('token');
    await apiClient.get('/students');
    expect(sentHeaders.Authorization).toBe('Bearer token');
    expect(sentHeaders.cschema).toBeUndefined();
  });

  it('does not send cschema when an Authorization header is supplied', async () => {
    await apiClient.post('/auth/logout', {}, { headers: { Authorization: 'Bearer x' } });
    expect(sentHeaders.cschema).toBeUndefined();
  });

  it('sends no cschema and no default tenant when no organisation is stored', async () => {
    mockGetClientSchema.mockResolvedValue(null);
    await apiClient.get('/auth/academic-years');
    expect(sentHeaders.cschema).toBeUndefined();
  });

  it('keeps an explicit cschema header', async () => {
    await apiClient.get('/auth/academic-years', { headers: { cschema: 'typed' } });
    expect(sentHeaders.cschema).toBe('typed');
  });
});
