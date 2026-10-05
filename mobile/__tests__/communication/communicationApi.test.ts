jest.mock('../../src/api/client', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

import apiClient from '../../src/api/client';
import { announcementsApi } from '../../src/api/announcements';
import { communicationApi } from '../../src/api/communication';

const mockedClient = apiClient as unknown as {
  get: jest.Mock;
  post: jest.Mock;
};

beforeEach(() => {
  mockedClient.get.mockReset();
  mockedClient.post.mockReset();
});

describe('communicationApi.getLogs', () => {
  it('TC-COM-06-U05 drops empty and undefined filter values and keeps page', async () => {
    mockedClient.get.mockResolvedValue({ data: { items: [], total: 0, page: 1, page_size: 20 } });
    await communicationApi.getLogs({ channel: '' as never, status: undefined, page: 1 });
    expect(mockedClient.get).toHaveBeenCalledWith('/communication/logs', { params: { page: 1 } });
  });

  it('TC-COM-06-U05 keeps real filter values', async () => {
    mockedClient.get.mockResolvedValue({ data: { items: [], total: 0, page: 2, page_size: 20 } });
    await communicationApi.getLogs({ channel: 'sms', status: 'failed', page: 2 });
    expect(mockedClient.get).toHaveBeenCalledWith('/communication/logs', {
      params: { channel: 'sms', status: 'failed', page: 2 },
    });
  });

  it('TC-COM-06-U05 sends undefined params when called without filters', async () => {
    mockedClient.get.mockResolvedValue({ data: { items: [] } });
    await communicationApi.getLogs();
    expect(mockedClient.get).toHaveBeenCalledWith('/communication/logs', { params: undefined });
  });

  it('wraps a plain array response into a page object', async () => {
    mockedClient.get.mockResolvedValue({ data: [{ id: 'a' }, { id: 'b' }] });
    const page = await communicationApi.getLogs();
    expect(page).toEqual({ items: [{ id: 'a' }, { id: 'b' }], total: 2, page: 1, page_size: 2 });
  });

  it('defaults missing page fields of an object response', async () => {
    mockedClient.get.mockResolvedValue({ data: {} });
    const page = await communicationApi.getLogs();
    expect(page).toEqual({ items: [], total: 0, page: 1, page_size: 20 });
  });
});

describe('communicationApi.getTemplates', () => {
  it('returns a plain array response unchanged', async () => {
    mockedClient.get.mockResolvedValue({ data: [{ id: 't1' }] });
    expect(await communicationApi.getTemplates()).toEqual([{ id: 't1' }]);
    expect(mockedClient.get).toHaveBeenCalledWith('/communication/templates/', { params: undefined });
  });

  it('unwraps an items envelope', async () => {
    mockedClient.get.mockResolvedValue({ data: { items: [{ id: 't2' }] } });
    expect(await communicationApi.getTemplates({ channel: 'sms' })).toEqual([{ id: 't2' }]);
  });
});

describe('announcementsApi.sendHolidayNotice', () => {
  it('TC-COM-07-U04 posts a null body with the three values as query params', async () => {
    mockedClient.post.mockResolvedValue({ data: { status: 'queued', detail: 'ok' } });
    const params = { holiday_name: 'Independence Day', holiday_date: '2026-08-15', reason: 'National holiday' };
    const result = await announcementsApi.sendHolidayNotice(params);
    expect(mockedClient.post).toHaveBeenCalledWith('/announcements/send-holiday-notice', null, { params });
    expect(result).toEqual({ status: 'queued', detail: 'ok' });
  });
});
