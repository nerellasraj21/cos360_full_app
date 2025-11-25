import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ReadOrListPermissionGuard, CreatePermissionGuard } from '@/components/PermissionGuards';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import { useParentsQuery } from '@/src/api/hooks/parents';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import type { Parent } from '@/src/types/masters/staff';

export default function ParentsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRelationship, setSelectedRelationship] = useState<string>('');
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? 'dark' : 'light';
  const themeColors = Colors[theme];
  const { selectedStudent, availableStudents, user } = useAuth();

  // Check if user is a parent and handle student context
  const isParentUser = user?.role?.name?.toLowerCase() === 'parent' || 
                      user?.role?.name?.toLowerCase() === 'guardian' ||
                      user?.role?.name?.toLowerCase() === 'father' ||
                      user?.role?.name?.toLowerCase() === 'mother';

  // Fetch parents data using permission-protected hook
  const { data: parentsData, isLoading, error, refetch, hasPermission } = useParentsQuery();

  // Filter parents based on search and filters
  const filteredParents = useMemo(() => {
    if (!parentsData) return [];

    return parentsData.filter((parent: Parent) => {
      const fullName = `${parent.first_name} ${parent.last_name}`.toLowerCase();
      const matchesSearch =
        fullName.includes(searchQuery.toLowerCase()) ||
        parent.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        parent.phone.includes(searchQuery);

      const matchesRelationship = !selectedRelationship || parent.relationship === selectedRelationship;

      return matchesSearch && matchesRelationship;
    });
  }, [parentsData, searchQuery, selectedRelationship]);

  // Get unique relationships for filters
  const uniqueRelationships = useMemo(() => {
    if (!parentsData) return [];
    return [...new Set(parentsData.map((parent: Parent) => parent.relationship))];
  }, [parentsData]);

  const renderParentItem = ({ item }: { item: Parent }) => (
    <TouchableOpacity
      style={[styles.parentCard, { backgroundColor: themeColors.card }]}
      onPress={() => Alert.alert('Parent Details', `View details for ${item.first_name} ${item.last_name}`)}
    >
      <View style={styles.parentHeader}>
        <View style={styles.parentInfo}>
          <ThemedText type="subtitle" style={styles.parentName}>
            {item.first_name} {item.last_name}
          </ThemedText>
          <ThemedText style={styles.relationship}>
            {item.relationship}
          </ThemedText>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: item.is_active ? '#10B981' : '#EF4444' }]}>
          <ThemedText style={styles.statusText}>
            {item.is_active ? 'Active' : 'Inactive'}
          </ThemedText>
        </View>
      </View>

      <View style={styles.parentDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="mail" size={16} color={themeColors['muted-foreground']} />
          <ThemedText style={styles.detailText}>{item.email}</ThemedText>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="call" size={16} color={themeColors['muted-foreground']} />
          <ThemedText style={styles.detailText}>{item.phone}</ThemedText>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="location" size={16} color={themeColors['muted-foreground']} />
          <ThemedText style={styles.detailText} numberOfLines={1}>
            {item.address}
          </ThemedText>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderFilterButtons = () => (
    <View style={styles.filterContainer}>
      <TouchableOpacity
        style={[styles.filterButton, { backgroundColor: themeColors.card }]}
        onPress={() => setSelectedRelationship('')}
      >
        <ThemedText style={[styles.filterText, !selectedRelationship && { color: themeColors.primary }]}>
          All Relationships
        </ThemedText>
      </TouchableOpacity>
      {uniqueRelationships.slice(0, 3).map((relationship) => (
        <TouchableOpacity
          key={relationship}
          style={[styles.filterButton, { backgroundColor: themeColors.card }]}
          onPress={() => setSelectedRelationship(relationship)}
        >
          <ThemedText style={[styles.filterText, selectedRelationship === relationship && { color: themeColors.primary }]}>
            {relationship}
          </ThemedText>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle" size={64} color={themeColors['muted-foreground']} />
          <ThemedText type="subtitle" style={styles.emptyTitle}>
            Error Loading Parents
          </ThemedText>
          <ThemedText style={styles.emptyText}>
            {hasPermission ? 'Failed to load parents data' : 'You don\'t have permission to view parent information'}
          </ThemedText>
          {hasPermission && (
            <TouchableOpacity style={[styles.retryButton, { backgroundColor: themeColors.primary }]} onPress={() => refetch()}>
              <ThemedText style={styles.retryText}>Retry</ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </ThemedView>
    );
  }

  return (
    <ReadOrListPermissionGuard 
      resource={PERMISSION_RESOURCES.PARENT_PROFILE}
      fallback={
        <ThemedView style={styles.container}>
          <View style={styles.emptyContainer}>
            <Ionicons name="lock-closed" size={64} color={themeColors['muted-foreground']} />
            <ThemedText type="subtitle" style={styles.emptyTitle}>
              Access Denied
            </ThemedText>
            <ThemedText style={styles.emptyText}>
              You don&apos;t have permission to view parent information.
            </ThemedText>
          </View>
        </ThemedView>
      }
    >
      <ThemedView style={styles.container}>
        {/* Student Selection for Parent Users */}
        {isParentUser && availableStudents.length > 1 && (
          <View style={[styles.studentSelector, { backgroundColor: themeColors.card }]}>
            <ThemedText style={styles.studentSelectorLabel}>
              Viewing as parent of: {selectedStudent?.name || 'No student selected'}
            </ThemedText>
            {availableStudents.length > 1 && (
              <ThemedText style={styles.studentSelectorHint}>
                Switch students in Settings to view different information
              </ThemedText>
            )}
          </View>
        )}

        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="title">Parent Management</ThemedText>
          <CreatePermissionGuard 
            resource={PERMISSION_RESOURCES.PARENT_PROFILE}>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: themeColors.primary }]}
              onPress={() => Alert.alert('Add Parent', 'Navigate to parent enrollment form')}
            >
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          </CreatePermissionGuard>
        </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: themeColors.card }]}>
        <Ionicons name="search" size={20} color={themeColors['muted-foreground']} />
        <TextInput
          style={[styles.searchInput, { color: themeColors['card-foreground'] }]}
          placeholder="Search parents..."
          placeholderTextColor={themeColors['muted-foreground']}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close" size={20} color={themeColors['muted-foreground']} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Relationship Filters */}
      {renderFilterButtons()}

      {/* Parents Count */}
      <View style={styles.countContainer}>
        <ThemedText style={styles.countText}>
          {filteredParents.length} parent{filteredParents.length !== 1 ? 's' : ''}
        </ThemedText>
      </View>


      {/* Parents List */}
      <FlatList
        data={filteredParents}
        renderItem={renderParentItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={themeColors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people" size={64} color={themeColors['muted-foreground']} />
            <ThemedText type="subtitle" style={styles.emptyTitle}>
              No Parents Found
            </ThemedText>
            <ThemedText style={styles.emptyText}>
              {searchQuery || selectedRelationship
                ? 'Try adjusting your search or filters'
                : 'Add parent contacts to get started'}
            </ThemedText>
          </View>
        }
      />
      </ThemedView>
    </ReadOrListPermissionGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  studentSelector: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  studentSelectorLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  studentSelectorHint: {
    fontSize: 12,
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  countContainer: {
    marginBottom: 16,
  },
  countText: {
    fontSize: 14,
    opacity: 0.7,
  },
  listContainer: {
    paddingBottom: 20,
  },
  parentCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  parentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  parentInfo: {
    flex: 1,
  },
  parentName: {
    marginBottom: 4,
  },
  relationship: {
    fontSize: 14,
    opacity: 0.7,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  parentDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 14,
    marginLeft: 8,
    opacity: 0.8,
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
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  retryText: {
    color: 'white',
    fontWeight: '600',
  },
});