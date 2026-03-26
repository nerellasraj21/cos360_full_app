import React from 'react';
import { View, StyleSheet } from 'react-native';
import AppHeader from './AppHeader';
import { useTheme } from '@/contexts';

interface ScreenLayoutProps {
  children: React.ReactNode;
  title?: string;
  showSearch?: boolean;
  showMenu?: boolean;
  showHeader?: boolean;
  headerRight?: React.ReactNode;
}

export default function ScreenLayout({
  children,
  title,
  showSearch = true,
  showMenu = true,
  showHeader = true,
  headerRight,
}: ScreenLayoutProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {showHeader && (
        <AppHeader title={title} showSearch={showSearch} showMenu={showMenu} headerRight={headerRight} />
      )}
      <View style={styles.content}>
        {children}
      </View>
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