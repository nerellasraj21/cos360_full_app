import React from 'react';
import { View, StyleSheet } from 'react-native';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';
import { useTheme } from '@/contexts';

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  showSearch?: boolean;
  showMenu?: boolean;
  showFooter?: boolean;
}

export default function AppLayout({ 
  children, 
  title, 
  showSearch = true, 
  showMenu = true,
  showFooter = true 
}: AppLayoutProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader title={title} showSearch={showSearch} showMenu={showMenu} />
      <View style={styles.content}>
        {children}
      </View>
      {showFooter && <AppFooter />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});