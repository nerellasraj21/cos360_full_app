import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppLayout } from '@/components';
import { useTheme } from '@/contexts';
import { useExpenseSummaryReportProtected } from '@/hooks/use-expense-protected';
import { ReadOrListPermissionGuard } from '@/components/PermissionGuards';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

export default function ExpenseReportsScreen() {
  const { colors } = useTheme();
  const { data: summaryReport, isLoading } = useExpenseSummaryReportProtected();

  if (isLoading) {
    return (
      <AppLayout title="Expense Reports">
        <View style={styles.centerContainer}>
          <ThemedText>Loading reports...</ThemedText>
        </View>
      </AppLayout>
    );
  }

  return (
    <ReadOrListPermissionGuard resource={PERMISSION_RESOURCES.EXPENSE_TRANSACTIONS}>
      <AppLayout title="Expense Reports">
        <View style={styles.container}>
        {summaryReport ? (
          <View style={styles.summaryContainer}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Summary (Last 30 Days)
            </ThemedText>
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: colors.card }]}>
                <ThemedText style={styles.statValue}>{summaryReport.total_transactions}</ThemedText>
                <ThemedText style={[styles.statLabel, { color: colors['muted-foreground'] }]}>
                  Total Transactions
                </ThemedText>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.card }]}>
                <ThemedText style={styles.statValue}>₹{summaryReport.total_amount.toLocaleString()}</ThemedText>
                <ThemedText style={[styles.statLabel, { color: colors['muted-foreground'] }]}>
                  Total Amount
                </ThemedText>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.card }]}>
                <ThemedText style={styles.statValue}>₹{summaryReport.approved_amount.toLocaleString()}</ThemedText>
                <ThemedText style={[styles.statLabel, { color: colors['muted-foreground'] }]}>
                  Approved Amount
                </ThemedText>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.centerContainer}>
            <Ionicons name="bar-chart-outline" size={48} color={colors['muted-foreground']} />
            <ThemedText style={[styles.placeholderText, { color: colors['muted-foreground'] }]}>
              Reports will be displayed here
            </ThemedText>
          </View>
        )}
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
  summaryContainer: {
    flex: 1,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  statsGrid: {
    gap: 12,
  },
  statCard: {
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
  },
  placeholderText: {
    marginTop: 16,
    textAlign: 'center',
  },
});