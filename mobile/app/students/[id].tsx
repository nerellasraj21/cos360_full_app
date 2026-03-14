import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { studentAdmissionsApi, studentAttendanceApi, studentCertificatesApi, studentDocumentsApi, studentTransportApi } from '@/src/api';
import { ReadPermissionGuard, UpdatePermissionGuard } from '@/components/PermissionGuards';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';

interface Student {
  id: string;
  admission_number: string;
  admission_date: string;
  academic_year_id: string;
  admitted_academic_year_id: string;
  admitted_class_id: string;
  admitted_section_id: string;
  current_class_id: string;
  current_section_id: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  is_previous_school: boolean;
  previous_school_name?: string;
  previous_class?: string;
  previous_school_remark?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  student: {
    id: string;
    first_name: string;
    last_name: string;
    date_of_birth: string;
    gender: string;
    is_primary: string;
    aadhar_number: string;
    apaars_number: string;
    caste: string;
    sub_caste: string;
    community: string;
    nationality: string;
    mother_tongue: string;
    identification_marks: string;
  };
  father: {
    id: string;
    name: string;
    email: string;
    phone: string;
    occupation: string;
    aadhar_number: string;
    gender: string;
    relation_to_student: string;
    students: any[];
  };
  mother: {
    id: string;
    name: string;
    email: string;
    phone: string;
    occupation: string;
    aadhar_number: string;
    gender: string;
    relation_to_student: string;
    students: any[];
  };
}

