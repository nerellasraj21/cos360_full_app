import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { schoolSettingsApi } from '@/api/schoolSettings'
import type { SchoolSettingsUpdateRequest } from '@/types/schoolSettings'

export const schoolSettingsKeys = {
  all: ['school-settings'] as const,
}

export const useSchoolSettings = () => {
  return useQuery({
    queryKey: schoolSettingsKeys.all,
    queryFn: schoolSettingsApi.get,
  })
}

export const useUpdateSchoolSettings = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: SchoolSettingsUpdateRequest) => schoolSettingsApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schoolSettingsKeys.all })
      toast.success('School settings saved successfully')
    },
    onError: () => toast.error('Failed to save school settings'),
  })
}

export const useUploadSchoolImage = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => schoolSettingsApi.uploadImage(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schoolSettingsKeys.all })
      toast.success('School logo uploaded successfully')
    },
    onError: () => toast.error('Failed to upload school logo'),
  })
}

export const useUploadSchoolSignature = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => schoolSettingsApi.uploadSignature(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schoolSettingsKeys.all })
      toast.success('Principal signature uploaded successfully')
    },
    onError: () => toast.error('Failed to upload signature'),
  })
}
