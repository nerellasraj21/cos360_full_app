import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      retry: (failureCount, error: any) => {
        const status = error?.response?.status;
        // Don't retry on client errors — these won't change on retry
        if (status === 400 || status === 401 || status === 403 || status === 404 || status === 409 || status === 422) return false;

        // Retry on network errors and server errors
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: (failureCount, error: any) => {
        // Don't retry mutations by default, but allow specific cases
        if (error?.response?.status === 409) return false; // Conflict
        if (error?.response?.status === 422) return false; // Validation error
        return failureCount < 1; // Retry once for network issues
      },
      retryDelay: 1000,
    },
  },
});

export default queryClient;