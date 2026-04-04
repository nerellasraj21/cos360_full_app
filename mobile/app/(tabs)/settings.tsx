import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ConfirmModal } from '@/components/ui';
import { useQuery } from '@tanstack/react-query';

import { AppLayout, PermissionGuard, ReadPermissionGuard } from '@/components';
import { CustomDropdown } from '@/components/ui/dropdown';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAcademicYear, useAuth, useTheme } from '@/contexts';
import { academicYearsApi } from '@/src/api/masters';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';

interface SectionHeaderProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  color: string;
}

const SectionHeader = ({ icon, title, subtitle, color }: SectionHeaderProps) => (
  <View style={styles.sectionHeader}>
    <View style={[styles.sectionIconBox, { backgroundColor: color + '18' }]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
    </View>
  </View>
);

export default function SettingsScreen() {
  const { activeAcademicYearId, setActiveAcademicYearById } = useAcademicYear();
  const { role, user, logout } = useAuth();
  const { colors, theme } = useTheme();
  const router = useRouter();
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  const handleLogout = () => setShowSignOutModal(true);

  const confirmSignOut = async () => {
    setShowSignOutModal(false);
    try {
      await logout();
    } catch (e) {
      // ignore — logout clears locally regardless
    }
    router.replace('/login');
  };

  const { data: academicYearOptions = [], isLoading } = useQuery({
    queryKey: ['academicYearsDropdown'],
    queryFn: () => academicYearsApi.getAcademicYearsDropdown(),
    select: (data) =>
      data.map((item) => ({ label: item.title, value: item.id })),
  });

  const handleAcademicYearChange = (value: string | number | null) => {
    setActiveAcademicYearById(value as string);
  };

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';
  const labelColor = theme === 'dark' ? '#94a3b8' : '#6b7280';
  const textColor = colors.foreground;

  return (
    <>
    <AppLayout title="Settings">
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >

        {/* ── Academic Year ── */}
        <ReadPermissionGuard resource={PERMISSION_RESOURCES.ACADEMIC_YEARS}>
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <SectionHeader
              icon="calendar"
              title="Academic Year"
              subtitle="Select the active year for the application"
              color="#3B82F6"
            />
            <View style={styles.cardBody}>
              <PermissionGuard
                resource={PERMISSION_RESOURCES.ACADEMIC_YEARS}
                action="update"
                disabled={true}
                fallback={
                  <View style={{ opacity: 0.6 }}>
                    <CustomDropdown
                      data={academicYearOptions}
                      placeholder="Select Academic Year"
                      value={activeAcademicYearId}
                      onChange={() => {}}
                      disabled={true}
                      search={false}
                    />
                    <View style={styles.lockedRow}>
                      <Ionicons name="lock-closed" size={13} color={labelColor} />
                      <Text style={[styles.lockedText, { color: labelColor }]}>
                        View only — contact admin to change
                      </Text>
                    </View>
                  </View>
                }
              >
                <CustomDropdown
                  data={academicYearOptions}
                  placeholder="Select Academic Year"
                  value={activeAcademicYearId}
                  onChange={handleAcademicYearChange}
                  disabled={isLoading}
                  search={false}
                />
              </PermissionGuard>
            </View>
          </View>
        </ReadPermissionGuard>

        {/* ── Appearance ── */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
          <SectionHeader
            icon="color-palette"
            title="Appearance"
            subtitle="Customize the app look and feel"
            color="#8B5CF6"
          />
          <View style={[styles.cardBody, styles.rowItem, { borderTopColor: borderCol }]}>
            <View style={styles.rowLeft}>
              <View style={[styles.rowIconBox, { backgroundColor: theme === 'dark' ? '#1e1b4b' : '#f5f3ff' }]}>
                <Ionicons
                  name={theme === 'dark' ? 'moon' : 'sunny'}
                  size={18}
                  color="#8B5CF6"
                />
              </View>
              <View>
                <Text style={[styles.rowLabel, { color: textColor }]}>Theme Mode</Text>
                <Text style={[styles.rowSub, { color: labelColor }]}>
                  {theme === 'dark' ? 'Dark mode is on' : 'Light mode is on'}
                </Text>
              </View>
            </View>
            <ThemeToggle />
          </View>
        </View>

        {/* ── Account Information ── */}
        {(role || user) && (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <SectionHeader
              icon="person-circle"
              title="Account"
              subtitle="Your profile and access information"
              color="#10B981"
            />

            {/* Username row */}
            {user?.username && (
              <View style={[styles.infoRow, { borderTopColor: borderCol }]}>
                <View style={styles.infoLeft}>
                  <Ionicons name="person-outline" size={16} color={labelColor} />
                  <Text style={[styles.infoLabel, { color: labelColor }]}>Username</Text>
                </View>
                <Text style={[styles.infoValue, { color: textColor }]}>{user.username}</Text>
              </View>
            )}

            {/* Email row */}
            {user?.email && (
              <View style={[styles.infoRow, { borderTopColor: borderCol }]}>
                <View style={styles.infoLeft}>
                  <Ionicons name="mail-outline" size={16} color={labelColor} />
                  <Text style={[styles.infoLabel, { color: labelColor }]}>Email</Text>
                </View>
                <Text style={[styles.infoValue, { color: textColor }]} numberOfLines={1}>
                  {user.email}
                </Text>
              </View>
            )}

            {/* Role row */}
            {role?.name && (
              <View style={[styles.infoRow, { borderTopColor: borderCol }]}>
                <View style={styles.infoLeft}>
                  <Ionicons name="shield-checkmark-outline" size={16} color={labelColor} />
                  <Text style={[styles.infoLabel, { color: labelColor }]}>Role</Text>
                </View>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>{role.name}</Text>
                </View>
              </View>
            )}

            {/* Status row */}
            {user && (
              <View style={[styles.infoRow, { borderTopColor: borderCol }]}>
                <View style={styles.infoLeft}>
                  <Ionicons name="checkmark-circle-outline" size={16} color={labelColor} />
                  <Text style={[styles.infoLabel, { color: labelColor }]}>Status</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: user.is_active ? '#dcfce7' : '#fee2e2' }]}>
                  <View style={[styles.statusDot, { backgroundColor: user.is_active ? '#16a34a' : '#ef4444' }]} />
                  <Text style={[styles.statusText, { color: user.is_active ? '#16a34a' : '#ef4444' }]}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ── App Info ── */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
          <SectionHeader
            icon="information-circle"
            title="About"
            subtitle="Application version and info"
            color="#F59E0B"
          />
          <View style={[styles.infoRow, { borderTopColor: borderCol }]}>
            <View style={styles.infoLeft}>
              <Ionicons name="apps-outline" size={16} color={labelColor} />
              <Text style={[styles.infoLabel, { color: labelColor }]}>Application</Text>
            </View>
            <Text style={[styles.infoValue, { color: textColor }]}>COS360</Text>
          </View>
          <View style={[styles.infoRow, { borderTopColor: borderCol }]}>
            <View style={styles.infoLeft}>
              <Ionicons name="code-slash-outline" size={16} color={labelColor} />
              <Text style={[styles.infoLabel, { color: labelColor }]}>Version</Text>
            </View>
            <Text style={[styles.infoValue, { color: textColor }]}>1.0.0</Text>
          </View>
        </View>

        {/* ── Logout ── */}
        <TouchableOpacity
          style={[styles.logoutBtn, { borderColor: '#fee2e2' }]}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </AppLayout>
    <ConfirmModal
      visible={showSignOutModal}
      title="Sign Out"
      message="Are you sure you want to sign out?"
      confirmText="Sign Out"
      cancelText="Cancel"
      destructive
      onConfirm={confirmSignOut}
      onCancel={() => setShowSignOutModal(false)}
    />
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  sectionIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 16,
  },
  cardBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  lockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
  },
  lockedText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  rowIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  rowSub: {
    fontSize: 12,
    marginTop: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    maxWidth: '55%',
    textAlign: 'right',
  },
  roleBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  roleBadgeText: {
    color: '#3b82f6',
    fontSize: 13,
    fontWeight: '700',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 5,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 15,
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: '#fff1f2',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ef4444',
  },
});
