import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { rolesApi, permissionsApi } from '@/src/api';
import type { Role, RoleCreate, RoleUpdate, Permission, PermissionCreate, PermissionUpdate, PermissionMatrix, AvailableResources, AvailableActions } from '@/src/api';
import { useTheme } from '@/contexts';
import { PermissionGuard, ReadOrListPermissionGuard } from '@/components/PermissionGuards';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';


export default function RolesPermissionsScreen() {
  const [activeTab, setActiveTab] = useState<'roles' | 'permissions' | 'matrix'>('roles');
  const [isRoleModalVisible, setIsRoleModalVisible] = useState(false);
  const [isPermissionModalVisible, setIsPermissionModalVisible] = useState(false);
  const [isBulkModalVisible, setIsBulkModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const [roleForm, setRoleForm] = useState({
    name: '',
    description: '',
    is_active: true,
  });
  const [permissionForm, setPermissionForm] = useState({
    role_id: '',
    resource: '',
    action: '',
    is_granted: true,
  });
  const [bulkForm, setBulkForm] = useState({
    role_id: '',
    permissions: [] as Array<{ resource: string; action: string; is_granted: boolean }>,
  });

  const router = useRouter();
  // const colorScheme = useColorScheme();
  // const theme = colorScheme === 'dark' ? 'dark' : 'light';
  const { theme, colors } = useTheme();
  const themeColors = Colors[theme];

  const queryClient = useQueryClient();

  // Fetch roles
  const { data: roles = [], isLoading: rolesLoading, refetch: refetchRoles, error: rolesError } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesApi.getRoles(),
  });

  // Fetch permissions with pagination
  const [permissionsPage, setPermissionsPage] = useState(0);
  const [permissionsPageSize, setPermissionsPageSize] = useState(25);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('');
  const [selectedMatrixRoleFilter, setSelectedMatrixRoleFilter] = useState<string>('');

  const { data: permissionsData, isLoading: permissionsLoading, refetch: refetchPermissions, error: permissionsError } = useQuery({
    queryKey: ['resource-permissions', 'paginated', permissionsPage, permissionsPageSize, selectedRoleFilter],
    queryFn: () => {
      const params: any = {
        skip: permissionsPage * permissionsPageSize,
        limit: permissionsPageSize,
      };
      if (selectedRoleFilter) {
        params.role_id = selectedRoleFilter;
      }
      return permissionsApi.getPermissions(params);
    },
  });

  const permissions = permissionsData?.items || [];
  const totalPermissions = permissionsData?.total_count || 0;
  const hasNextPermissions = permissionsData?.has_next || false;

  // Fetch permission matrix
  const { data: permissionMatrix, isLoading: matrixLoading, refetch: refetchMatrix } = useQuery({
    queryKey: ['permissionMatrix'],
    queryFn: () => permissionsApi.getPermissionMatrix(),
  });

  // Fetch available resources and actions
  const { data: availableResourcesData } = useQuery({
    queryKey: ['availableResources'],
    queryFn: () => permissionsApi.getAvailableResources(),
    retry: false,
  });

  const { data: availableActionsData } = useQuery({
    queryKey: ['availableActions'],
    queryFn: () => permissionsApi.getAvailableActions(),
    retry: false,
  });

  // Fallback data for available resources and actions
  const fallbackResources = [
    'academic_years', 'classes', 'sections', 'subjects', 'students',
    'staff', 'fee_categories', 'fee_types', 'fee_terms', 'transport',
    'certificates', 'documents', 'attendance', 'timetable'
  ];

  const fallbackActions = [
    'create', 'read', 'update', 'delete', 'list', 'approve'
  ];

  // Extract resources and actions from API response
  const extractResources = (data: any): string[] => {
    if (!data) return fallbackResources;
    if (Array.isArray(data)) {
      return data.map((item: any) => typeof item === 'string' ? item : item.resource);
    }
    if (data.resources && Array.isArray(data.resources)) {
      return data.resources.map((item: any) => typeof item === 'string' ? item : item.resource);
    }
    return fallbackResources;
  };

  const extractActions = (data: any): string[] => {
    if (!data) return fallbackActions;
    if (Array.isArray(data)) {
      return data.map((item: any) => typeof item === 'string' ? item : item.action);
    }
    if (data.actions && Array.isArray(data.actions)) {
      return data.actions.map((item: any) => typeof item === 'string' ? item : item.action);
    }
    return fallbackActions;
  };

  const availableResources = extractResources(availableResourcesData);
  const availableActions = extractActions(availableActionsData);

  // Mutations
  const createRoleMutation = useMutation({
    mutationFn: (data: RoleCreate) => rolesApi.createRole(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['permissionMatrix'] });
      setIsRoleModalVisible(false);
      resetRoleForm();
      Alert.alert('Success', 'Role created successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to create role');
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: RoleUpdate }) => rolesApi.updateRole(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['permissionMatrix'] });
      setIsRoleModalVisible(false);
      setEditingRole(null);
      resetRoleForm();
      Alert.alert('Success', 'Role updated successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to update role');
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: (id: string) => rolesApi.deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['permissionMatrix'] });
      Alert.alert('Success', 'Role deleted successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to delete role');
    },
  });

  const createPermissionMutation = useMutation({
    mutationFn: (data: PermissionCreate) => permissionsApi.createPermission(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['permissionMatrix'] });
      setIsPermissionModalVisible(false);
      resetPermissionForm();
      Alert.alert('Success', 'Permission created successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to create permission');
    },
  });

  const updatePermissionMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: PermissionUpdate }) => permissionsApi.updatePermission(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['permissionMatrix'] });
      setIsPermissionModalVisible(false);
      setEditingPermission(null);
      resetPermissionForm();
      Alert.alert('Success', 'Permission updated successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to update permission');
    },
  });

  const deletePermissionMutation = useMutation({
    mutationFn: (id: string) => permissionsApi.deletePermission(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['permissionMatrix'] });
      Alert.alert('Success', 'Permission deleted successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to delete permission');
    },
  });

  const bulkCreatePermissionsMutation = useMutation({
    mutationFn: (data: typeof bulkForm) => permissionsApi.bulkCreatePermissions(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['permissionMatrix'] });
      setIsBulkModalVisible(false);
      resetBulkForm();
      Alert.alert('Success', 'Permissions created successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to create permissions');
    },
  });

  const resetRoleForm = () => {
    setRoleForm({
      name: '',
      description: '',
      is_active: true,
    });
  };

  const resetPermissionForm = () => {
    setPermissionForm({
      role_id: '',
      resource: '',
      action: '',
      is_granted: true,
    });
  };

  const resetBulkForm = () => {
    setBulkForm({
      role_id: '',
      permissions: [],
    });
  };

  const handleCreateRole = () => {
    if (!roleForm.name.trim()) {
      Alert.alert('Error', 'Role name is required');
      return;
    }
    createRoleMutation.mutate(roleForm);
  };

  const handleUpdateRole = () => {
    if (!editingRole || !roleForm.name.trim()) {
      Alert.alert('Error', 'Role name is required');
      return;
    }
    updateRoleMutation.mutate({ id: editingRole.id, data: roleForm });
  };

  const handleDeleteRole = (role: Role) => {
    Alert.alert(
      'Delete Role',
      `Are you sure you want to delete "${role.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteRoleMutation.mutate(role.id),
        },
      ]
    );
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setRoleForm({
      name: role.name,
      description: role.description || '',
      is_active: role.is_active,
    });
    setIsRoleModalVisible(true);
  };

  const handleCreatePermission = () => {
    if (!permissionForm.role_id || !permissionForm.resource || !permissionForm.action) {
      Alert.alert('Error', 'All fields are required');
      return;
    }
    createPermissionMutation.mutate(permissionForm);
  };

  const handleUpdatePermission = () => {
    if (!editingPermission) return;
    updatePermissionMutation.mutate({ id: editingPermission.id, data: permissionForm });
  };

  const handleDeletePermission = (permission: Permission) => {
    Alert.alert(
      'Delete Permission',
      `Are you sure you want to delete this permission?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deletePermissionMutation.mutate(permission.id),
        },
      ]
    );
  };

  const handleEditPermission = (permission: Permission) => {
    setEditingPermission(permission);
    setPermissionForm({
      role_id: permission.role_id,
      resource: permission.resource,
      action: permission.action,
      is_granted: permission.is_granted,
    });
    setIsPermissionModalVisible(true);
  };

  const handleBulkCreatePermissions = () => {
    if (!bulkForm.role_id || bulkForm.permissions.length === 0) {
      Alert.alert('Error', 'Please select a role and add at least one permission');
      return;
    }
    bulkCreatePermissionsMutation.mutate(bulkForm);
  };

  const addBulkPermission = (resource: string, action: string, is_granted: boolean) => {
    setBulkForm(prev => ({
      ...prev,
      permissions: [...prev.permissions, { resource, action, is_granted }],
    }));
  };

  const removeBulkPermission = (index: number) => {
    setBulkForm(prev => ({
      ...prev,
      permissions: prev.permissions.filter((_, i) => i !== index),
    }));
  };

  const getResourceIcon = (resource: string) => {
    switch (resource) {
      case 'academic_years':
        return 'school';
      case 'classes':
      case 'sections':
      case 'subjects':
        return 'book';
      case 'students':
        return 'people';
      case 'staff':
        return 'person';
      case 'timetables':
        return 'time';
      case 'transport':
        return 'bus';
      default:
        return 'settings';
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create':
        return '#10B981';
      case 'read':
        return '#3B82F6';
      case 'update':
        return '#F59E0B';
      case 'delete':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getRoleColor = (roleName: string) => {
    switch (roleName.toLowerCase()) {
      case 'admin':
        return '#EF4444';
      case 'teacher':
        return '#3B82F6';
      case 'student':
        return '#10B981';
      case 'parent':
        return '#F59E0B';
      default:
        return '#6B7280';
    }
  };

  const getRoleDescription = (roleName: string) => {
    switch (roleName.toLowerCase()) {
      case 'admin':
        return 'Full system access with all permissions';
      case 'teacher':
        return 'Teaching staff with limited administrative access';
      case 'student':
        return 'Basic access for student activities';
      case 'parent':
        return 'Access to child-related information';
      default:
        return 'Custom role with specific permissions';
    }
  };

  const renderRoleItem = useCallback(({ item }: { item: Role }) => (
    <View style={[styles.roleCard, { backgroundColor: themeColors.card }]}>
      <View style={styles.roleHeader}>
        <View style={styles.roleInfo}>
          <ThemedText type="subtitle" style={styles.roleName}>
            {item.name}
          </ThemedText>
          <View style={[styles.statusBadge, { backgroundColor: item.is_active ? '#10B981' : '#EF4444' }]}>
            <ThemedText style={styles.statusText}>
              {item.is_active ? 'Active' : 'Inactive'}
            </ThemedText>
          </View>
        </View>
        <View style={styles.actionButtons}>
          <PermissionGuard resourceConstant={PERMISSION_RESOURCES.ROLES_PERMISSIONS} actionConstant="update">
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: themeColors.primary }]}
              onPress={() => handleEditRole(item)}
            >
              <Ionicons name="create" size={16} color="white" />
            </TouchableOpacity>
          </PermissionGuard>
          <PermissionGuard resourceConstant={PERMISSION_RESOURCES.ROLES_PERMISSIONS} actionConstant="delete">
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
              onPress={() => handleDeleteRole(item)}
              disabled={item.name === 'Admin'}
            >
              <Ionicons name="trash" size={16} color="white" />
            </TouchableOpacity>
          </PermissionGuard>
        </View>
      </View>

      {item.description && (
        <ThemedText style={styles.roleDescription}>
          {item.description}
        </ThemedText>
      )}

      <ThemedText style={styles.roleDate}>
        Created: {new Date(item.created_at).toLocaleDateString()}
      </ThemedText>
    </View>
  ), [themeColors]);

  const renderPermissionItem = useCallback(({ item }: { item: Permission }) => (
    <View style={[styles.permissionCard, { backgroundColor: themeColors.card }]}>
      <View style={styles.permissionHeader}>
        <View style={styles.permissionInfo}>
          <View style={styles.resourceRow}>
            <Ionicons name={getResourceIcon(item.resource)} size={20} color={themeColors.primary} />
            <ThemedText type="subtitle" style={styles.resourceText}>
              {item.resource.replace('_', ' ')}
            </ThemedText>
          </View>
          <View style={[styles.actionBadge, { backgroundColor: getActionColor(item.action) }]}>
            <ThemedText style={styles.actionText}>
              {item.action}
            </ThemedText>
          </View>
        </View>
        <View style={styles.permissionActions}>
          <PermissionGuard resourceConstant={PERMISSION_RESOURCES.ROLES_PERMISSIONS} actionConstant="update">
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: themeColors.primary }]}
              onPress={() => handleEditPermission(item)}
            >
              <Ionicons name="create" size={16} color="white" />
            </TouchableOpacity>
          </PermissionGuard>
          <PermissionGuard resourceConstant={PERMISSION_RESOURCES.ROLES_PERMISSIONS} actionConstant="delete">
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
              onPress={() => handleDeletePermission(item)}
            >
              <Ionicons name="trash" size={16} color="white" />
            </TouchableOpacity>
          </PermissionGuard>
        </View>
      </View>

      <View style={styles.permissionDetails}>
        <ThemedText style={styles.roleLabel}>
          Role: {item.role_name || item.role_id}
        </ThemedText>
        <View style={styles.grantedIndicator}>
          <Ionicons
            name={item.is_granted ? "checkmark-circle" : "close-circle"}
            size={16}
            color={item.is_granted ? '#10B981' : '#EF4444'}
          />
          <ThemedText style={[styles.grantedText, { color: item.is_granted ? '#10B981' : '#EF4444' }]}>
            {item.is_granted ? 'Granted' : 'Denied'}
          </ThemedText>
        </View>
      </View>
    </View>
  ), [themeColors]);

  const renderTabButton = (tab: 'roles' | 'permissions' | 'matrix', label: string) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
      onPress={() => setActiveTab(tab)}
    >
      <ThemedText style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
        {label}
      </ThemedText>
    </TouchableOpacity>
  );

  return (
    <ReadOrListPermissionGuard
      resource={PERMISSION_RESOURCES.ROLES_PERMISSIONS}
      fallback={
        <ThemedView style={styles.container}>
          <View style={styles.centerContainer}>
            <ThemedText type="title">Access Denied</ThemedText>
            <ThemedText>You don't have permission to view roles and permissions</ThemedText>
          </View>
        </ThemedView>
      }
    >
      <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={themeColors['card-foreground']} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <ThemedText type="title">Roles & Permissions</ThemedText>
          <ThemedText style={styles.subtitle}>
            Manage user roles and access permissions
          </ThemedText>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {renderTabButton('roles', 'Roles')}
        {renderTabButton('permissions', 'Permissions')}
        {renderTabButton('matrix', 'Matrix')}
      </View>

      {/* Content */}
      {activeTab === 'roles' && (
        <View style={styles.contentContainer}>
          <View style={styles.contentHeader}>
            <PermissionGuard resourceConstant={PERMISSION_RESOURCES.ROLES_PERMISSIONS} actionConstant="create">
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: themeColors.primary }]}
                onPress={() => {
                  resetRoleForm();
                  setEditingRole(null);
                  setIsRoleModalVisible(true);
                }}
              >
                <Ionicons name="add" size={20} color="white" />
                <ThemedText style={styles.addButtonText}>Add Role</ThemedText>
              </TouchableOpacity>
            </PermissionGuard>
          </View>

          {rolesError && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={24} color="#EF4444" />
              <ThemedText style={styles.errorText}>
                Failed to load roles: {rolesError.message || 'Unknown error'}
              </ThemedText>
            </View>
          )}

          <FlatList
            data={roles}
            renderItem={renderRoleItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={rolesLoading}
                onRefresh={refetchRoles}
                tintColor={themeColors.primary}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="people" size={64} color={themeColors['muted-foreground']} />
                <ThemedText type="subtitle" style={styles.emptyTitle}>
                  No Roles Found
                </ThemedText>
                <ThemedText style={styles.emptyText}>
                  Add your first role to get started
                </ThemedText>
              </View>
            }
          />
        </View>
      )}

      {activeTab === 'permissions' && (
        <View style={styles.contentContainer}>
          <View style={styles.contentHeader}>
            <View style={styles.headerActions}>
              <PermissionGuard resourceConstant={PERMISSION_RESOURCES.ROLES_PERMISSIONS} actionConstant="create">
                <TouchableOpacity
                  style={[styles.addButton, { backgroundColor: themeColors.primary }]}
                  onPress={() => {
                    resetPermissionForm();
                    setEditingPermission(null);
                    setIsPermissionModalVisible(true);
                  }}
                >
                  <Ionicons name="add" size={20} color="white" />
                  <ThemedText style={styles.addButtonText}>Add Permission</ThemedText>
                </TouchableOpacity>
              </PermissionGuard>

              <PermissionGuard resourceConstant={PERMISSION_RESOURCES.ROLES_PERMISSIONS} actionConstant="create">
                <TouchableOpacity
                  style={[styles.bulkButton, { backgroundColor: '#10B981' }]}
                  onPress={() => setIsBulkModalVisible(true)}
                >
                  <Ionicons name="add-circle" size={20} color="white" />
                  <ThemedText style={styles.addButtonText}>Bulk Create</ThemedText>
                </TouchableOpacity>
              </PermissionGuard>
            </View>

            {/* Role Filter */}
            <View style={styles.filterContainer}>
              <ThemedText style={styles.filterLabel}>Filter by Role:</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterOptions}>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    { borderColor: themeColors.border },
                    !selectedRoleFilter && { borderColor: themeColors.primary, backgroundColor: themeColors.primary + '20' }
                  ]}
                  onPress={() => setSelectedRoleFilter('')}
                >
                  <ThemedText style={[
                    styles.filterOptionText,
                    !selectedRoleFilter && { color: themeColors.primary, fontWeight: '600' }
                  ]}>
                    All Roles
                  </ThemedText>
                </TouchableOpacity>
                {Array.isArray(roles) && roles.map(role => (
                  <TouchableOpacity
                    key={role.id}
                    style={[
                      styles.filterOption,
                      { borderColor: themeColors.border },
                      selectedRoleFilter === role.id && { borderColor: themeColors.primary, backgroundColor: themeColors.primary + '20' }
                    ]}
                    onPress={() => setSelectedRoleFilter(role.id)}
                  >
                    <ThemedText style={[
                      styles.filterOptionText,
                      selectedRoleFilter === role.id && { color: themeColors.primary, fontWeight: '600' }
                    ]}>
                      {role.name}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          {permissionsError && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={24} color="#EF4444" />
              <ThemedText style={styles.errorText}>
                Failed to load permissions: {permissionsError.message || 'Unknown error'}
              </ThemedText>
            </View>
          )}

          <FlatList
            data={permissions}
            renderItem={renderPermissionItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={permissionsLoading}
                onRefresh={refetchPermissions}
                tintColor={themeColors.primary}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="shield" size={64} color={themeColors['muted-foreground']} />
                <ThemedText type="subtitle" style={styles.emptyTitle}>
                  No Permissions Found
                </ThemedText>
                <ThemedText style={styles.emptyText}>
                  Add your first permission to get started
                </ThemedText>
              </View>
            }
          />

          {/* Pagination Controls */}
          {totalPermissions > permissionsPageSize && (
            <View style={styles.paginationContainer}>
              <TouchableOpacity
                style={[styles.paginationButton, { backgroundColor: themeColors.card }]}
                onPress={() => setPermissionsPage(Math.max(0, permissionsPage - 1))}
                disabled={permissionsPage === 0}
              >
                <Ionicons name="chevron-back" size={20} color={permissionsPage === 0 ? themeColors['muted-foreground'] : themeColors.primary} />
                <ThemedText style={[styles.paginationText, { color: permissionsPage === 0 ? themeColors['muted-foreground'] : themeColors.primary }]}>
                  Previous
                </ThemedText>
              </TouchableOpacity>

              <View style={styles.paginationInfo}>
                <ThemedText style={styles.paginationInfoText}>
                  {permissionsPage * permissionsPageSize + 1}-{Math.min((permissionsPage + 1) * permissionsPageSize, totalPermissions)} of {totalPermissions}
                </ThemedText>
              </View>

              <TouchableOpacity
                style={[styles.paginationButton, { backgroundColor: themeColors.card }]}
                onPress={() => setPermissionsPage(permissionsPage + 1)}
                disabled={!hasNextPermissions}
              >
                <ThemedText style={[styles.paginationText, { color: !hasNextPermissions ? themeColors['muted-foreground'] : themeColors.primary }]}>
                  Next
                </ThemedText>
                <Ionicons name="chevron-forward" size={20} color={!hasNextPermissions ? themeColors['muted-foreground'] : themeColors.primary} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {activeTab === 'matrix' && (
        <ScrollView
          style={styles.matrixContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={matrixLoading}
              onRefresh={refetchMatrix}
              tintColor={themeColors.primary}
            />
          }
        >
          {permissionMatrix && permissionMatrix.length > 0 ? (
            <View style={styles.matrixContent}>
              <ThemedText type="subtitle" style={styles.matrixTitle}>
                Permission Overview
              </ThemedText>
              <ThemedText style={styles.matrixSubtitle}>
                Visual representation of role permissions across all resources
              </ThemedText>

              {/* Role Filter for Matrix */}
              <View style={styles.filterContainer}>
                <ThemedText style={styles.filterLabel}>Filter by Role:</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterOptions}>
                  <TouchableOpacity
                    style={[
                      styles.filterOption,
                      { borderColor: themeColors.border },
                      !selectedMatrixRoleFilter && { borderColor: themeColors.primary, backgroundColor: themeColors.primary + '20' }
                    ]}
                    onPress={() => setSelectedMatrixRoleFilter('')}
                  >
                    <ThemedText style={[
                      styles.filterOptionText,
                      !selectedMatrixRoleFilter && { color: themeColors.primary, fontWeight: '600' }
                    ]}>
                      All Roles
                    </ThemedText>
                  </TouchableOpacity>
                  {Array.isArray(permissionMatrix) && permissionMatrix.map(roleMatrix => (
                    <TouchableOpacity
                      key={roleMatrix.role_id}
                      style={[
                        styles.filterOption,
                        { borderColor: themeColors.border },
                        selectedMatrixRoleFilter === roleMatrix.role_id && { borderColor: themeColors.primary, backgroundColor: themeColors.primary + '20' }
                      ]}
                      onPress={() => setSelectedMatrixRoleFilter(roleMatrix.role_id)}
                    >
                      <ThemedText style={[
                        styles.filterOptionText,
                        selectedMatrixRoleFilter === roleMatrix.role_id && { color: themeColors.primary, fontWeight: '600' }
                      ]}>
                        {roleMatrix.role_name}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {(selectedMatrixRoleFilter ? permissionMatrix.filter(roleMatrix => roleMatrix.role_id === selectedMatrixRoleFilter) : permissionMatrix).map(roleMatrix => (
                <View key={roleMatrix.role_id} style={[styles.roleMatrixCard, { backgroundColor: themeColors.card }]}>
                  <View style={styles.roleMatrixHeader}>
                    <View style={[styles.roleBadge, { backgroundColor: getRoleColor(roleMatrix.role_name) }]}>
                      <Ionicons name="person" size={16} color="white" />
                      <ThemedText style={styles.roleBadgeText}>{roleMatrix.role_name}</ThemedText>
                    </View>
                    <ThemedText style={styles.roleDescription}>
                      {getRoleDescription(roleMatrix.role_name)}
                    </ThemedText>
                  </View>

                  <View style={styles.permissionsGrid}>
                    {Object.keys(roleMatrix.permissions_by_resource).map(resource => (
                      <View key={resource} style={styles.resourceCard}>
                        <View style={styles.resourceHeader}>
                          <Ionicons
                            name={getResourceIcon(resource)}
                            size={20}
                            color={themeColors.primary}
                          />
                          <ThemedText type="subtitle" style={styles.resourceName}>
                            {resource.replace('_', ' ')}
                          </ThemedText>
                        </View>

                        <View style={styles.actionsRow}>
                          {Object.keys(roleMatrix.permissions_by_resource[resource]).map(action => {
                            const hasPermission = roleMatrix.permissions_by_resource[resource][action];
                            return (
                              <View key={action} style={styles.actionItem}>
                                <View style={[
                                  styles.matrixActionBadge,
                                  { backgroundColor: hasPermission ? '#10B981' : '#F3F4F6' }
                                ]}>
                                  <Ionicons
                                    name={hasPermission ? "checkmark" : "close"}
                                    size={12}
                                    color={hasPermission ? 'white' : '#6B7280'}
                                  />
                                </View>
                                <ThemedText style={[
                                  styles.matrixActionText,
                                  { color: hasPermission ? '#10B981' : '#6B7280' }
                                ]}>
                                  {action}
                                </ThemedText>
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              ))}

              {/* Summary Cards */}
              <View style={styles.summaryContainer}>
                <View style={[styles.summaryCard, { backgroundColor: themeColors.card }]}>
                  <Ionicons name="shield-checkmark" size={24} color="#10B981" />
                  <View style={styles.summaryText}>
                    <ThemedText type="subtitle">Total Permissions</ThemedText>
                    <ThemedText style={styles.summaryValue}>
                      {permissionMatrix.reduce((total, roleMatrix) => {
                        return total + Object.values(roleMatrix.permissions_by_resource).reduce((roleTotal, resourcePerms) => {
                          return roleTotal + Object.values(resourcePerms).filter(Boolean).length;
                        }, 0);
                      }, 0)}
                    </ThemedText>
                  </View>
                </View>

                <View style={[styles.summaryCard, { backgroundColor: themeColors.card }]}>
                  <Ionicons name="grid" size={24} color={themeColors.primary} />
                  <View style={styles.summaryText}>
                    <ThemedText type="subtitle">Resources</ThemedText>
                    <ThemedText style={styles.summaryValue}>
                      {permissionMatrix.length > 0 ? Object.keys(permissionMatrix[0].permissions_by_resource).length : 0}
                    </ThemedText>
                  </View>
                </View>

                <View style={[styles.summaryCard, { backgroundColor: themeColors.card }]}>
                  <Ionicons name="people" size={24} color="#F59E0B" />
                  <View style={styles.summaryText}>
                    <ThemedText type="subtitle">Roles</ThemedText>
                    <ThemedText style={styles.summaryValue}>
                      {permissionMatrix.length}
                    </ThemedText>
                  </View>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="grid" size={64} color={themeColors['muted-foreground']} />
              <ThemedText type="subtitle" style={styles.emptyTitle}>
                Permission Matrix
              </ThemedText>
              <ThemedText style={styles.emptyText}>
                Loading permission matrix...
              </ThemedText>
            </View>
          )}
        </ScrollView>
      )}

      {/* Role Modal */}
      <Modal
        visible={isRoleModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsRoleModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.background }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="title" style={styles.modalTitle}>
                {editingRole ? 'Edit Role' : 'Add Role'}
              </ThemedText>
              <TouchableOpacity onPress={() => setIsRoleModalVisible(false)}>
                <Ionicons name="close" size={24} color={themeColors['card-foreground']} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Role Name *</ThemedText>
                <TextInput
                  style={[styles.input, { color: themeColors['card-foreground'], borderColor: themeColors.border }]}
                  placeholder="Enter role name"
                  placeholderTextColor={themeColors['muted-foreground']}
                  value={roleForm.name}
                  onChangeText={(text) => setRoleForm(prev => ({ ...prev, name: text }))}
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Description</ThemedText>
                <TextInput
                  style={[styles.textarea, { color: themeColors['card-foreground'], borderColor: themeColors.border }]}
                  placeholder="Enter role description"
                  placeholderTextColor={themeColors['muted-foreground']}
                  value={roleForm.description}
                  onChangeText={(text) => setRoleForm(prev => ({ ...prev, description: text }))}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.checkboxContainer}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => setRoleForm(prev => ({ ...prev, is_active: !prev.is_active }))}
                >
                  <Ionicons
                    name={roleForm.is_active ? "checkbox" : "square-outline"}
                    size={24}
                    color={themeColors.primary}
                  />
                </TouchableOpacity>
                <ThemedText style={styles.checkboxLabel}>Active</ThemedText>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setIsRoleModalVisible(false)}
              >
                <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.submitButton, { backgroundColor: themeColors.primary }]}
                onPress={editingRole ? handleUpdateRole : handleCreateRole}
                disabled={createRoleMutation.isPending || updateRoleMutation.isPending}
              >
                <ThemedText style={styles.submitButtonText}>
                  {createRoleMutation.isPending || updateRoleMutation.isPending ? 'Saving...' : (editingRole ? 'Update' : 'Create')}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Permission Modal */}
      <Modal
        visible={isPermissionModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsPermissionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.background }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="title" style={styles.modalTitle}>
                {editingPermission ? 'Edit Permission' : 'Add Permission'}
              </ThemedText>
              <TouchableOpacity onPress={() => setIsPermissionModalVisible(false)}>
                <Ionicons name="close" size={24} color={themeColors['card-foreground']} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Role *</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsContainer}>
                  {Array.isArray(roles) && roles.map(role => (
                    <TouchableOpacity
                      key={role.id}
                      style={[
                        styles.optionButton,
                        { borderColor: themeColors.border },
                        permissionForm.role_id === role.id && { borderColor: themeColors.primary, backgroundColor: themeColors.primary + '20' }
                      ]}
                      onPress={() => setPermissionForm(prev => ({ ...prev, role_id: role.id }))}
                    >
                      <ThemedText style={[
                        styles.optionText,
                        permissionForm.role_id === role.id && { color: themeColors.primary, fontWeight: '600' }
                      ]}>
                        {role.name}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Resource *</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsContainer}>
                  {Array.isArray(availableResources) && availableResources.map(resource => (
                    <TouchableOpacity
                      key={resource}
                      style={[
                        styles.optionButton,
                        { borderColor: themeColors.border },
                        permissionForm.resource === resource && { borderColor: themeColors.primary, backgroundColor: themeColors.primary + '20' }
                      ]}
                      onPress={() => setPermissionForm(prev => ({ ...prev, resource }))}
                    >
                      <ThemedText style={[
                        styles.optionText,
                        permissionForm.resource === resource && { color: themeColors.primary, fontWeight: '600' }
                      ]}>
                        {resource.replace('_', ' ')}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Action *</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsContainer}>
                  {Array.isArray(availableActions) && availableActions.map(action => (
                    <TouchableOpacity
                      key={action}
                      style={[
                        styles.optionButton,
                        { borderColor: themeColors.border },
                        permissionForm.action === action && { borderColor: themeColors.primary, backgroundColor: themeColors.primary + '20' }
                      ]}
                      onPress={() => setPermissionForm(prev => ({ ...prev, action }))}
                    >
                      <ThemedText style={[
                        styles.optionText,
                        permissionForm.action === action && { color: themeColors.primary, fontWeight: '600' }
                      ]}>
                        {action}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.checkboxContainer}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => setPermissionForm(prev => ({ ...prev, is_granted: !prev.is_granted }))}
                >
                  <Ionicons
                    name={permissionForm.is_granted ? "checkbox" : "square-outline"}
                    size={24}
                    color={themeColors.primary}
                  />
                </TouchableOpacity>
                <ThemedText style={styles.checkboxLabel}>Permission Granted</ThemedText>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setIsPermissionModalVisible(false)}
              >
                <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.submitButton, { backgroundColor: themeColors.primary }]}
                onPress={editingPermission ? handleUpdatePermission : handleCreatePermission}
                disabled={createPermissionMutation.isPending || updatePermissionMutation.isPending}
              >
                <ThemedText style={styles.submitButtonText}>
                  {createPermissionMutation.isPending || updatePermissionMutation.isPending ? 'Saving...' : (editingPermission ? 'Update' : 'Create')}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bulk Create Permissions Modal */}
      <Modal
        visible={isBulkModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsBulkModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.background }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="title" style={styles.modalTitle}>
                Bulk Create Permissions
              </ThemedText>
              <TouchableOpacity onPress={() => setIsBulkModalVisible(false)}>
                <Ionicons name="close" size={24} color={themeColors['card-foreground']} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Role *</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsContainer}>
                  {Array.isArray(roles) && roles.map(role => (
                    <TouchableOpacity
                      key={role.id}
                      style={[
                        styles.optionButton,
                        { borderColor: themeColors.border },
                        bulkForm.role_id === role.id && { borderColor: themeColors.primary, backgroundColor: themeColors.primary + '20' }
                      ]}
                      onPress={() => setBulkForm(prev => ({ ...prev, role_id: role.id }))}
                    >
                      <ThemedText style={[
                        styles.optionText,
                        bulkForm.role_id === role.id && { color: themeColors.primary, fontWeight: '600' }
                      ]}>
                        {role.name}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Add Permissions</ThemedText>
                <View style={styles.bulkPermissionsContainer}>
                  {Array.isArray(availableResources) && availableResources.map(resource => (
                    <View key={resource} style={styles.bulkResourceGroup}>
                      <ThemedText style={styles.bulkResourceTitle}>
                        {resource.replace('_', ' ')}
                      </ThemedText>
                      <View style={styles.bulkActionsRow}>
                        {Array.isArray(availableActions) && availableActions.map(action => (
                          <View key={action} style={styles.bulkActionItem}>
                            <TouchableOpacity
                              style={[styles.bulkActionButton, { borderColor: themeColors.border }]}
                              onPress={() => addBulkPermission(resource, action, true)}
                            >
                              <Ionicons name="add" size={16} color={themeColors.primary} />
                              <ThemedText style={styles.bulkActionText}>{action}</ThemedText>
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              </View>

              {bulkForm.permissions.length > 0 && (
                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Selected Permissions ({bulkForm.permissions.length})</ThemedText>
                  <View style={styles.selectedPermissionsList}>
                    {bulkForm.permissions.map((perm, index) => (
                      <View key={index} style={[styles.selectedPermissionItem, { backgroundColor: themeColors.card }]}>
                        <View style={styles.selectedPermissionInfo}>
                          <ThemedText style={styles.selectedPermissionText}>
                            {perm.resource.replace('_', ' ')} - {perm.action}
                          </ThemedText>
                          <View style={styles.grantedIndicator}>
                            <Ionicons
                              name={perm.is_granted ? "checkmark-circle" : "close-circle"}
                              size={16}
                              color={perm.is_granted ? '#10B981' : '#EF4444'}
                            />
                            <ThemedText style={[styles.grantedText, { color: perm.is_granted ? '#10B981' : '#EF4444' }]}>
                              {perm.is_granted ? 'Granted' : 'Denied'}
                            </ThemedText>
                          </View>
                        </View>
                        <TouchableOpacity
                          style={styles.removePermissionButton}
                          onPress={() => removeBulkPermission(index)}
                        >
                          <Ionicons name="trash" size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setIsBulkModalVisible(false)}
              >
                <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.submitButton, { backgroundColor: themeColors.primary }]}
                onPress={handleBulkCreatePermissions}
                disabled={bulkCreatePermissionsMutation.isPending}
              >
                <ThemedText style={styles.submitButtonText}>
                  {bulkCreatePermissionsMutation.isPending ? 'Creating...' : `Create ${bulkForm.permissions.length} Permissions`}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </ThemedView>
    </ReadOrListPermissionGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  activeTabButton: {
    backgroundColor: '#3B82F6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: 'white',
  },
  contentContainer: {
    flex: 1,
  },
  contentHeader: {
    marginBottom: 16,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  bulkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  filterOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  filterOption: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 80,
  },
  filterOptionText: {
    fontSize: 14,
    textAlign: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    marginLeft: 8,
    fontWeight: '600',
  },
  listContainer: {
    paddingBottom: 20,
  },
  roleCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  roleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  roleInfo: {
    flex: 1,
  },
  roleName: {
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleDescription: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 8,
  },
  roleDate: {
    fontSize: 12,
    opacity: 0.6,
  },
  permissionCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  permissionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  permissionInfo: {
    flex: 1,
  },
  resourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  resourceText: {
    marginLeft: 8,
  },
  actionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  actionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  permissionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  permissionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roleLabel: {
    fontSize: 14,
    opacity: 0.8,
  },
  grantedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  grantedText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500',
  },
  matrixContainer: {
    flex: 1,
  },
  matrixTable: {
    marginBottom: 20,
  },
  matrixHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginBottom: 8,
  },
  matrixHeaderText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  matrixRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  matrixRoleText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  matrixCell: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  matrixContent: {
    paddingBottom: 20,
  },
  matrixTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  matrixSubtitle: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 24,
  },
  roleMatrixCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  roleMatrixHeader: {
    marginBottom: 16,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
  },
  roleBadgeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  permissionsGrid: {
    gap: 12,
  },
  resourceCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  resourceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  resourceName: {
    marginLeft: 8,
    fontSize: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionItem: {
    alignItems: 'center',
    flex: 1,
  },
  matrixActionBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  matrixActionText: {
    fontSize: 12,
    textAlign: 'center',
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryText: {
    alignItems: 'center',
    marginTop: 8,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 4,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.7,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
  },
  modalBody: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textarea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  optionsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  optionButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 80,
  },
  optionText: {
    fontSize: 14,
    textAlign: 'center',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  checkbox: {
    marginRight: 8,
  },
  checkboxLabel: {
    fontSize: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#3B82F6',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  paginationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  paginationText: {
    fontSize: 14,
    fontWeight: '500',
  },
  paginationInfo: {
    flex: 1,
    alignItems: 'center',
  },
  paginationInfoText: {
    fontSize: 14,
    opacity: 0.7,
  },
  bulkPermissionsContainer: {
    gap: 16,
  },
  bulkResourceGroup: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bulkResourceTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  bulkActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bulkActionItem: {
    alignItems: 'center',
    flex: 1,
  },
  bulkActionButton: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: 'center',
    backgroundColor: 'white',
  },
  bulkActionText: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  selectedPermissionsList: {
    gap: 8,
  },
  selectedPermissionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  selectedPermissionInfo: {
    flex: 1,
  },
  selectedPermissionText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  removePermissionButton: {
    padding: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#DC2626',
    marginLeft: 8,
    flex: 1,
  },
});