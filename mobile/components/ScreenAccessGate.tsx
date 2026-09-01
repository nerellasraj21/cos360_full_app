import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import AppLayout from './AppLayout';
import { useAuth, useTheme } from '@/contexts';
import {
  PERMISSION_ACTIONS,
  type PermissionResource,
  type PermissionTuple,
} from '../src/types/permissions';

/**
 * Screen-level access gate — the single place a whole screen is allowed or denied.
 *
 * Rules source of truth: `docs/USER_ROLES_WORKFLOW.md` (role matrix +
 * "Screen → Permission Mapping") and the web app's route guards.
 *
 * Two independent checks, evaluated in order:
 *   1. `blockRoles` — hard role block mirroring the web's `beforeLoad` redirects
 *      (e.g. `_app/fee.tsx` sends `teacher` back to the dashboard).
 *   2. permission check — access is granted when the user holds ANY of
 *      `read`/`list` on ANY listed `resources`, plus any explicit `permissions`
 *      tuples (use these for `read_own`, `approve`, … ). `requireAll` flips it
 *      to ALL-of semantics.
 *
 * Denied users get an in-layout "Access Denied" panel (header + drawer stay
 * usable) rather than a blank screen.
 */
interface ScreenAccessGateProps {
  children: React.ReactNode;
  /** Resources gating the screen — `read` OR `list` on any of them grants access. */
  resources?: PermissionResource[];
  /** Extra permission tuples OR-ed into the check (e.g. `['profile', 'read_own']`). */
  permissions?: PermissionTuple[];
  /** Require every listed permission instead of any one of them. */
  requireAll?: boolean;
  /** Lowercase role names that are redirected away from this screen entirely. */
  blockRoles?: string[];
  /** Where a blocked role lands. Defaults to the dashboard. */
  redirectTo?: string;
  /** Title for the header shown around the Access Denied panel. */
  title?: string;
  /** Optional override for the Access Denied body copy. */
  message?: string;
}

export const ScreenAccessGate: React.FC<ScreenAccessGateProps> = ({
  children,
  resources,
  permissions,
  requireAll = false,
  blockRoles,
  redirectTo = '/(tabs)',
  title,
  message = "You don't have permission to view this screen. Please contact your administrator.",
}) => {
  const router = useRouter();
  const { colors } = useTheme();
  const { hasPermission, isLoading, role } = useAuth();

  const roleName = role?.name?.toLowerCase() ?? '';
  const isRoleBlocked = !!blockRoles?.includes(roleName);

  // Web parity: a blocked role never sees the screen, it is bounced away.
  useEffect(() => {
    if (isRoleBlocked) {
      router.replace(redirectTo as any);
    }
  }, [isRoleBlocked, redirectTo, router]);

  const required = useMemo<PermissionTuple[]>(() => {
    const fromResources = (resources ?? []).flatMap(
      resource =>
        [
          [resource, PERMISSION_ACTIONS.READ],
          [resource, PERMISSION_ACTIONS.LIST],
        ] as PermissionTuple[],
    );
    return [...fromResources, ...(permissions ?? [])];
  }, [resources, permissions]);

  const hasAccess = useMemo(() => {
    if (isLoading) return false;
    if (required.length === 0) return true;
    return requireAll
      ? required.every(([resource, action]) => hasPermission(resource, action))
      : required.some(([resource, action]) => hasPermission(resource, action));
  }, [isLoading, required, requireAll, hasPermission]);

  if (isRoleBlocked) {
    return null;
  }

  if (isLoading) {
    return (
      <AppLayout title={title}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#556ee6" />
          <Text style={[styles.message, { color: colors['muted-foreground'] }]}>
            Checking permissions...
          </Text>
        </View>
      </AppLayout>
    );
  }

  if (!hasAccess) {
    return (
      <AppLayout title={title}>
        <View style={styles.centered}>
          <Ionicons name="lock-closed" size={64} color={colors['muted-foreground']} />
          <Text style={[styles.deniedTitle, { color: colors.foreground }]}>Access Denied</Text>
          <Text style={[styles.message, { color: colors['muted-foreground'] }]}>{message}</Text>
        </View>
      </AppLayout>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  deniedTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});

export default ScreenAccessGate;
