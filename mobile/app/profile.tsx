import { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { ConfirmModal } from '@/components/ui';
import { useRouter } from 'expo-router';
import { useAuth, useTheme } from '@/contexts';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import AppHeader from '@/components/AppHeader';
import AppFooter from '@/components/AppFooter';
import { PermissionGuard, OwnResourcePermissionGuard } from '@/components';
import {
  StudentProfileView,
  StudentProfileForm,
  StaffProfileView,
  StaffProfileForm,
  ParentProfileView,
  ParentProfileForm,
  FallbackProfileView,
} from '@/components/profile';
import {
  useStudentProfile,
  useStaffProfile,
  useParentProfile,
} from '@/src/api/hooks/profile';

export default function ProfileScreen() {
  const { user, logout, role } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Determine user role
  const roleName = role?.name?.toLowerCase();
  const isStudent = roleName === 'student';
  const isStaff = roleName === 'staff' || roleName === 'teacher' || roleName === 'admin';
  const isParent = roleName === 'parent' || roleName === 'guardian' || roleName === 'father' || roleName === 'mother';

  // Conditionally fetch profile data based on role
  const studentQuery = useStudentProfile({ enabled: isStudent });
  const staffQuery = useStaffProfile({ enabled: isStaff });
  const parentQuery = useParentProfile({ enabled: isParent });

  // Determine which query to use
  let profileQuery: any;
  let ProfileViewComponent: any;
  let ProfileFormComponent: any;
  let profileResource: string;

  if (isStudent) {
    profileQuery = studentQuery;
    ProfileViewComponent = StudentProfileView;
    ProfileFormComponent = StudentProfileForm;
    profileResource = 'profile';
  } else if (isStaff) {
    profileQuery = staffQuery;
    ProfileViewComponent = StaffProfileView;
    ProfileFormComponent = StaffProfileForm;
    profileResource = 'profile';
  } else if (isParent) {
    profileQuery = parentQuery;
    ProfileViewComponent = ParentProfileView;
    ProfileFormComponent = ParentProfileForm;
    profileResource = 'profile';
  } else {
    // Fallback for unknown roles
    profileQuery = { data: null, isLoading: false, error: new Error('Unknown role'), refetch: () => {} };
    ProfileViewComponent = null;
    ProfileFormComponent = null;
    profileResource = 'profile';
  }

  const handleLogout = () => setShowLogoutModal(true);

  const confirmLogout = async () => {
    setShowLogoutModal(false);
    try {
      await logout();
    } catch (e) {
      // ignore — clears locally regardless
    }
    router.replace('/login');
  };

  if (!user) {
    return (
      <ThemedView style={styles.container}>
        <AppHeader title="Profile" />
        <View style={styles.centerContent}>
          <ThemedText style={styles.errorText}>User not found</ThemedText>
        </View>
        <AppFooter />
      </ThemedView>
    );
  }

  return (
    <>
    <PermissionGuard
      permissions={[
        ['profile', 'read_own'],
      ]}
      requireAll={false}
      fallback={
        <ThemedView style={styles.container}>
          <AppHeader title="Profile" />
          <View style={styles.content}>
            <FallbackProfileView user={user} role={role} />
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={[styles.actionButton, styles.logoutButton]}
                onPress={handleLogout}
              >
                <IconSymbol name="arrow.right.square" size={20} color="white" />
                <ThemedText style={styles.logoutButtonText}>Logout</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
          <AppFooter />
        </ThemedView>
      }
    >
      <ThemedView style={styles.container}>
        <AppHeader title="Profile" />

        <View style={styles.content}>
          {profileQuery.isLoading ? (
            <View style={styles.centerContent}>
              <ActivityIndicator size="large" color={colors.primary} />
              <ThemedText style={[styles.loadingText, { color: colors['muted-foreground'] }]}>Loading profile...</ThemedText>
            </View>
          ) : profileQuery.error || showFallback ? (
            showFallback || profileQuery.error?.response?.status === 404 ? (
              <>
                <FallbackProfileView user={user} role={role} />
                <View style={styles.actionsContainer}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.logoutButton]}
                    onPress={handleLogout}
                  >
                    <IconSymbol name="arrow.right.square" size={20} color="white" />
                    <ThemedText style={styles.logoutButtonText}>Logout</ThemedText>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.centerContent}>
                <IconSymbol name="exclamationmark.triangle" size={48} color={colors.destructive} />
                <ThemedText style={[styles.errorText, { color: colors.destructive }]}>
                  Failed to load profile information
                </ThemedText>
                <ThemedText style={[styles.errorSubtext, { color: colors['muted-foreground'] }]}>
                  {profileQuery.error?.message || 'Please try again later'}
                </ThemedText>
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[styles.retryButton, { backgroundColor: colors.primary }]}
                    onPress={() => profileQuery.refetch?.()}
                  >
                    <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.retryButton, { backgroundColor: colors.secondary, marginLeft: 12 }]}
                    onPress={() => setShowFallback(true)}
                  >
                    <ThemedText style={styles.retryButtonText}>Basic Profile</ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            )
          ) : !profileQuery.data || !ProfileViewComponent || !ProfileFormComponent ? (
            <View style={styles.centerContent}>
              <IconSymbol name="person.fill.questionmark" size={48} color={colors['muted-foreground']} />
              <ThemedText style={[styles.errorText, { color: colors.destructive }]}>
                Profile not available for your role
              </ThemedText>
              <ThemedText style={[styles.errorSubtext, { color: colors['muted-foreground'] }]}>
                Please contact your administrator.
              </ThemedText>
            </View>
          ) : (
            <>
              {isEditing ? (
                <ProfileFormComponent
                  profile={profileQuery.data}
                  onCancel={() => setIsEditing(false)}
                />
              ) : (
                <ProfileViewComponent profile={profileQuery.data} />
              )}

              {/* Action Buttons */}
              <View style={styles.actionsContainer}>
                {!isEditing && (
                  <OwnResourcePermissionGuard
                    resource={profileResource as any}
                    action="update_own"
                  >
                    <TouchableOpacity
                      style={[styles.actionButton, styles.editButton, { backgroundColor: colors.primary }]}
                      onPress={() => setIsEditing(true)}
                    >
                      <IconSymbol name="pencil" size={20} color="white" />
                      <ThemedText style={styles.editButtonText}>Edit Profile</ThemedText>
                    </TouchableOpacity>
                  </OwnResourcePermissionGuard>
                )}

                <TouchableOpacity
                  style={[styles.actionButton, styles.logoutButton, { backgroundColor: colors.destructive }]}
                  onPress={handleLogout}
                >
                  <IconSymbol name="arrow.right.square" size={20} color="white" />
                  <ThemedText style={styles.logoutButtonText}>Logout</ThemedText>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        <AppFooter />
      </ThemedView>
    </PermissionGuard>
    <ConfirmModal
      visible={showLogoutModal}
      title="Logout"
      message="Are you sure you want to logout?"
      confirmText="Logout"
      cancelText="Cancel"
      destructive
      onConfirm={confirmLogout}
      onCancel={() => setShowLogoutModal(false)}
    />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '600',
  },
  errorSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 12,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionsContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  editButton: {
    // backgroundColor set dynamically
  },
  editButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  logoutButton: {
    // backgroundColor set dynamically
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});