import { useMutation, useQueryClient } from '@tanstack/react-query';
import CAxios from './index';
import { useAuthStore } from '../lib/authStore';

// Login mutation hook
export function useLoginMutation() {
  const login = useAuthStore((s) => s.login);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      // await CAxios.post('/login', { email, password });
      // Returning dummy user data for now
      return { id: 'string', name: 'string', email: email, token: '12345' };
    },
    onSuccess: (user) => {
      console.log("user", user)
      login(user, user.token);
    },
  });
}

// Logout mutation hook
export function useLogoutMutation() {
  const logout = useAuthStore((s) => s.logout);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // await CAxios.post('/logout');
      return;
    },
    onSuccess: () => {
      logout();
      queryClient.clear();
    },
  });
}
