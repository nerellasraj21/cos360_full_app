import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppLayout } from '@/components';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts';
import { studentAdmissionsApi, StudentAdmission } from '@/src/api/students';
import { useMobilePermission } from '../../src/hooks/useMobilePermission';
import { PERMISSION_RESOURCES } from '../../src/types/permissions';

type Student = StudentAdmission;

const studentActions = [
  {
    title: 'Core Management',
    icon: 'school',
    color: '#3B82F6',
    actions: [
      { title: 'New Admission', icon: 'person-add', route: '/students/admission', description: 'Add new student' },
      { title: 'Mark Attendance', icon: 'checkmark-circle', route: '/students/attendance', description: 'Daily attendance' },
    ]
  },
  {
    title: 'Student Services',
    icon: 'people',
    color: '#10B981',
    actions: [
      { title: 'Student Profile', icon: 'person', route: '/students/profile', description: 'View & edit profile' },
      { title: 'Transport', icon: 'bus', route: '/students/transport', description: 'Transport assignments' },
    ]
  },
  {
    title: 'Certificates',
    icon: 'document',
    color: '#F59E0B',
    actions: [
      { title: 'My Certificates', icon: 'document', route: '/students/mycertificates', description: 'View certificates' },
      { title: 'Student Certificates', icon: 'documents', route: '/students/studentcertificates', description: 'Manage certificates' },
      { title: 'Upload Certificate', icon: 'cloud-upload', route: '/students/certificateupload', description: 'Upload new certificate' },
      { title: 'Certificate Types', icon: 'list', route: '/students/certificatetypes', description: 'Manage types' },
    ]
  },
  {
    title: 'Documents',
    icon: 'folder',
    color: '#8B5CF6',
    actions: [
      { title: 'My Documents', icon: 'folder', route: '/students/mydocuments', description: 'View documents' },
      { title: 'Student Documents', icon: 'folder-open', route: '/students/studentdocuments', description: 'Manage documents' },
      { title: 'Upload Document', icon: 'cloud-upload', route: '/students/documentupload', description: 'Upload new document' },
    ]
  },
];

