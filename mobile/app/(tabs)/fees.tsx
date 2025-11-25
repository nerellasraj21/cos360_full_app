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

const feeSections = [
  {
    id: 'categories',
    title: 'Fee Categories',
    description: 'Manage fee categories like Tuition, Transportation, etc.',
    icon: 'folder-outline',
    route: '/fees/categories',
  },
  {
    id: 'types',
    title: 'Fee Types',
    description: 'Configure different types of fees within categories.',
    icon: 'list-outline',
    route: '/fees/types',
  },
  {
    id: 'terms',
    title: 'Fee Terms',
    description: 'Set up payment terms and schedules.',
    icon: 'calendar-outline',
    route: '/fees/terms',
  },
  {
    id: 'class-mappings',
    title: 'Class Mappings',
    description: 'Map fees to specific classes with amounts.',
    icon: 'school-outline',
    route: '/fees/class-mappings',
  },
  {
    id: 'student-mappings',
    title: 'Student Mappings',
    description: 'Assign fees to individual students.',
    icon: 'people-outline',
    route: '/fees/student-mappings',
  },
  {
    id: 'transactions',
    title: 'Fee Transactions',
    description: 'View and manage fee payment transactions.',
    icon: 'card-outline',
    route: '/fees/transactions',
  },
  {
    id: 'refunds',
    title: 'Fee Refunds',
    description: 'Process and track fee refunds.',
    icon: 'return-up-back-outline',
    route: '/fees/refunds',
  },
];

export default function FeesScreen() {
  const router = useRouter();
  const { theme, colors } = useTheme();
  const { hasPermission } = useMobilePermission();

  const handleNavigate = (route: string, hasAccess: boolean) => {
    if (hasAccess) {
      router.push(route as any);
    }
  };

  return (
    <AppLayout title="Fee Management">
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {feeSections.map((section) => {
          const resourceMap: { [key: string]: string } = {
            'categories': PERMISSION_RESOURCES.FEE_CATEGORIES,
            'types': PERMISSION_RESOURCES.FEE_TYPES,
            'terms': PERMISSION_RESOURCES.FEE_TERMS,
            'class-mappings': PERMISSION_RESOURCES.FEE_CLASS_MAPPINGS,
            'student-mappings': PERMISSION_RESOURCES.FEE_STUDENT_MAPPINGS,
            'transactions': PERMISSION_RESOURCES.FEE_TRANSACTIONS,
            'refunds': PERMISSION_RESOURCES.FEE_REFUNDS
          };

          const resource = resourceMap[section.id] || PERMISSION_RESOURCES.FEE_CATEGORIES;
          const hasAccess = hasPermission ? hasPermission(resource, 'list') : false;

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
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    padding: 20,
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
  sectionTitle: {
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  accessDeniedCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 40,
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
  accessDeniedTitle: {
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  accessDeniedText: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
});