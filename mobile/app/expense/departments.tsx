import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppLayout } from '@/components';
import { useTheme } from '@/contexts';
import { useExpenseDepartmentsProtected } from '@/hooks/use-expense-protected';
import { ReadOrListPermissionGuard } from '@/components/PermissionGuards';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  FlatList,
  StyleSheet,
  View,
} from 'react-native';

export default function ExpenseDepartmentsScreen() {
  const { colors } = useTheme();
  const { data: departmentsResponse, isLoading, error } = useExpenseDepartmentsProtected();

  const departments = Array.isArray(departmentsResponse)
    ? departmentsResponse
    : departmentsResponse?.items || [];

  const renderDepartmentItem = ({ item }: { item: any }) => (
    <ThemedView style={[styles.departmentCard, { backgroundColor: colors.card }]}>
      <View style={styles.departmentInfo}>
        <ThemedText type="subtitle" style={styles.departmentName}>
          {item.name}
        </ThemedText>
        <ThemedText style={[styles.departmentDetails, { color: colors['muted-foreground'] }]}>
          Status: {item.is_active ? 'Active' : 'Inactive'}
        </ThemedText>
        <ThemedText style={[styles.departmentDate, { color: colors['muted-foreground'] }]}>
          Created: {new Date(item.created_at).toLocaleDateString()}
        </ThemedText>
      </View>
    </ThemedView>
  );

  if (isLoading) {
    return (
      <AppLayout title="Expense Departments">
        <View style={styles.centerContainer}>
          <ThemedText>Loading departments...</ThemedText>
        </View>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Expense Departments">
        <View style={styles.centerContainer}>
          <ThemedText style={{ color: colors.destructive }}>
            Error loading departments
          </ThemedText>
        </View>
      </AppLayout>
    );
  }

  return (
    <ReadOrListPermissionGuard resource={PERMISSION_RESOURCES.EXPENSE_DEPARTMENTS}>
      <AppLayout title="Expense Departments">
        <View style={styles.container}>
        <FlatList
          data={departments}
          keyExtractor={(item) => item.id}
          renderItem={renderDepartmentItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="business-outline" size={48} color={colors['muted-foreground']} />
              <ThemedText style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
                No departments found
              </ThemedText>
            </View>
          }
        />
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
  listContainer: {
    paddingBottom: 20,
  },
  departmentCard: {
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  departmentInfo: {
    flex: 1,
  },
  departmentName: {
    marginBottom: 4,
  },
  departmentDetails: {
    fontSize: 14,
    marginBottom: 2,
  },
  departmentDate: {
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    marginTop: 16,
    textAlign: 'center',
  },
});