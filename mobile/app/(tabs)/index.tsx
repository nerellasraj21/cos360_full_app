import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppLayout } from '@/components';
import { useAuth, useTheme } from '@/contexts';
import { PermissionGuard } from '../../src/components/mobile/MobilePermissionGuard';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

const getFormattedDate = () =>
  new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

const MODULES = [
  {
    id: 'students',
    title: 'Students',
    icon: 'people' as const,
    color: '#3B82F6',
    bg: '#EFF6FF',
    darkBg: '#3B82F620',
    route: '/students',
    stat: '1,250+ Students',
  },
  {
    id: 'fees',
    title: 'Fees',
    icon: 'card' as const,
    color: '#10B981',
    bg: '#F0FDF4',
    darkBg: '#10B98120',
    route: '/fees',
    stat: '₹2.5M Collected',
  },
  {
    id: 'masters',
    title: 'Masters',
    icon: 'settings' as const,
    color: '#06B6D4',
    bg: '#ECFEFF',
    darkBg: '#06B6D420',
    route: '/masters',
    stat: '15+ Modules',
  },
  {
    id: 'transport',
    title: 'Transport',
    icon: 'bus' as const,
    color: '#F59E0B',
    bg: '#FFFBEB',
    darkBg: '#F59E0B20',
    route: '/transport',
    stat: '25 Vehicles',
  },
  {
    id: 'staff',
    title: 'Staff',
    icon: 'person' as const,
    color: '#8B5CF6',
    bg: '#F5F3FF',
    darkBg: '#8B5CF620',
    route: '/staff',
    stat: '85 Members',
  },
  {
    id: 'expense',
    title: 'Expense',
    icon: 'wallet' as const,
    color: '#F97316',
    bg: '#FFF7ED',
    darkBg: '#F9731620',
    route: '/expense',
    stat: '₹1.2M Spent',
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const { colors, theme } = useTheme();
  const { user } = useAuth();

  const initial = (user?.username || 'U').charAt(0).toUpperCase();

  return (
    <PermissionGuard resourceConstant="profile" actionConstant="read_own">
      <AppLayout title="Dashboard">
        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>

          {/* Hero / Greeting Card */}
          <View style={styles.heroCard}>
            <View style={styles.heroDecorCircle1} />
            <View style={styles.heroDecorCircle2} />

            {/* Top row: greeting + avatar */}
            <View style={styles.heroTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroGreeting}>{getGreeting()},</Text>
                <Text style={styles.heroName}>{user?.username || 'User'} 👋</Text>
                <View style={styles.heroDateRow}>
                  <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.65)" />
                  <Text style={styles.heroDate}>{getFormattedDate()}</Text>
                </View>
              </View>
              <View style={styles.heroAvatar}>
                <Text style={styles.heroAvatarText}>{initial}</Text>
              </View>
            </View>

            {/* Stats bar */}
            <View style={styles.heroStatsBar}>
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatNum}>1,250</Text>
                <Text style={styles.heroStatLabel}>Students</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatNum}>85</Text>
                <Text style={styles.heroStatLabel}>Staff</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatNum}>₹2.5M</Text>
                <Text style={styles.heroStatLabel}>Collected</Text>
              </View>
            </View>
          </View>

          {/* Module Grid */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Modules</Text>
            <View style={styles.grid}>
              {MODULES.map(mod => (
                <TouchableOpacity
                  key={mod.id}
                  style={[
                    styles.moduleCard,
                    { backgroundColor: theme === 'dark' ? mod.darkBg : mod.bg },
                  ]}
                  onPress={() => router.push(mod.route as any)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.moduleIconBg, { backgroundColor: mod.color }]}>
                    <Ionicons name={mod.icon} size={22} color="white" />
                  </View>
                  <Text style={[styles.moduleTitle, { color: mod.color }]}>{mod.title}</Text>
                  <Text style={[styles.moduleStat, { color: colors['muted-foreground'] }]}>{mod.stat}</Text>
                  <View style={[styles.moduleArrowBg, { backgroundColor: mod.color + '20' }]}>
                    <Ionicons name="arrow-forward" size={13} color={mod.color} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

        </ScrollView>
      </AppLayout>
    </PermissionGuard>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    margin: 16,
    borderRadius: 22,
    backgroundColor: '#556ee6',
    overflow: 'hidden',
    shadowColor: '#556ee6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 10,
  },
  heroDecorCircle1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  heroDecorCircle2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingBottom: 16,
  },
  heroGreeting: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  heroName: {
    color: 'white',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 3,
    marginBottom: 8,
  },
  heroDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  heroDate: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  heroAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  heroAvatarText: {
    color: 'white',
    fontSize: 22,
    fontWeight: '700',
  },
  heroStatsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.18)',
    marginHorizontal: 16,
    marginBottom: 18,
    borderRadius: 14,
    paddingVertical: 12,
  },
  heroStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatNum: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  heroStatLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    marginTop: 2,
  },
  heroStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  section: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  moduleCard: {
    width: '47%',
    borderRadius: 18,
    padding: 16,
    overflow: 'hidden',
  },
  moduleIconBg: {
    width: 46,
    height: 46,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  moduleTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  moduleStat: {
    fontSize: 12,
    marginBottom: 12,
    lineHeight: 16,
  },
  moduleArrowBg: {
    alignSelf: 'flex-end',
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
