import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import ErrorBoundary from '@/components/ErrorBoundary';
import ToastProvider from '@/components/ToastProvider';
import { PermissionFeedbackProvider } from '@/components/ui';
import { AuthProvider, ThemeProvider, AcademicYearProvider, useTheme } from '@/contexts';
import { queryClient } from '@/src/api/queryClient';

export const unstable_settings = {
  anchor: '(tabs)',
};

function AppContent() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="profile" options={{ headerShown: false }} />
    </Stack>
  );
}

function AppWithToasts() {
  return (
    <ToastProvider>
      <PermissionFeedbackProvider>
        <AppContent />
        <StatusBarWithTheme />
      </PermissionFeedbackProvider>
    </ToastProvider>
  );
}

function StatusBarWithTheme() {
  const { theme } = useTheme();
  return <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <AcademicYearProvider>
                <AppWithToasts />
              </AcademicYearProvider>
            </AuthProvider>
          </QueryClientProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
