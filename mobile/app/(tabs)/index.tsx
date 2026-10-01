import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppLayout } from '@/components';
import { getModuleStyle, mapPath } from '@/components/navigation/menuMap';
import { useAuth, useTheme } from '@/contexts';
import { roleTopLevelMenu } from '@/src/lib/menuUtils';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

const getFormattedDate = () =>
  new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

/** A card in the Modules grid. */
type ModuleCard = {
  id: string; title: string; icon: any; color: string; bg: string; darkBg: string;
  route: string; resource?: string; resources?: string[]; alwaysShow?: boolean;
  hideForRoles?: string[];
};

// Presentation registry for the known modules: icon, colours and the mobile
// route each one opens. Which of these are actually shown is decided by the
// backend menu (see `accessibleModules` below) — exactly as on web, where every
// module hub renders from `menuItems`. The `resource` fields are used only for
// the cold-start fallback, before the menu has loaded.
// hideForRoles: role names (lowercase) that must never see this module.
// Order mirrors the web sidebar's canonical MENU_ORDER (src/lib/menuUtils.ts, MOM 13-6-2026):
// Students, Staff Management, Exam, Fees, Expense, Communication, Reports, Masters, Administration, Transport.
const MODULES: ModuleCard[] = [
  {
    id: 'students',
    title: 'Students',
    icon: 'school' as const,
    color: '#3B82F6',
    bg: '#EFF6FF',
    darkBg: '#3B82F620',
    route: '/(tabs)/students',
    resource: 'student_admissions',
  },
  {
    id: 'staff',
    title: 'Staff Management',
    icon: 'people' as const,
    color: '#8B5CF6',
    bg: '#F5F3FF',
    darkBg: '#8B5CF620',
    route: '/(tabs)/staff',
    resources: ['staff', 'designations', 'staff_attendance'],
  },
  {
    id: 'exam',
    title: 'Exam Management',
    icon: 'clipboard' as const,
    color: '#EC4899',
    bg: '#FDF2F8',
    darkBg: '#EC489920',
    route: '/(tabs)/exam',
    resource: 'exams',
  },
  {
    id: 'fees',
    title: 'Fee Management',
    icon: 'cash' as const,
    color: '#10B981',
    bg: '#F0FDF4',
    darkBg: '#10B98120',
    route: '/(tabs)/fees',
    resource: 'fee_transactions',
    hideForRoles: ['teacher'], // Web parity: teachers are blocked from the Fee module
  },
  {
    id: 'expense',
    title: 'Expense',
    icon: 'wallet' as const,
    color: '#F97316',
    bg: '#FFF7ED',
    darkBg: '#F9731620',
    route: '/(tabs)/expense',
    resource: 'expense_transactions',
  },
  {
    id: 'communication',
    title: 'Communication',
    icon: 'send' as const,
    color: '#6366F1',
    bg: '#EEF2FF',
    darkBg: '#6366F120',
    route: '/(tabs)/communication',
    alwaysShow: true,
    hideForRoles: ['student', 'parent', 'guardian', 'father', 'mother'], // Web parity: student/parent have no Communication module
  },
  {
    id: 'reports',
    title: 'Reports',
    icon: 'bar-chart' as const,
    color: '#556ee6',
    bg: '#EEF2FF',
    darkBg: '#556ee620',
    route: '/(tabs)/reports',
    alwaysShow: true,
    hideForRoles: ['student', 'parent', 'guardian', 'father', 'mother'], // Web parity: student/parent have no Reports module
  },
  {
    id: 'masters',
    title: 'Masters',
    icon: 'server' as const,
    color: '#06B6D4',
    bg: '#ECFEFF',
    darkBg: '#06B6D420',
    route: '/(tabs)/masters',
    resource: 'academic_years',
    hideForRoles: ['student', 'parent', 'guardian', 'father', 'mother'], // Web parity: student/parent have no Masters module
  },
  {
    id: 'admin',
    title: 'Administration',
    icon: 'business' as const,
    color: '#64748b',
    bg: '#F8FAFC',
    darkBg: '#64748b20',
    route: '/(tabs)/admin',
    resources: ['users', 'roles', 'staff'],
  },
  {
    id: 'transport',
    title: 'Transport',
    icon: 'bus' as const,
    color: '#F59E0B',
    bg: '#FFFBEB',
    darkBg: '#F59E0B20',
    route: '/(tabs)/transport',
    alwaysShow: true,
    hideForRoles: ['student', 'parent', 'guardian', 'father', 'mother'], // Web parity: student/parent have no Transport module
  },
];

