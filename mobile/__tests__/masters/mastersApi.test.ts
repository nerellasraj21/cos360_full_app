import apiClient from '../../src/api/client';
import { academicYearsApi, holidaysApi } from '../../src/api/masters';

jest.mock('../../src/api/client', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

const client = apiClient as unknown as { get: jest.Mock; post: jest.Mock; put: jest.Mock; patch: jest.Mock };

beforeEach(() => {
  client.get.mockReset();
});

describe('academicYearsApi.getAcademicYears', () => {
  it('requests inactive years too by default', async () => {
    client.get.mockResolvedValue({ data: { items: [] } });
    await academicYearsApi.getAcademicYears();
    expect(client.get).toHaveBeenCalledWith('/masters/academic_years/', { params: { active_only: false } });
  });

  it('lets the caller override active_only and add a limit', async () => {
    client.get.mockResolvedValue({ data: [] });
    await academicYearsApi.getAcademicYears({ active_only: true, limit: 100 });
    expect(client.get.mock.calls[0][1]).toEqual({ params: { active_only: true, limit: 100 } });
  });

  it('unwraps items from a paged response and passes a plain array through', async () => {
    client.get.mockResolvedValueOnce({ data: { items: [{ id: 'a' }], total_count: 1 } });
    expect(await academicYearsApi.getAcademicYears()).toEqual([{ id: 'a' }]);
    client.get.mockResolvedValueOnce({ data: [{ id: 'b' }] });
    expect(await academicYearsApi.getAcademicYears()).toEqual([{ id: 'b' }]);
  });
});

describe('holidaysApi.getHolidays', () => {
  it('unwraps items and forwards the query params unchanged', async () => {
    client.get.mockResolvedValue({ data: { items: [{ id: 'h1' }], total_count: 1, has_next: false } });
    const result = await holidaysApi.getHolidays({ limit: 100, academic_year_id: 'y1', active_only: true });
    expect(result).toEqual([{ id: 'h1' }]);
    expect(client.get).toHaveBeenCalledWith('/masters/holidays/', {
      params: { limit: 100, academic_year_id: 'y1', active_only: true },
    });
  });

  it('sends no params when called without arguments (server default limit 10 applies)', async () => {
    client.get.mockResolvedValue({ data: { items: [] } });
    await holidaysApi.getHolidays();
    expect(client.get).toHaveBeenCalledWith('/masters/holidays/', { params: undefined });
  });
});
