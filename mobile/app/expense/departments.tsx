import { ThemedText } from '@/components/themed-text';
import { AppLayout } from '@/components';
import { useTheme } from '@/contexts';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { ScreenAccessGate } from '@/components/ScreenAccessGate';

function ExpenseDepartmentsScreenContent() {
  const { colors } = useTheme();

  return (
    <AppLayout title="Expense Departments">
      <View style={styles.container}>
        <Ionicons name="ban-outline" size={48} color={colors['muted-foreground']} />
        <ThemedText style={[styles.title, { color: colors['muted-foreground'] }]}>
          Not Available
        </ThemedText>
        <ThemedText style={[styles.message, { color: colors['muted-foreground'] }]}>
          This feature is not currently available.
        </ThemedText>
      </View>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
  },
});


// Screen-level access control - see docs/USER_ROLES_WORKFLOW.md.
export default function ExpenseDepartmentsScreen() {
  return (
    <ScreenAccessGate
      title="Expense Departments"
      resources={['expense_departments', 'expense_categories']}
    >
      <ExpenseDepartmentsScreenContent />
    </ScreenAccessGate>
  );
}