// Backend menu labels → the MODULES entry that renders them. The backend uses
// slightly different names for the same module across tenants ("Fee" vs
// "Fee Management"), so every known alias is mapped here.
const MENU_NAME_TO_MODULE: Record<string, string> = {
  'students': 'students',
  'student': 'students',
  'staff management': 'staff',
  'staff': 'staff',
  'exam management': 'exam',
  'exams': 'exam',
  'exam': 'exam',
  'fee management': 'fees',
  'fee': 'fees',
  'fees': 'fees',
  'expense': 'expense',
  'expenses': 'expense',
  'communication': 'communication',
  'reports': 'reports',
  'masters': 'masters',
  'administration': 'admin',
  'admin': 'admin',
  'transport': 'transport',
};

export default function HomeScreen() {
  const router = useRouter();
  const { colors, theme } = useTheme();
  const { user, role, hasPermission, menu } = useAuth();

  const initial = (user?.username || 'U').charAt(0).toUpperCase();
  const roleName = role?.name?.toLowerCase() ?? '';

  // Modules are the UNION of two sources, so a module can never go missing:
  //   1. what the user's permissions entitle them to (the long-standing
  //      behaviour), and
  //   2. anything extra the backend menu grants.
  // The explicit web hide rules still apply on top (teacher -> Fee, and the
  // rules inside `applyRoleMenuRules`), so hiding stays web-accurate while a
  // sparse or differently-named menu payload can no longer blank the grid.
  const accessibleModules = useMemo<ModuleCard[]>(() => {
    const byPermission = MODULES.filter(mod => {
      // Web parity: hide modules explicitly blocked for this role (e.g. teacher -> fees)
      if (mod.hideForRoles?.includes(roleName)) return false;
      if (mod.alwaysShow) return true;
      const resources = mod.resources ?? (mod.resource ? [mod.resource] : []);
      return resources.some(r =>
        hasPermission(r, 'read') || hasPermission(r, 'list') || hasPermission(r, 'read_own')
      );
    });

    const cards: ModuleCard[] = [...byPermission];
    const seen = new Set(cards.map(c => c.id));

    for (const node of roleTopLevelMenu((menu ?? []) as any, roleName)) {
      const name = (node.name ?? '').trim();
      const key = name.toLowerCase();
      if (key === 'dashboard') continue; // this screen

      const moduleId = MENU_NAME_TO_MODULE[key];
      const known = moduleId ? MODULES.find(m => m.id === moduleId) : undefined;

      if (known) {
        if (seen.has(known.id)) continue;
        if (known.hideForRoles?.includes(roleName)) continue;
        seen.add(known.id);
        cards.push(known);
        continue;
      }

      // A module this build has no styling for. Needs a path to be navigable —
      // parent menu nodes often carry a null path and only exist to group children.
      const id = node.id ?? key;
      if (!node.path || seen.has(id)) continue;
      seen.add(id);
      const { icon, color } = getModuleStyle(name);
      cards.push({
        id,
        title: name,
        icon,
        color,
        bg: color + '14',
        darkBg: color + '20',
        route: mapPath(node.path),
      });
    }

    // Canonical web sidebar order (MODULES is already declared in that order).
    const orderIndex = (card: ModuleCard) => {
      const i = MODULES.findIndex(m => m.id === card.id);
      return i === -1 ? MODULES.length : i;
    };
    return cards.sort((a, b) => orderIndex(a) - orderIndex(b));
  }, [menu, roleName, hasPermission]);

  return (
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
              <Text style={styles.heroName}>{user?.username || 'User'}</Text>
              <View style={styles.heroDateRow}>
                <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.65)" />
                <Text style={styles.heroDate}>{getFormattedDate()}</Text>
              </View>
            </View>
            <View style={styles.heroAvatar}>
              <Text style={styles.heroAvatarText}>{initial}</Text>
            </View>
          </View>
        </View>

        {/* Module Grid */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Modules</Text>
          {accessibleModules.length === 0 ? (
            <View style={styles.emptyModules}>
              <Ionicons name="lock-closed-outline" size={40} color={colors['muted-foreground']} />
              <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
                No modules available.{'\n'}Contact your administrator.
              </Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {accessibleModules.map(mod => (
                <TouchableOpacity
                  key={mod.id}
                  style={[
                    styles.moduleCard,
                    { backgroundColor: theme === 'dark' ? mod.darkBg : mod.bg },
                  ]}
                  onPress={() => router.push(mod.route as any)}
                  activeOpacity={0.75}
                  accessibilityLabel={`Open ${mod.title}`}
                  accessibilityRole="button"
                >
                  <View style={[styles.moduleIconBg, { backgroundColor: mod.color }]}>
                    <Ionicons name={mod.icon} size={22} color="white" />
                  </View>
                  <Text style={[styles.moduleTitle, { color: mod.color }]}>{mod.title}</Text>
                  <View style={[styles.moduleArrowBg, { backgroundColor: mod.color + '20' }]}>
                    <Ionicons name="arrow-forward" size={13} color={mod.color} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

      </ScrollView>
    </AppLayout>
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
    paddingBottom: 20,
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
    marginBottom: 12,
  },
  moduleArrowBg: {
    alignSelf: 'flex-end',
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyModules: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
});
