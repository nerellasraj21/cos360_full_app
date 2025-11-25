import { useRouter, usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Only redirect on initial app load if we haven't redirected before
    if (!isLoading && !hasRedirected.current) {
      hasRedirected.current = true;
      if (isAuthenticated) {
        // If authenticated, go to dashboard
        router.replace('/(tabs)');
      } else {
        // If not authenticated, go to login
        router.replace('/login');
      }
    }
  }, [isAuthenticated, isLoading, router]);

  // Show loading or null while determining auth state
  if (isLoading) {
    return null;
  }

  return null; // This component just redirects
}