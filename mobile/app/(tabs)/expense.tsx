import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppLayout } from '@/components';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts';
import { useMobilePermission } from '@/src/hooks/useMobilePermission';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

const expenseSections = [
  {
    id: 'transactions',
    title: 'Transactions',
    description: 'View and manage expense transactions',
    icon: 'receipt-outline',
    route: '/expense/transactions',
  },
  {
    id: 'categories',
    title: 'Categories',
    description: 'Manage expense categories',
    icon: 'folder-outline',
    route: '/expense/categories',
  },
  {
    id: 'types',
    title: 'Types',
    description: 'Configure expense types within categories',
    icon: 'list-outline',
    route: '/expense/types',
  },
  {
    id: 'approvals',
    title: 'Approvals',
    description: 'Review and approve pending expenses',
    icon: 'checkmark-circle-outline',
    route: '/expense/approvals',
  },
  // {
  //   id: 'audit',
  //   title: 'Audit',
  //   description: 'View audit logs and transaction history',
  //   icon: 'document-text-outline',
  //   route: '/expense/audit',
  // },
  // {
  //   id: 'reports',
  //   title: 'Reports',
  //   description: 'Generate expense reports and analytics',
  //   icon: 'bar-chart-outline',
  //   route: '/expense/reports',
  // },
  // {
  //   id: 'settings',
  //   title: 'Settings',
  //   description: 'Configure expense management settings',
  //   icon: 'settings-outline',
  //   route: '/expense/settings',
  // },
  // {
  //   id: 'departments',
  //   title: 'Departments',
  //   description: 'Manage departments for expense assignment',
  //   icon: 'business-outline',
  //   route: '/expense/departments',
  // },
];

const summaryCards = [
  {
    id: 'total-transactions',
    title: 'Total Transactions',
    value: '1,247',
    icon: 'receipt',
    color: '#3B82F6',
  },
  {
    id: 'total-amount',
    title: 'Total Amount',
    value: '₹2.4M',
    icon: 'cash',
    color: '#10B981',
  },
  {
    id: 'pending-approvals',
    title: 'Pending Approvals',
    value: '23',
    icon: 'time',
    color: '#F59E0B',
  },
  {
    id: 'approved-amount',
    title: 'Approved Amount',
    value: '₹1.8M',
    icon: 'checkmark-circle',
    color: '#8B5CF6',
  },
];

export default function ExpenseScreen() {
  const router = useRouter();
  const { theme, colors } = useTheme();
  const { hasPermission } = useMobilePermission();

  const handleNavigate = (route: string, hasAccess: boolean) => {
    if (hasAccess) {
      router.push(route as any);
    }
  };

  const renderSummaryCard = (card: typeof summaryCards[0]) => (
    <View key={card.id} style={[styles.summaryCard, { backgroundColor: colors.card }]}>
      <View style={[styles.cardIcon, { backgroundColor: card.color + '20' }]}>
        <Ionicons name={card.icon as any} size={24} color={card.color} />
      </View>
      <View style={styles.cardContent}>
        <ThemedText style={styles.cardValue}>{card.value}</ThemedText>
        <ThemedText style={[styles.cardTitle, { color: colors['muted-foreground'] }]}>
          {card.title}
        </ThemedText>
      </View>
    </View>
  );

  return (
    <AppLayout title="Expense Management">
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Summary Cards */}
        <View style={styles.summarySection}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Overview
          </ThemedText>
          <View style={styles.summaryGrid}>
            {summaryCards.map(renderSummaryCard)}
          </View>
        </View>

        {/* Navigation Cards */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Management
          </ThemedText>
          {expenseSections.map((section) => {
            const resourceMap: { [key: string]: string } = {
              'transactions': PERMISSION_RESOURCES.EXPENSE_TRANSACTIONS,
              'categories': PERMISSION_RESOURCES.EXPENSE_CATEGORIES,
              'types': PERMISSION_RESOURCES.EXPENSE_TYPES,
              'approvals': PERMISSION_RESOURCES.EXPENSE_APPROVALS
            };

            const resource = resourceMap[section.id] || PERMISSION_RESOURCES.EXPENSE_CATEGORIES;
            const action = section.id === 'approvals' ? 'approve' : 'list';
            const hasAccess = hasPermission ? hasPermission(resource, action) : false;

            return (
              <TouchableOpacity
                key={section.id}
                style={[
                  styles.sectionCard, 
                  { 
                    backgroundColor: hasAccess ? colors.card : colors.muted,
                    opacity: hasAccess ? 1 : 0.6
                  }
                ]}
                onPress={() => handleNavigate(section.route, hasAccess)}
                disabled={!hasAccess}
              >
                <Ionicons
                  name={hasAccess ? section.icon as any : "lock-closed"}
                  size={24}
                  color={hasAccess ? colors.primary : colors['muted-foreground']}
                  style={styles.sectionIcon}
                />
                <ThemedView style={styles.sectionContent}>
                  <ThemedText type="subtitle" style={styles.sectionTitle}>
                    {section.title}
                  </ThemedText>
                  <ThemedText style={[styles.sectionDescription, { color: colors['muted-foreground'] }]}>
                    {hasAccess 
                      ? section.description 
                      : "You don't have permission to access this feature"
                    }
                  </ThemedText>
                </ThemedView>
                <Ionicons
                  name={hasAccess ? "chevron-forward" : "lock-closed"}
                  size={20}
                  color={colors['muted-foreground']}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    padding: 20,
  },
  summarySection: {
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
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
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 12,
  },
  sectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
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
  sectionIcon: {
    marginRight: 16,
  },
  sectionContent: {
    flex: 1,
  },
  sectionDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
});