import { Ionicons } from '@expo/vector-icons';

import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
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
import { useClassSections, useCreateClassSection, useUpdateSection, useDeleteSection, useClassList, useSectionList } from '@/src/api/hooks/masters/classesAndSections';
import { PermissionGuard, ReadOrListPermissionGuard } from '@/components/PermissionGuards';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import { PermissionDebugger } from '@/components/PermissionDebugger';
import { QuickPermissionCheck } from '@/components/QuickPermissionCheck';
import { SimplePermissionTest } from '@/components/SimplePermissionTest';
import { AuthStateDebugger } from '@/components/AuthStateDebugger';
import { QuickDiagnostic } from '@/components/QuickDiagnostic';
import { useAuth } from '@/contexts/AuthContext';

interface ClassSectionData {
  id: string;
  class_id: string;
  class_name: string;
  section_id: string;
  section_name: string;
  is_active: boolean;
  created_at: string;
}

interface ClassSectionCreate {
  class_id: string;
  section_id: string;
  is_active?: boolean;
}

interface ClassSectionUpdate {
  class_id?: string;
  section_id?: string;
  is_active?: boolean;
}

export default function ClassesAndSectionsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassSectionData | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    class: {
      id: '',
      name: '',
      short_code: '',
      description: '',
      is_active: true,
    },
    sections: [] as { name: string; description: string; is_active: boolean }[],
  });
  const [editFormData, setEditFormData] = useState({
    class_id: '',
    section_id: '',
    is_active: true,
  });
  const [classType, setClassType] = useState<'existing' | 'new'>('new');

  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? 'dark' : 'light';
  const themeColors = Colors[theme];

  
  // Get auth context for debugging
  const { permissions, permissionsMap, role } = useAuth();
  
  // Permission checking will be handled by PermissionGuard components

  // Fetch data using permission-protected hooks
  const { data: classSectionsData, isLoading, error, refetch } = useClassSections();
  const { data: classListData } = useClassList();
  const { data: sectionListData } = useSectionList();

  // Mutations using permission-protected hooks
  const createMutation = useCreateClassSection();
  const updateMutation = useUpdateSection();
  const deleteMutation = useDeleteSection();

  // Handle mutation success/error states
  React.useEffect(() => {
    if (createMutation.isSuccess) {
      setIsModalVisible(false);
      resetForm();
      createMutation.reset();
    }
  }, [createMutation.isSuccess]);

  React.useEffect(() => {
    if (updateMutation.isSuccess) {
      setIsModalVisible(false);
      resetForm();
      updateMutation.reset();
    }
  }, [updateMutation.isSuccess]);

  React.useEffect(() => {
    if (deleteMutation.isSuccess) {
      deleteMutation.reset();
    }
  }, [deleteMutation.isSuccess]);

  // Flatten class sections data and filter based on search
  const filteredClassSections = useMemo(() => {
    if (!classSectionsData || !Array.isArray(classSectionsData)) return [];

    const flattened = classSectionsData.flatMap(cls =>
      (cls.sections || []).map((section: any) => ({
        id: section.id,
        class_id: cls.id,
        class_name: cls.name,
        section_id: section.id,
        section_name: section.name,
        is_active: section.is_active,
        created_at: (cls as any).created_at || new Date().toISOString(),
      }))
    );

    return flattened.filter((classSection) => {
      const className = classSection.class_name || '';
      const sectionName = classSection.section_name || '';
      const matchesSearch =
        className.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sectionName.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesSearch;
    });
  }, [classSectionsData, searchQuery]);

  const resetForm = () => {
    setFormData({
      class: {
        id: '',
        name: '',
        short_code: '',
        description: '',
        is_active: true,
      },
      sections: [],
    });
    setEditFormData({
      class_id: '',
      section_id: '',
      is_active: true,
    });
    setEditingClass(null);
    setCurrentStep(1);
    setClassType('new');
  };

  const handleEdit = (classItem: ClassSectionData) => {
    setEditingClass(classItem);
    setEditFormData({
      class_id: classItem.class_id,
      section_id: classItem.section_id,
      is_active: classItem.is_active,
    });
    setIsModalVisible(true);
  };

  const handleDelete = (classItem: ClassSectionData) => {
    Alert.alert(
      'Delete Section',
      `Are you sure you want to delete "${classItem.class_name} - ${classItem.section_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate({ classId: classItem.class_id, sectionId: classItem.id }),
        },
      ]
    );
  };

  const handleSubmit = () => {
    if (editingClass) {
      if (!editFormData.class_id || !editFormData.section_id) {
        Alert.alert('Error', 'Please select class and section');
        return;
      }
      updateMutation.mutate({ classId: editFormData.class_id, sectionId: editFormData.section_id, data: { is_active: editFormData.is_active } });
    } else {
      if (!formData.class.name || formData.sections.length === 0) {
        Alert.alert('Error', 'Please provide class name and at least one section');
        return;
      }
      const data = {
        name: formData.class.name,
        short_code: formData.class.short_code,
        description: formData.class.description,
        is_active: formData.class.is_active,
        academic_year_id: '77334ce1-60e5-460f-a294-820bb4e0b692', // hardcoded for now
        sections: formData.sections,
      };
      createMutation.mutate(data);
    }
  };


  const renderClassItem = useCallback(({ item }: { item: ClassSectionData }) => (
    <View style={[styles.classCard, { backgroundColor: themeColors.card }]}>
      <View style={styles.classHeader}>
        <View style={styles.classInfo}>
          <ThemedText type="subtitle" style={styles.className}>
            {item.class_name} - {item.section_name}
          </ThemedText>
          <View style={[styles.statusBadge, { backgroundColor: item.is_active ? '#10B981' : '#EF4444' }]}>
            <ThemedText style={styles.statusText}>
              {item.is_active ? 'Active' : 'Inactive'}
            </ThemedText>
          </View>
        </View>
        <View style={styles.actionButtons}>
          <PermissionGuard
            permissions={[
              [PERMISSION_RESOURCES.CLASSES, 'update'],
              [PERMISSION_RESOURCES.SECTIONS, 'update'],
              [PERMISSION_RESOURCES.CLASSES_SECTIONS, 'update']
            ]}
            requireAll={false}
          >
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: themeColors.primary }]}
              onPress={() => handleEdit(item)}
            >
              <Ionicons name="create" size={16} color="white" />
            </TouchableOpacity>
          </PermissionGuard>
          <PermissionGuard
            permissions={[
              [PERMISSION_RESOURCES.CLASSES, 'delete'],
              [PERMISSION_RESOURCES.SECTIONS, 'delete'],
              [PERMISSION_RESOURCES.CLASSES_SECTIONS, 'delete']
            ]}
            requireAll={false}
          >
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
              onPress={() => handleDelete(item)}
            >
              <Ionicons name="trash" size={16} color="white" />
            </TouchableOpacity>
          </PermissionGuard>
        </View>
      </View>

      <View style={styles.classFooter}>
        <ThemedText style={styles.createdText}>
          Created: {new Date(item.created_at).toLocaleDateString()}
        </ThemedText>
      </View>
    </View>
  ), [themeColors]);

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="title">Error</ThemedText>
        <ThemedText>Failed to load classes data</ThemedText>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <ThemedText style={styles.retryText}>Retry</ThemedText>
        </TouchableOpacity>
        <PermissionDebugger />
      </ThemedView>
    );
  }

  return (
    <PermissionGuard
      permissions={[
        [PERMISSION_RESOURCES.CLASSES, 'list'],
        [PERMISSION_RESOURCES.CLASSES, 'read'],
        [PERMISSION_RESOURCES.SECTIONS, 'list'],
        [PERMISSION_RESOURCES.SECTIONS, 'read'],
        [PERMISSION_RESOURCES.CLASSES_SECTIONS, 'list'], // Fallback for combined resource
        [PERMISSION_RESOURCES.CLASSES_SECTIONS, 'read']
      ]}
      requireAll={false}
      fallback={
        <ThemedView style={styles.container}>
          <View style={styles.centerContainer}>
            <ThemedText type="title">Access Denied</ThemedText>
            <ThemedText>You don't have permission to view classes and sections</ThemedText>
          </View>
        </ThemedView>
      }
    >
      <ThemedView style={styles.container}>
        {/* Debug Components - Remove these after debugging */}
        <QuickDiagnostic />
        <AuthStateDebugger />
        <QuickPermissionCheck />
        <SimplePermissionTest />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={themeColors['card-foreground']} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <ThemedText type="title">Classes & Sections</ThemedText>
            <ThemedText style={styles.subtitle}>
              {filteredClassSections.length} class section{filteredClassSections.length !== 1 ? 's' : ''}
            </ThemedText>
          </View>
          {/* Temporary debug button */}
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: '#FF6B6B', marginRight: 8 }]}
            onPress={() => router.push('/permission-test')}
          >
            <Ionicons name="bug" size={24} color="white" />
          </TouchableOpacity>
          <PermissionGuard
            permissions={[
              [PERMISSION_RESOURCES.CLASSES, 'create'],
              [PERMISSION_RESOURCES.SECTIONS, 'create'],
              [PERMISSION_RESOURCES.CLASSES_SECTIONS, 'create']
            ]}
            requireAll={false}
          >
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: themeColors.primary }]}
              onPress={() => {
                resetForm();
                setIsModalVisible(true);
              }}
            >
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          </PermissionGuard>
        </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: themeColors.card }]}>
        <Ionicons name="search" size={20} color={themeColors['muted-foreground']} />
        <TextInput
          style={[styles.searchInput, { color: themeColors['card-foreground'] }]}
          placeholder="Search classes or sections..."
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

      {/* Classes List */}
      <FlatList
        data={filteredClassSections}
        renderItem={renderClassItem}
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
            <Ionicons name="school" size={64} color={themeColors['muted-foreground']} />
            <ThemedText type="subtitle" style={styles.emptyTitle}>
              No Classes Found
            </ThemedText>
            <ThemedText style={styles.emptyText}>
              {searchQuery
                ? 'Try adjusting your search query'
                : 'Add your first class to get started'}
            </ThemedText>
          </View>
        }
      />

      {/* Add/Edit Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.background }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="title" style={styles.modalTitle}>
                {editingClass ? 'Edit Section' : `Add Class & Sections - Step ${currentStep}`}
              </ThemedText>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Ionicons name="close" size={24} color={themeColors['card-foreground']} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {editingClass ? (
                // Edit form
                <>
                  <View style={styles.formGroup}>
                    <ThemedText style={styles.label}>Class *</ThemedText>
                    <View style={styles.pickerContainer}>
                      {classListData?.map((classItem: any) => (
                        <TouchableOpacity
                          key={classItem.id}
                          style={[
                            styles.pickerOption,
                            { borderColor: themeColors.border },
                            editFormData.class_id === classItem.id && { borderColor: themeColors.primary, backgroundColor: themeColors.primary + '10' }
                          ]}
                          onPress={() => setEditFormData(prev => ({ ...prev, class_id: classItem.id }))}
                        >
                          <ThemedText style={[
                            styles.pickerText,
                            editFormData.class_id === classItem.id && { color: themeColors.primary, fontWeight: '600' }
                          ]}>
                            {classItem.name}
                          </ThemedText>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <ThemedText style={styles.label}>Section *</ThemedText>
                    <View style={styles.pickerContainer}>
                      {sectionListData?.map((section: any) => (
                        <TouchableOpacity
                          key={section.id}
                          style={[
                            styles.pickerOption,
                            { borderColor: themeColors.border },
                            editFormData.section_id === section.id && { borderColor: themeColors.primary, backgroundColor: themeColors.primary + '10' }
                          ]}
                          onPress={() => setEditFormData(prev => ({ ...prev, section_id: section.id }))}
                        >
                          <ThemedText style={[
                            styles.pickerText,
                            editFormData.section_id === section.id && { color: themeColors.primary, fontWeight: '600' }
                          ]}>
                            {section.name}
                          </ThemedText>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.checkboxContainer}>
                    <TouchableOpacity
                      style={styles.checkbox}
                      onPress={() => setEditFormData(prev => ({ ...prev, is_active: !prev.is_active }))}
                    >
                      <Ionicons
                        name={editFormData.is_active ? "checkbox" : "square-outline"}
                        size={24}
                        color={themeColors.primary}
                      />
                    </TouchableOpacity>
                    <ThemedText style={styles.checkboxLabel}>Active</ThemedText>
                  </View>
                </>
              ) : (
                // Create wizard
                <>
                  {currentStep === 1 && (
                    <View style={styles.formGroup}>
                      <ThemedText style={styles.label}>Class Type</ThemedText>
                      <View style={styles.pickerContainer}>
                        <TouchableOpacity
                          style={[
                            styles.pickerOption,
                            { borderColor: themeColors.border },
                            classType === 'new' && { borderColor: themeColors.primary, backgroundColor: themeColors.primary + '10' }
                          ]}
                          onPress={() => setClassType('new')}
                        >
                          <ThemedText style={[
                            styles.pickerText,
                            classType === 'new' && { color: themeColors.primary, fontWeight: '600' }
                          ]}>
                            Create New Class
                          </ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.pickerOption,
                            { borderColor: themeColors.border },
                            classType === 'existing' && { borderColor: themeColors.primary, backgroundColor: themeColors.primary + '10' }
                          ]}
                          onPress={() => setClassType('existing')}
                        >
                          <ThemedText style={[
                            styles.pickerText,
                            classType === 'existing' && { color: themeColors.primary, fontWeight: '600' }
                          ]}>
                            Select Existing Class
                          </ThemedText>
                        </TouchableOpacity>
                      </View>
                      {classType === 'existing' ? (
                        <View style={styles.pickerContainer}>
                          {classListData?.map((classItem: any) => (
                            <TouchableOpacity
                              key={classItem.id}
                              style={[
                                styles.pickerOption,
                                { borderColor: themeColors.border },
                                formData.class.id === classItem.id && { borderColor: themeColors.primary, backgroundColor: themeColors.primary + '10' }
                              ]}
                              onPress={() => setFormData(prev => ({ ...prev, class: { ...prev.class, id: classItem.id, name: classItem.name } }))}
                            >
                              <ThemedText style={[
                                styles.pickerText,
                                formData.class.id === classItem.id && { color: themeColors.primary, fontWeight: '600' }
                              ]}>
                                {classItem.name}
                              </ThemedText>
                            </TouchableOpacity>
                          ))}
                        </View>
                      ) : (
                        <>
                          <TextInput
                            style={[styles.input, { color: themeColors['card-foreground'], borderColor: themeColors.border }]}
                            placeholder="Class Name"
                            placeholderTextColor={themeColors['muted-foreground']}
                            value={formData.class.name}
                            onChangeText={(text) => setFormData(prev => ({ ...prev, class: { ...prev.class, name: text } }))}
                          />
                          <TextInput
                            style={[styles.input, { color: themeColors['card-foreground'], borderColor: themeColors.border }]}
                            placeholder="Short Code"
                            placeholderTextColor={themeColors['muted-foreground']}
                            value={formData.class.short_code}
                            onChangeText={(text) => setFormData(prev => ({ ...prev, class: { ...prev.class, short_code: text } }))}
                          />
                          <TextInput
                            style={[styles.input, { color: themeColors['card-foreground'], borderColor: themeColors.border }]}
                            placeholder="Description"
                            placeholderTextColor={themeColors['muted-foreground']}
                            value={formData.class.description}
                            onChangeText={(text) => setFormData(prev => ({ ...prev, class: { ...prev.class, description: text } }))}
                          />
                          <View style={styles.checkboxContainer}>
                            <TouchableOpacity
                              style={styles.checkbox}
                              onPress={() => setFormData(prev => ({ ...prev, class: { ...prev.class, is_active: !prev.class.is_active } }))}
                            >
                              <Ionicons
                                name={formData.class.is_active ? "checkbox" : "square-outline"}
                                size={24}
                                color={themeColors.primary}
                              />
                            </TouchableOpacity>
                            <ThemedText style={styles.checkboxLabel}>Active</ThemedText>
                          </View>
                        </>
                      )}
                    </View>
                  )}

                  {currentStep === 2 && (
                    <View style={styles.formGroup}>
                      <ThemedText style={styles.label}>Sections</ThemedText>
                      {formData.sections.map((section, index) => (
                        <View key={index} style={styles.sectionInputRow}>
                          <TextInput
                            style={[styles.sectionInput, { color: themeColors['card-foreground'], borderColor: themeColors.border }]}
                            placeholder="Section Name"
                            placeholderTextColor={themeColors['muted-foreground']}
                            value={section.name}
                            onChangeText={(text) => {
                              const newSections = [...formData.sections];
                              newSections[index].name = text;
                              setFormData(prev => ({ ...prev, sections: newSections }));
                            }}
                          />
                          <TouchableOpacity
                            style={[styles.removeSectionButton, { backgroundColor: '#EF4444' }]}
                            onPress={() => {
                              const newSections = formData.sections.filter((_, i) => i !== index);
                              setFormData(prev => ({ ...prev, sections: newSections }));
                            }}
                          >
                            <Ionicons name="trash" size={16} color="white" />
                          </TouchableOpacity>
                        </View>
                      ))}
                      <TouchableOpacity
                        style={[styles.addSectionButton, { backgroundColor: themeColors.primary }]}
                        onPress={() => setFormData(prev => ({ ...prev, sections: [...prev.sections, { name: '', description: '', is_active: true }] }))}
                      >
                        <Ionicons name="add" size={16} color="white" />
                        <ThemedText style={styles.addSectionText}>Add Section</ThemedText>
                      </TouchableOpacity>
                    </View>
                  )}

                  {currentStep === 3 && (
                    <View style={styles.formGroup}>
                      <ThemedText style={styles.label}>Review</ThemedText>
                      <ThemedText>Class: {formData.class.name || classListData?.find(c => c.id === formData.class.id)?.name}</ThemedText>
                      <ThemedText>Sections: {formData.sections.map(s => s.name).join(', ')}</ThemedText>
                    </View>
                  )}
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setIsModalVisible(false)}
              >
                <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
              </TouchableOpacity>
              {!editingClass && currentStep > 1 && (
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => setCurrentStep(currentStep - 1)}
                >
                  <ThemedText style={styles.cancelButtonText}>Previous</ThemedText>
                </TouchableOpacity>
              )}
              {!editingClass && currentStep < 3 ? (
                <TouchableOpacity
                  style={[styles.button, styles.submitButton, { backgroundColor: themeColors.primary }]}
                  onPress={() => setCurrentStep(currentStep + 1)}
                >
                  <ThemedText style={styles.submitButtonText}>Next</ThemedText>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.button, styles.submitButton, { backgroundColor: themeColors.primary }]}
                  onPress={handleSubmit}
                  disabled={createMutation.isLoading || updateMutation.isLoading}
                >
                  <ThemedText style={styles.submitButtonText}>
                    {createMutation.isLoading || updateMutation.isLoading ? 'Saving...' : (editingClass ? 'Update' : 'Create')}
                  </ThemedText>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
      </ThemedView>
    </PermissionGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  listContainer: {
    paddingBottom: 20,
  },
  classCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  classInfo: {
    flex: 1,
  },
  className: {
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
  sectionsContainer: {
    marginBottom: 12,
  },
  sectionsLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  sectionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sectionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  sectionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  classFooter: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
  },
  createdText: {
    fontSize: 12,
    opacity: 0.7,
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
  pickerContainer: {
    gap: 8,
  },
  pickerOption: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  pickerText: {
    fontSize: 16,
    marginBottom: 4,
  },
  pickerDescription: {
    fontSize: 14,
    opacity: 0.7,
  },
  sectionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addSectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  addSectionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  sectionInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginRight: 8,
  },
  removeSectionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
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
});