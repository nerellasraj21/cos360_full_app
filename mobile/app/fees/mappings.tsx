import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppLayout } from '@/components';
import { useTheme } from '@/contexts';
import { useMobilePermission } from '@/src/hooks/useMobilePermission';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';

import { AssignStudentFeesContent } from './assign-student-fees';
import { ClassMappingsContent } from './class-mappings';
import { StudentMappingsContent } from './student-mappings';

const PURPLE = '#8B5CF6';

type TabKey = 'student-mappings' | 'assign-student-fees' | 'class-mappings';

const tabs: {
  key: TabKey;
  label: string;
  resource: string;
  action: string;
}[] = [
  {
    key: 'student-mappings',
    label: 'Student Mappings',
    resource: PERMISSION_RESOURCES.FEE_STUDENT_MAPPINGS,
    action: 'list',
  },
  {
    key: 'assign-student-fees',
    label: 'Assign Student Fees',
    resource: PERMISSION_RESOURCES.FEE_STUDENT_MAPPINGS,
    action: 'list',
  },
  {
    key: 'class-mappings',
    label: 'Class Mappings',
    resource: PERMISSION_RESOURCES.FEE_CLASS_MAPPINGS,
    action: 'list',
  },
];

export default function FeeMappingsScreen() {
  const { colors, theme } = useTheme();
  const { hasPermission } = useMobilePermission();
  const { tab } = useLocalSearchParams<{ tab?: string }>();

  const [activeTab, setActiveTab] = useState<TabKey>(
    tab === 'class-mappings' || tab === 'assign-student-fees' ? tab : 'student-mappings'
  );

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';

  const canAccess = (resource: string, action: string) =>
    hasPermission ? hasPermission(resource, action) : false;

  const activeTabConfig = tabs.find(t => t.key === activeTab)!;
  const activeAllowed = canAccess(activeTabConfig.resource, activeTabConfig.action);

  return (
    <AppLayout title="Fee Mappings">
      <View style={styles.container}>
        {/* Banner */}
        <View style={[styles.banner, { backgroundColor: PURPLE }]}>
          <View style={styles.bannerDecor} />
          <View style={styles.bannerDecor2} />
          <View style={styles.bannerIcon}>
            <Ionicons name="git-merge" size={26} color="white" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Fee Mappings Management</Text>
            <Text style={styles.bannerSub}>
              Manage fee assignments for classes and individual students within the selected academic year
            </Text>
          </View>
        </View>

        {/* Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBar}
          style={styles.tabBarWrapper}
        >
          {tabs.map(t => {
            const active = t.key === activeTab;
            const allowed = canAccess(t.resource, t.action);
            return (
              <TouchableOpacity
                key={t.key}
                style={[
                  styles.tab,
                  { backgroundColor: cardBg, borderColor: borderCol },
                  active && { backgroundColor: PURPLE, borderColor: PURPLE },
                  !allowed && { opacity: 0.5 },
                ]}
                onPress={() => allowed && setActiveTab(t.key)}
                disabled={!allowed}
                activeOpacity={0.8}
              >
                {!allowed && (
                  <Ionicons name="lock-closed" size={11} color={colors['muted-foreground']} />
                )}
                <Text
                  style={[
                    styles.tabText,
                    { color: active ? 'white' : colors['muted-foreground'] },
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Active tab */}
        <View style={styles.tabContent}>
          {!activeAllowed ? (
            <View style={styles.noAccess}>
              <Ionicons name="lock-closed" size={40} color={colors['muted-foreground']} />
              <Text style={[styles.noAccessText, { color: colors['muted-foreground'] }]}>
                No access — contact admin
              </Text>
            </View>
          ) : activeTab === 'student-mappings' ? (
            <StudentMappingsContent />
          ) : activeTab === 'assign-student-fees' ? (
            <AssignStudentFeesContent />
          ) : (
            <ClassMappingsContent />
          )}
        </View>
      </View>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  banner: {
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    margin: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  bannerDecor: {
    position: 'absolute', top: -30, right: -30,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  bannerDecor2: {
    position: 'absolute', bottom: -40, right: 60,
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  bannerIcon: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  bannerTitle: { color: 'white', fontSize: 16, fontWeight: '700', marginBottom: 2 },
  bannerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 11, lineHeight: 15 },
  tabBarWrapper: { flexGrow: 0, marginBottom: 4 },
  tabBar: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 4,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  tabText: { fontSize: 12, fontWeight: '600' },
  tabContent: { flex: 1 },
  noAccess: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  noAccessText: { fontSize: 13 },
});