export default function StudentDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? 'dark' : 'light';
  const themeColors = Colors[theme];

  // Fetch student details
  const { data: student, isLoading, error, refetch } = useQuery({
    queryKey: ['student', id],
    queryFn: async () => {
      const response = await studentAdmissionsApi.getStudentAdmissions();
      return response.items.find((s: any) => s.id === id);
    },
    enabled: !!id,
  });

  // Fetch related data
  const { data: attendance } = useQuery({
    queryKey: ['student-attendance', id],
    queryFn: async () => {
      const response = await studentAttendanceApi.getAllAttendances();
      return response.items.filter((a: any) => a.student_id === id);
    },
    enabled: !!id,
  });

  const { data: certificates } = useQuery({
    queryKey: ['student-certificates', id],
    queryFn: async () => {
      const response = await studentCertificatesApi.listCertificates();
      return response.filter((c: any) => c.student_id === id);
    },
    enabled: !!id,
  });

  const { data: documents } = useQuery({
    queryKey: ['student-documents', id],
    queryFn: async () => {
      const response = await studentDocumentsApi.listDocuments();
      return response.filter((d: any) => d.student_id === id);
    },
    enabled: !!id,
  });

  const { data: transport } = useQuery({
    queryKey: ['student-transport', id],
    queryFn: async () => {
      const response = await studentTransportApi.getStudentTransports();
      return response.filter((t: any) => t.student_id === id);
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Loading student details...</ThemedText>
      </ThemedView>
    );
  }

  if (error || !student) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="title">Error</ThemedText>
        <ThemedText>Student not found</ThemedText>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ThemedText style={styles.backButtonText}>Go Back</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  const renderInfoSection = (title: string, icon: string, children: React.ReactNode) => (
    <View style={[styles.section, { backgroundColor: themeColors.card }]}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon as any} size={20} color={themeColors.primary} />
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          {title}
        </ThemedText>
      </View>
      {children}
    </View>
  );

  const renderInfoRow = (label: string, value: string, icon?: string) => (
    <View style={styles.infoRow}>
      {icon && <Ionicons name={icon as any} size={16} color={themeColors['muted-foreground']} />}
      <View style={styles.infoContent}>
        <ThemedText style={styles.infoLabel}>{label}</ThemedText>
        <ThemedText style={styles.infoValue}>{value}</ThemedText>
      </View>
    </View>
  );

  return (
    <ReadPermissionGuard 
      resource={PERMISSION_RESOURCES.STUDENTS}
      fallback={
        <ThemedView style={styles.container}>
          <View style={styles.accessDeniedContainer}>
            <Ionicons name="lock-closed" size={48} color={themeColors['muted-foreground']} />
            <ThemedText style={styles.accessDeniedText}>
              You don't have permission to view student details
            </ThemedText>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ThemedText style={styles.backButtonText}>Go Back</ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>
      }
    >
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: themeColors.card }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={themeColors['card-foreground']} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <ThemedText type="title" style={styles.studentName}>
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

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Basic Information */}
        {renderInfoSection('Basic Information', 'person', (
          <View style={styles.sectionContent}>
            {renderInfoRow('Full Name', `${student.student.first_name} ${student.student.last_name}`, 'person')}
            {renderInfoRow('Admission Number', student.admission_number, 'card')}
            {renderInfoRow('Gender', student.student.gender, 'person')}
            {renderInfoRow('Date of Birth', new Date(student.student.date_of_birth).toLocaleDateString(), 'calendar')}
            {renderInfoRow('Admission Date', new Date(student.admission_date).toLocaleDateString(), 'calendar')}
            {renderInfoRow('Aadhar Number', student.student.aadhar_number, 'card')}
            {renderInfoRow('Caste', student.student.caste, 'people')}
            {renderInfoRow('Community', student.student.community, 'people')}
            {renderInfoRow('Nationality', student.student.nationality, 'flag')}
            {renderInfoRow('Mother Tongue', student.student.mother_tongue, 'language')}
          </View>
        ))}

        {/* Contact Information */}
        {renderInfoSection('Contact Information', 'call', (
          <View style={styles.sectionContent}>
            {renderInfoRow('Address', `${student.address_line1}${student.address_line2 ? ', ' + student.address_line2 : ''}, ${student.city}, ${student.state}`, 'location')}
            {student.is_previous_school && student.previous_school_name && renderInfoRow('Previous School', student.previous_school_name, 'school')}
            {student.is_previous_school && student.previous_class && renderInfoRow('Previous Class', student.previous_class, 'school')}
          </View>
        ))}

        {/* Father Information */}
        {renderInfoSection('Father Information', 'man', (
          <View style={styles.sectionContent}>
            {renderInfoRow('Name', student.father.name, 'person')}
            {renderInfoRow('Email', student.father.email, 'mail')}
            {renderInfoRow('Phone', student.father.phone, 'call')}
            {renderInfoRow('Occupation', student.father.occupation, 'briefcase')}
            {renderInfoRow('Aadhar Number', student.father.aadhar_number, 'card')}
          </View>
        ))}

        {/* Mother Information */}
        {renderInfoSection('Mother Information', 'woman', (
          <View style={styles.sectionContent}>
            {renderInfoRow('Name', student.mother.name, 'person')}
            {renderInfoRow('Email', student.mother.email, 'mail')}
            {renderInfoRow('Phone', student.mother.phone, 'call')}
            {renderInfoRow('Occupation', student.mother.occupation, 'briefcase')}
            {renderInfoRow('Aadhar Number', student.mother.aadhar_number, 'card')}
          </View>
        ))}

        {/* Attendance Summary */}
        {attendance && attendance.length > 0 && renderInfoSection('Recent Attendance', 'checkmark-circle', (
          <View style={styles.sectionContent}>
            {attendance.slice(0, 5).map((record: any) => (
              <View key={record.id} style={styles.attendanceRow}>
                <ThemedText style={styles.attendanceDate}>
                  {new Date(record.date).toLocaleDateString()}
                </ThemedText>
                <View style={[styles.attendanceStatus, {
                  backgroundColor: record.status === 'present' ? '#10B981' :
                                 record.status === 'absent' ? '#EF4444' : '#F59E0B'
                }]}>
                  <ThemedText style={styles.attendanceStatusText}>
                    {record.status}
                  </ThemedText>
                </View>
              </View>
            ))}
          </View>
        ))}

        {/* Certificates */}
        {certificates && certificates.length > 0 && renderInfoSection('Certificates', 'document', (
          <View style={styles.sectionContent}>
            {certificates.map((cert: any) => (
              <TouchableOpacity key={cert.id} style={styles.certificateRow}>
                <View style={styles.certificateInfo}>
                  <ThemedText style={styles.certificateType}>{cert.certificate_type}</ThemedText>
                  <ThemedText style={styles.certificateDate}>
                    Issued: {new Date(cert.issue_date).toLocaleDateString()}
                  </ThemedText>
                </View>
                <Ionicons name="download" size={20} color={themeColors.primary} />
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {/* Documents */}
        {documents && documents.length > 0 && renderInfoSection('Documents', 'folder', (
          <View style={styles.sectionContent}>
            {documents.map((doc: any) => (
              <TouchableOpacity key={doc.id} style={styles.documentRow}>
                <View style={styles.documentInfo}>
                  <ThemedText style={styles.documentType}>{doc.document_type}</ThemedText>
                  <ThemedText style={styles.documentDate}>
                    Uploaded: {new Date(doc.upload_date).toLocaleDateString()}
                  </ThemedText>
                </View>
                <Ionicons name="download" size={20} color={themeColors.primary} />
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {/* Transport */}
        {transport && transport.length > 0 && renderInfoSection('Transport', 'bus', (
          <View style={styles.sectionContent}>
            {transport.map((t: any) => (
              <View key={t.id} style={styles.transportRow}>
                <View style={styles.transportInfo}>
                  <ThemedText style={styles.transportRoute}>{t.route_name}</ThemedText>
                  <ThemedText style={styles.transportStop}>Stop: {t.stop_name}</ThemedText>
                  <ThemedText style={styles.transportTime}>
                    Pickup: {t.pickup_time} | Drop: {t.drop_time}
                  </ThemedText>
                </View>
                <View style={styles.transportFee}>
                  <ThemedText style={styles.feeText}>₹{t.fees}</ThemedText>
                </View>
              </View>
            ))}
          </View>
        ))}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <UpdatePermissionGuard 
            resource={PERMISSION_RESOURCES.STUDENTS}
            fallback={null}
          >
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: themeColors.primary }]}
              onPress={() => Alert.alert('Edit Student', 'Navigate to edit form')}
            >
              <Ionicons name="create" size={20} color="white" />
              <ThemedText style={styles.actionButtonText}>Edit Student</ThemedText>
            </TouchableOpacity>
          </UpdatePermissionGuard>

          <UpdatePermissionGuard 
            resource={PERMISSION_RESOURCES.STUDENT_ATTENDANCE}
            fallback={null}
          >
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#F59E0B' }]}
              onPress={() => Alert.alert('Mark Attendance', 'Navigate to attendance')}
            >
              <Ionicons name="checkmark-circle" size={20} color="white" />
              <ThemedText style={styles.actionButtonText}>Mark Attendance</ThemedText>
            </TouchableOpacity>
          </UpdatePermissionGuard>
        </View>
      </ScrollView>
      </ThemedView>
    </ReadPermissionGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    marginRight: 16,
  },
  backButtonText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '600',
  },
  headerContent: {
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
  scrollView: {
    flex: 1,
    padding: 16,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    marginLeft: 8,
  },
  sectionContent: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoContent: {
    flex: 1,
    marginLeft: 8,
  },
  infoLabel: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
  },
  attendanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  attendanceDate: {
    fontSize: 14,
  },
  attendanceStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  attendanceStatusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  certificateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  certificateInfo: {
    flex: 1,
  },
  certificateType: {
    fontSize: 14,
    fontWeight: '500',
  },
  certificateDate: {
    fontSize: 12,
    opacity: 0.7,
  },
  documentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  documentInfo: {
    flex: 1,
  },
  documentType: {
    fontSize: 14,
    fontWeight: '500',
  },
  documentDate: {
    fontSize: 12,
    opacity: 0.7,
  },
  transportRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  transportInfo: {
    marginBottom: 8,
  },
  transportRoute: {
    fontSize: 14,
    fontWeight: '500',
  },
  transportStop: {
    fontSize: 12,
    opacity: 0.7,
  },
  transportTime: {
    fontSize: 12,
    opacity: 0.7,
  },
  transportFee: {
    alignItems: 'flex-end',
  },
  feeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  actionsContainer: {
    gap: 12,
    marginBottom: 32,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  accessDeniedText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
    opacity: 0.7,
  },
});