import apiClient from './client';

export interface SendHolidayNoticeParams {
  holiday_name: string;
  /** YYYY-MM-DD */
  holiday_date: string;
  reason: string;
}

export interface SendHolidayNoticeResponse {
  status: string;
  detail: string;
}

export const announcementsApi = {
  /**
   * POST /announcements/send-holiday-notice
   * Sends a holiday announcement SMS to all parents. Admin/Principal only.
   * Backend takes these as query params, not a JSON body.
   */
  sendHolidayNotice: async (
    params: SendHolidayNoticeParams,
  ): Promise<SendHolidayNoticeResponse> => {
    const response = await apiClient.post('/announcements/send-holiday-notice', null, { params });
    return response.data;
  },
};
