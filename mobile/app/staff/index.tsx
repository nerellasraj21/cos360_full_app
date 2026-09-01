import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppLayout } from '@/components';
import { useAuth, useTheme } from '@/contexts';

const NAV_CARDS = [
  {
    route: '/staff/enrollment',
    icon: 'people' as const,
    color: '#3B82F6',
    bg: '#EFF6FF',
    darkBg: '#3B82F620',
    title: 'Staff Enrollment',
    subtitle: 'Manage staff records & onboarding',
    resource: 'staff',
  },
  {
    route: '/staff/attendance',
    icon: 'checkmark-circle' as const,
    color: '#10B981',
    bg: '#F0FDF4',
    darkBg: '#10B98120',
    title: 'Attendance',
    subtitle: 'Mark & view staff daily attendance',
    resource: 'staff_attendance',
  },
  {
    route: '/staff/designations',
    icon: 'briefcase' as const,
    color: '#F59E0B',
    bg: '#FFFBEB',
    darkBg: '#F59E0B20',
    title: 'Designations',
    subtitle: 'Configure staff designations & roles',
    resource: 'staff',
  },
];

export default function StaffIndexScreen() {
  const router = useRouter();
  const { colors, theme } = useTheme();
  const { hasPermission } = useAuth();

  const visibleCards = NAV_CARDS.filter(
    (c) => c.resource === null || hasPermission(c.resource, 'list') || hasPermission(c.resource, 'read'),
  );

  return (
    <AppLayout title="Staff">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Staff Management</Text>
        <Text style={[styles.sectionSub, { color: colors['muted-foreground'] }]}>
          Manage staff records, attendance, and designations
        </Text>

        <View style={styles.grid}>
          {visibleCards.map((card) => (
            <TouchableOpacity
              key={card.route}
              style={[
                styles.card,
                { backgroundColor: theme === 'dark' ? card.darkBg : card.bg },
              ]}
              onPress={() => router.push(card.route as any)}
              activeOpacity={0.75}
            >
              <View style={[styles.iconBox, { backgroundColor: card.color }]}>
                <Ionicons name={card.icon} size={26} color="white" />
              </View>
              <View style={styles.cardText}>
                <Text style={[styles.cardTitle, { color: card.color }]}>{card.title}</Text>
                <Text style={[styles.cardSub, { color: colors['muted-foreground'] }]} numberOfLines={2}>
                  {card.subtitle}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={card.color} />
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  sectionSub: { fontSize: 14, marginBottom: 24, lineHeight: 20 },
  grid: { gap: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  cardSub: { fontSize: 12, lineHeight: 17 },
});
