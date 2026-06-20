import CAxios from './index'
import type { SchoolSettings, SchoolSettingsUpdateRequest } from '@/types/schoolSettings'

export const schoolSettingsApi = {
  get: async (): Promise<SchoolSettings | null> => {
    try {
      const response = await CAxios.get('/school-settings')
      return response.data
    } catch (error: any) {
      if (error?.response?.status === 404) return null
      throw error
    }
  },

  update: async (data: SchoolSettingsUpdateRequest): Promise<SchoolSettings> => {
    const response = await CAxios.put('/school-settings', data)
    return response.data
  },

  uploadImage: async (file: File): Promise<SchoolSettings> => {
    const formData = new FormData()
    formData.append('photo', file)
    const response = await CAxios.post('/school-settings/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  uploadSignature: async (file: File): Promise<SchoolSettings> => {
    const formData = new FormData()
    formData.append('photo', file)
    const response = await CAxios.post('/school-settings/upload-signature', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },
}