export default function StudentsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const router = useRouter();
  const { theme, colors } = useTheme();
  const themeColors = colors;
  const { hasPermission } = useMobilePermission();

  // Fetch students data - permission protected
  const hasListPermission = hasPermission ? hasPermission(PERMISSION_RESOURCES.STUDENTS, 'list') : false;
  const { data: studentsData, isLoading, error, refetch } = useQuery({
    queryKey: ['students'],
    queryFn: () => studentAdmissionsApi.getStudentAdmissions().then(res => res.items),
    enabled: hasListPermission, // Only fetch if user has permission
  });

  // Filter students based on search and filters
  const filteredStudents = useMemo(() => {
    if (!studentsData) return [];

    return studentsData.filter((student: Student) => {
      const fullName = `${student.student.first_name} ${student.student.last_name}`.toLowerCase();
      const matchesSearch =
        fullName.includes(searchQuery.toLowerCase()) ||
        student.admission_number.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesClass = !selectedClass || student.current_class_id === selectedClass;
      const matchesSection = !selectedSection || student.current_section_id === selectedSection;

      return matchesSearch && matchesClass && matchesSection;
    });
  }, [studentsData, searchQuery, selectedClass, selectedSection]);

  // Get unique classes and sections for filters
  const uniqueClasses = useMemo(() => {
    if (!studentsData) return [];
    return [...new Set(studentsData.map((student: Student) => student.current_class_id))];
  }, [studentsData]);

  const uniqueSections = useMemo(() => {
    if (!studentsData) return [];
    return [...new Set(studentsData.map((student: Student) => student.current_section_id).filter(Boolean))];
  }, [studentsData]);


  return (
    <AppLayout title="Student Management System">
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Statistics Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: themeColors.card }]}>
            <Ionicons name="people" size={32} color="#3B82F6" />
            <View style={styles.statContent}>
              <ThemedText type="title" style={styles.statNumber}>
                {studentsData?.length || 0}
              </ThemedText>
              <ThemedText style={styles.statLabel}>Total Students</ThemedText>
            </View>
          </View>

          <View style={[styles.statCard, { backgroundColor: themeColors.card }]}>
            <Ionicons name="school" size={32} color="#10B981" />
            <View style={styles.statContent}>
              <ThemedText type="title" style={styles.statNumber}>
                {studentsData?.filter((s: Student) => s.is_active).length || 0}
              </ThemedText>
              <ThemedText style={styles.statLabel}>Active Students</ThemedText>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Quick Actions
          </ThemedText>

          {studentActions.map((section, sectionIndex) => (
            <View key={sectionIndex} style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: section.color }]}>
                  <Ionicons name={section.icon as any} size={20} color="white" />
                </View>
                <ThemedText type="defaultSemiBold" style={styles.sectionTitleText}>
                  {section.title}
                </ThemedText>
              </View>

              <View style={styles.actionsGrid}>
                {section.actions.map((action, actionIndex) => {
                  // Map actions to appropriate permissions
                  const getActionPermission = (actionTitle: string) => {
                    const permissionMap: { [key: string]: [string, string] } = {
                      'New Admission': [PERMISSION_RESOURCES.STUDENT_ADMISSIONS, 'create'],
                      'Mark Attendance': [PERMISSION_RESOURCES.STUDENT_ATTENDANCE, 'create'],
                      'Student Profile': [PERMISSION_RESOURCES.STUDENTS, 'read'],
                      'Transport': [PERMISSION_RESOURCES.STUDENT_TRANSPORT, 'list'],
                      'My Certificates': [PERMISSION_RESOURCES.STUDENT_CERTIFICATES, 'read'],
                      'Student Certificates': [PERMISSION_RESOURCES.STUDENT_CERTIFICATES, 'list'],
                      'Upload Certificate': [PERMISSION_RESOURCES.STUDENT_CERTIFICATES, 'create'],
                      'Certificate Types': [PERMISSION_RESOURCES.STUDENT_CERTIFICATES, 'list'],
                      'My Documents': [PERMISSION_RESOURCES.STUDENT_DOCUMENTS, 'read'],
                      'Student Documents': [PERMISSION_RESOURCES.STUDENT_DOCUMENTS, 'list'],
                      'Upload Document': [PERMISSION_RESOURCES.STUDENT_DOCUMENTS, 'create']
                    };
                    return permissionMap[actionTitle] || [PERMISSION_RESOURCES.STUDENTS, 'read'];
                  };

                  const [resource, actionType] = getActionPermission(action.title);
                  const hasAccess = hasPermission ? hasPermission(resource, actionType) : false;

                  return (
                    <TouchableOpacity
                      key={actionIndex}
                      style={[
                        styles.actionCard,
                        {
                          backgroundColor: hasAccess ? themeColors.card : themeColors.muted,
                          opacity: hasAccess ? 1 : 0.6
                        }
                      ]}
                      onPress={() => hasAccess && router.push(action.route as any)}
                      disabled={!hasAccess}
                    >
                      <Ionicons
                        name={hasAccess ? action.icon as any : "lock-closed"}
                        size={24}
                        color={hasAccess ? section.color : themeColors['muted-foreground']}
                      />
                      <View style={styles.actionContent}>
                        <ThemedText style={styles.actionTitle}>{action.title}</ThemedText>
                        <ThemedText style={styles.actionDescription}>
                          {hasAccess
                            ? action.description
                            : "You don't have permission to access this feature"
                          }
                        </ThemedText>
                      </View>
                      <Ionicons
                        name={hasAccess ? "chevron-forward" : "lock-closed"}
                        size={16}
                        color={themeColors['muted-foreground']}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </View>

        {/* Recent Students */}
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Recent Students
            </ThemedText>
            <TouchableOpacity onPress={() => router.push('/students/admission')}>
              <ThemedText style={[styles.viewAllText, { color: themeColors.primary }]}>
                Add New
              </ThemedText>
            </TouchableOpacity>
          </View>

          {filteredStudents.slice(0, 3).map((student) => (
            <TouchableOpacity
              key={student.id}
              style={[styles.studentCard, { backgroundColor: themeColors.card }]}
              onPress={() => router.push(`/students/${student.id}`)}
            >
              <View style={styles.studentHeader}>
                <View style={styles.studentInfo}>
                  <ThemedText type="subtitle" style={styles.studentName}>
                    {`${student.student.first_name} ${student.student.last_name}`}
                  </ThemedText>
                  <ThemedText style={styles.admissionNumber}>
                    {student.admission_number}
                  </ThemedText>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: student.is_active ? '#10B981' : '#EF4444' }]}>
                  <ThemedText style={styles.statusText}>
                    {student.is_active ? 'Active' : 'Inactive'}
                  </ThemedText>
                </View>
              </View>

              <View style={styles.studentDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="school" size={16} color={themeColors['muted-foreground']} />
                  <ThemedText style={styles.detailText}>
                    Class {student.current_class_id} - Section {student.current_section_id || 'N/A'}
                  </ThemedText>
                </View>
              </View>
            </TouchableOpacity>
          ))}

          {filteredStudents.length === 0 && (
            <View style={styles.emptyContainer}>
              <Ionicons name="people" size={64} color={themeColors['muted-foreground']} />
              <ThemedText type="subtitle" style={styles.emptyTitle}>
                No Students Yet
              </ThemedText>
              <ThemedText style={styles.emptyText}>
                Start by adding your first student to the system
              </ThemedText>
              <TouchableOpacity
                style={[styles.addFirstButton, { backgroundColor: themeColors.primary }]}
                onPress={() => router.push('/students/admission')}
              >
                <Ionicons name="add" size={20} color="white" />
                <ThemedText style={styles.addFirstButtonText}>Add First Student</ThemedText>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statContent: {
    alignItems: 'center',
    marginTop: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 4,
  },
  actionsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionTitleText: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionsGrid: {
    gap: 8,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionContent: {
    flex: 1,
    marginLeft: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: 12,
    opacity: 0.7,
  },
  recentSection: {
    marginBottom: 20,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  studentCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  studentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    marginBottom: 4,
  },
  admissionNumber: {
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
  studentDetails: {
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
    marginBottom: 16,
  },
  addFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addFirstButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  },
});