import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppLayout } from '@/components';
import { useTheme } from '@/contexts';
import { ReadOrListPermissionGuard } from '@/components/PermissionGuards';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

export default function ExpenseAuditScreen() {
  const { colors } = useTheme();

  return (
    <ReadOrListPermissionGuard resource={PERMISSION_RESOURCES.EXPENSE_AUDIT}>
      <AppLayout title="Expense Audit">
        <View style={styles.container}>
        <View style={styles.centerContainer}>
          <Ionicons name="document-text-outline" size={48} color={colors['muted-foreground']} />
          <ThemedText style={[styles.placeholderText, { color: colors['muted-foreground'] }]}>
            Audit logs will be displayed here
          </ThemedText>
        </View>
        </View>
      </AppLayout>
    </ReadOrListPermissionGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    marginTop: 16,
    textAlign: 'center',
  },
});