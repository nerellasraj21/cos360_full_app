import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/contexts';

const SELF_HEADER_ROUTES = ['attendance', 'designations', 'profile'];

export default function StaffLayout() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={({ route }: { route: { name: string } }) => ({
        headerShown: false,
        contentStyle: {
          backgroundColor: colors.background,
          paddingTop: SELF_HEADER_ROUTES.includes(route.name) ? insets.top : 0,
        },
      })}
    />
  );
}
