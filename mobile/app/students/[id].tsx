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
import { AppLayout } from '@/components';
import { useTheme } from '@/contexts';
import {
  studentAdmissionsApi,
  studentAttendanceApi,
  studentCertificatesApi,
  studentDocumentsApi,
  studentTransportApi,
} from '@/src/api';
import { ReadPermissionGuard, UpdatePermissionGuard } from '@/components/PermissionGuards';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';

export default function StudentDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();

  const { data: student, isLoading, error } = useQuery({
    queryKey: ['student', id],
    queryFn: async () => {
      const response = await studentAdmissionsApi.getStudentAdmissions();
      return response.items.find((s: any) => s.id === id) ?? null;
    },
    enabled: !!id,
  });

  const studentEntityId = student?.student?.id;

  const { data: attendance } = useQuery({
    queryKey: ['student-detail-attendance', studentEntityId],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];
      return studentAttendanceApi.getStudentAttendanceFilter(studentEntityId!, {
        start_date: monthAgo,
        end_date: today,
      });
    },
    enabled: !!studentEntityId,
  });

  const { data: certificates } = useQuery({
    queryKey: ['student-detail-certificates', studentEntityId],
    queryFn: () => studentCertificatesApi.getCertificatesByStudent(studentEntityId!),
    enabled: !!studentEntityId,
  });

  const { data: documents } = useQuery({
    queryKey: ['student-detail-documents', studentEntityId],
    queryFn: () => studentDocumentsApi.listDocuments({ student_id: studentEntityId }),
    enabled: !!studentEntityId,
  });

  const { data: transport } = useQuery({
    queryKey: ['student-detail-transport', studentEntityId],
    queryFn: () => studentTransportApi.getStudentTransports({ student_id: studentEntityId }),
    enabled: !!studentEntityId,
  });

  const studentTitle = student
    ? `${student.student.first_name} ${student.student.last_name}`
    : 'Student Details';

  if (isLoading) {
    return (
      <AppLayout title="Student Details">
        <View style={styles.center}>
          <ThemedText>Loading...</ThemedText>
        </View>
      </AppLayout>
    );
  }

  if (error || !student) {
    return (
      <AppLayout title="Student Details">
        <View style={styles.center}>
          <ThemedText style={styles.errorText}>Student not found</ThemedText>
        </View>
      </AppLayout>
    );
  }

  const renderSection = (title: string, icon: string, children: React.ReactNode) => (
    <View style={[styles.section, { backgroundColor: colors.card }]}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon as any} size={18} color={colors.primary} />
        <ThemedText type="subtitle" style={styles.sectionTitle}>{title}</ThemedText>
      </View>
      {children}
    </View>
  );

  const renderRow = (label: string, value: string | null | undefined, icon?: string) =>
    value ? (
      <View style={styles.infoRow}>
        {icon && <Ionicons name={icon as any} size={15} color={colors['muted-foreground']} />}
        <View style={[styles.infoContent, icon ? { marginLeft: 8 } : undefined]}>
          <ThemedText style={styles.infoLabel}>{label}</ThemedText>
          <ThemedText style={styles.infoValue}>{value}</ThemedText>
        </View>
      </View>
    ) : null;

  return (
    <ReadPermissionGuard
      resource={PERMISSION_RESOURCES.STUDENTS}
      fallback={
        <AppLayout title="Student Details">
          <View style={styles.center}>
            <Ionicons name="lock-closed" size={48} color={colors['muted-foreground']} />
            <ThemedText style={styles.accessDeniedText}>
              You don&apos;t have permission to view student details
            </ThemedText>
          </View>
        </AppLayout>
      }
    >
      <AppLayout title={studentTitle}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Status badge row */}
          <View style={[styles.statusRow, { backgroundColor: colors.card }]}>
            <View>
              <ThemedText style={styles.admissionLabel}>
                {student.admission_number ?? '—'}
              </ThemedText>
              <ThemedText style={styles.admissionSub}>Admission Number</ThemedText>
            </View>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: student.is_active ? '#10B981' : '#EF4444' },
              ]}
            >
              <ThemedText style={styles.statusText}>
                {student.is_active ? 'Active' : 'Inactive'}
              </ThemedText>
            </View>
          </View>

          {/* Basic Information */}
          {renderSection('Basic Information', 'person', (
            <View style={styles.rows}>
              {renderRow('Gender', student.student.gender, 'person')}
              {renderRow('Date of Birth',
                student.student.date_of_birth
                  ? new Date(student.student.date_of_birth).toLocaleDateString()
                  : null,
                'calendar',
              )}
              {renderRow('Admission Date',
                new Date(student.admission_date).toLocaleDateString(), 'calendar')}
              {renderRow('Aadhar Number', student.student.aadhar_number, 'card')}
              {renderRow('Caste', student.student.caste, 'people')}
              {renderRow('Community', student.student.community, 'people')}
              {renderRow('Nationality', student.student.nationality, 'flag')}
              {renderRow('Mother Tongue', student.student.mother_tongue, 'language' as any)}
            </View>
          ))}

          {/* Address */}
          {(student.address_line1 || student.city) && renderSection('Address', 'location', (
            <View style={styles.rows}>
              {renderRow('Address',
                [student.address_line1, student.address_line2, student.city, student.state]
                  .filter(Boolean)
                  .join(', '),
                'location',
              )}
              {student.is_previous_school && renderRow('Previous School', student.previous_school_name, 'school')}
              {student.is_previous_school && renderRow('Previous Class', student.previous_class, 'school')}
            </View>
          ))}

          {/* Father */}
          {student.father && renderSection('Father', 'man' as any, (
            <View style={styles.rows}>
              {renderRow('Name', student.father.name, 'person')}
              {renderRow('Phone', student.father.phone, 'call')}
              {renderRow('Email', student.father.email, 'mail')}
              {renderRow('Occupation', student.father.occupation, 'briefcase')}
            </View>
          ))}

          {/* Mother */}
          {student.mother && renderSection('Mother', 'woman' as any, (
            <View style={styles.rows}>
              {renderRow('Name', student.mother.name, 'person')}
              {renderRow('Phone', student.mother.phone, 'call')}
              {renderRow('Email', student.mother.email, 'mail')}
              {renderRow('Occupation', student.mother.occupation, 'briefcase')}
            </View>
          ))}

          {/* Recent Attendance */}
          {attendance && attendance.length > 0 && renderSection('Recent Attendance (30d)', 'checkmark-circle', (
            <View>
              {attendance.slice(0, 7).map((record) => (
                <View
                  key={record.id}
                  style={[styles.attendanceRow, { borderBottomColor: colors.border }]}
                >
                  <ThemedText style={styles.attendanceDate}>
                    {new Date(record.date + 'T00:00:00').toLocaleDateString('en-US', {
                      weekday: 'short', day: 'numeric', month: 'short',
                    })}
                  </ThemedText>
                  <View
                    style={[
                      styles.attendanceStatus,
                      {
                        backgroundColor:
                          record.status === 'present' ? '#10B981'
                          : record.status === 'absent' ? '#EF4444'
                          : '#F59E0B',
                      },
                    ]}
                  >
                    <ThemedText style={styles.attendanceStatusText}>{record.status}</ThemedText>
                  </View>
                </View>
              ))}
            </View>
          ))}

          {/* Certificates */}
          {certificates && certificates.length > 0 && renderSection('Certificates', 'document', (
            <View>
              {certificates.map((cert) => (
                <View key={cert.id} style={styles.listRow}>
                  <View style={styles.listInfo}>
                    <ThemedText style={styles.listTitle}>{cert.type_name || 'Certificate'}</ThemedText>
                    {cert.issue_date && (
                      <ThemedText style={styles.listSub}>
                        Issued: {new Date(cert.issue_date).toLocaleDateString()}
                      </ThemedText>
                    )}
                  </View>
                  <Ionicons name="download-outline" size={20} color={colors.primary} />
                </View>
              ))}
            </View>
          ))}

          {/* Documents */}
          {documents && documents.length > 0 && renderSection('Documents', 'folder', (
            <View>
              {documents.map((doc) => (
                <View key={doc.id} style={styles.listRow}>
                  <View style={styles.listInfo}>
                    <ThemedText style={styles.listTitle}>{doc.document_type}</ThemedText>
                    <ThemedText style={styles.listSub}>
                      {new Date(doc.upload_date).toLocaleDateString()}
                    </ThemedText>
                  </View>
                  <Ionicons name="download-outline" size={20} color={colors.primary} />
                </View>
              ))}
            </View>
          ))}

          {/* Transport */}
          {transport && transport.length > 0 && renderSection('Transport', 'bus', (
            <View>
              {(transport as any[]).map((t) => (
                <View key={t.id} style={styles.transportRow}>
                  <ThemedText style={styles.listTitle}>
                    {t.trip?.route?.route_name ?? `Trip type: ${t.trip_type ?? '—'}`}
                  </ThemedText>
                  <ThemedText style={styles.listSub}>
                    {t.stop?.name
                      ? `Stop: ${t.stop.name}`
                      : `Stop ID: ${t.stop_id ?? '—'}`}
                  </ThemedText>
                  <ThemedText style={styles.feeText}>
                    ₹{t.fee_per_term ?? t.fare_amount ?? 0} / term
                  </ThemedText>
                </View>
              ))}
            </View>
          ))}

          {/* Actions */}
          <View style={styles.actions}>
            <UpdatePermissionGuard resource={PERMISSION_RESOURCES.STUDENTS} fallback={null}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push({ pathname: '/students/admission', params: { id: student.student.id } })}
              >
                <Ionicons name="create" size={18} color="white" />
                <ThemedText style={styles.actionBtnText}>Edit Student</ThemedText>
              </TouchableOpacity>
            </UpdatePermissionGuard>
          </View>
        </ScrollView>
      </AppLayout>
    </ReadPermissionGuard>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    opacity: 0.7,
  },
  accessDeniedText: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 14,
    opacity: 0.65,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  admissionLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  admissionSub: {
    fontSize: 11,
    opacity: 0.5,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    marginLeft: 8,
    fontSize: 15,
  },
  rows: {
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    opacity: 0.55,
    marginBottom: 1,
  },
  infoValue: {
    fontSize: 14,
  },
  attendanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  attendanceDate: {
    fontSize: 13,
  },
  attendanceStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  attendanceStatusText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  listInfo: {
    flex: 1,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  listSub: {
    fontSize: 11,
    opacity: 0.6,
    marginTop: 2,
  },
  transportRow: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  feeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
    marginTop: 2,
  },
  actions: {
    gap: 10,
    marginTop: 4,
    marginBottom: 32,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
  },
  actionBtnText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
});
