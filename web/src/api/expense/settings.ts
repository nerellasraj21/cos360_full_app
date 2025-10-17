import CAxios from '../index';
import type {
    ExpenseSettings,
    ExpenseSettingsCreateRequest,
    ExpenseSettingsUpdateRequest,
    ExpenseSettingsListResponse
} from '@/types/expense';

export const expenseSettingsApi = {
    // Get all settings with filtering
    getAllSettings: async (params?: { skip?: number; limit?: number; department_id?: string }): Promise<ExpenseSettingsListResponse> => {
        console.log('[DEBUG] expenseSettingsApi.getAllSettings called with params:', params);

        const queryParams = new URLSearchParams();
        if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
        if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
        if (params?.department_id) queryParams.append('department_id', params.department_id);

        const response = await CAxios.get(`/expense/settings?${queryParams.toString()}`);
        console.log('[DEBUG] expenseSettingsApi.getAllSettings returning:', response.data);
        return response.data;
    },

    // Get setting by ID
    getSettingById: async (id: string): Promise<ExpenseSettings> => {
        console.log('[DEBUG] expenseSettingsApi.getSettingById called with id:', id);

        const response = await CAxios.get(`/expense/settings/${id}`);
        console.log('[DEBUG] expenseSettingsApi.getSettingById returning:', response.data);
        return response.data;
    },

    // Create new setting
    createSetting: async (data: ExpenseSettingsCreateRequest): Promise<ExpenseSettings> => {
        console.log('[DEBUG] expenseSettingsApi.createSetting called with data:', data);

        const response = await CAxios.post('/expense/settings', data);
        console.log('[DEBUG] expenseSettingsApi.createSetting success:', response.data);
        return response.data;
    },

    // Update setting
    updateSetting: async (id: string, data: ExpenseSettingsUpdateRequest): Promise<ExpenseSettings> => {
        console.log('[DEBUG] expenseSettingsApi.updateSetting called with id:', id, 'data:', data);

        const response = await CAxios.put(`/expense/settings/${id}`, data);
        console.log('[DEBUG] expenseSettingsApi.updateSetting updated:', response.data);
        return response.data;
    },

    // Delete setting
    deleteSetting: async (id: string): Promise<void> => {
        console.log('[DEBUG] expenseSettingsApi.deleteSetting called with id:', id);

        await CAxios.delete(`/expense/settings/${id}`);
        console.log('[DEBUG] expenseSettingsApi.deleteSetting deleted setting with id:', id);
    },

    // Legacy method for backward compatibility
    getSettings: async (): Promise<ExpenseSettings[]> => {
        console.log('[DEBUG] expenseSettingsApi.getSettings called (legacy)');

        const response = await CAxios.get('/expense/settings');
        console.log('[DEBUG] expenseSettingsApi.getSettings returning (legacy):', response.data);
        return response.data.items || response.data;
    },

    // Legacy method for backward compatibility
    updateSettings: async (data: ExpenseSettingsUpdateRequest): Promise<ExpenseSettings> => {
        console.log('[DEBUG] expenseSettingsApi.updateSettings called (legacy) with data:', data);

        // For legacy compatibility, assume we're updating the first setting
        const response = await CAxios.put('/expense/settings/default', data);
        console.log('[DEBUG] expenseSettingsApi.updateSettings updated (legacy):', response.data);
        return response.data;
    },
};

export const {
    getSettings,
    updateSettings,
} = expenseSettingsApi;