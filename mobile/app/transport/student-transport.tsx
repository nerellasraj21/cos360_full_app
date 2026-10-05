import { AppLayout } from '@/components';
import { ConfirmModal, useConfirmModal } from '@/components/ConfirmModal';
import { CreatePermissionGuard, DeletePermissionGuard, ReadOrListPermissionGuard, UpdatePermissionGuard } from '@/components/PermissionGuards';
import { ThemedText } from '@/components/themed-text';
import { useToastContext } from '@/components/ToastProvider';
import CustomDropdown from '@/components/ui/dropdown';
import { useAuth, useTheme } from '@/contexts';
import { routeStopsApi, routesApi, tripsApi } from '@/src/api/masters';
import {
  studentAdmissionsApi,
  studentTransportApi,
  StudentTransportCreate,
  StudentTransportOut,
} from '@/src/api/students';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const AMBER = '#F59E0B';

export default function StudentTransportScreen() {
  const { colors, theme } = useTheme();
  const { showSuccess, showError } = useToastContext();
  const { confirm, modalProps: confirmModalProps } = useConfirmModal();
  const { role, studentId, selectedStudent } = useAuth();
  const qc = useQueryClient();

  const roleName = (role?.name ?? '').toLowerCase().trim();
  const isStudent = roleName === 'student';
  const isParent = ['parent', 'guardian', 'father', 'mother'].includes(roleName);

  const [refreshing, setRefreshing] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editing, setEditing] = useState<StudentTransportOut | null>(null);
  const [form, setForm] = useState({ student_id: '', trip_id: '', stop_id: '', fee_per_term: '' });

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';
  const inputBg = theme === 'dark' ? '#0f0f23' : '#f8fafc';

  // ── Admin / Transport Manager: full list ───────────────────────────────────
  const { data: assignments = [], isLoading, refetch } = useQuery({
    queryKey: ['student-transport-list'],
    queryFn: () => studentTransportApi.listStudentTransport(),
    enabled: !isStudent && !isParent,
  });

  // ── Student: own assignment ────────────────────────────────────────────────
  const { data: myTransport, isLoading: myLoading } = useQuery({
    queryKey: ['my-transport', studentId],
    queryFn: () => studentTransportApi.getTransportByStudent(studentId!),
    enabled: isStudent && !!studentId,
    retry: false,
  });

  // ── Parent: selected child's assignment ───────────────────────────────────
  const { data: childTransport, isLoading: childLoading } = useQuery({
    queryKey: ['child-transport', selectedStudent?.id],
    queryFn: () => studentTransportApi.getTransportByStudent(selectedStudent!.id),
    enabled: isParent && !!selectedStudent?.id,
    retry: false,
  });

  // ── Form dropdowns (admin only) ────────────────────────────────────────────
  const { data: studentsDropdown = [] } = useQuery({
    queryKey: ['students-dropdown-transport'],
    queryFn: () => studentAdmissionsApi.studentsDropdown({ active_only: true }),
    enabled: !isStudent && !isParent,
  });

  const { data: trips = [] } = useQuery({
    queryKey: ['trips-all'],
    queryFn: () => tripsApi.getTrips(),
    enabled: !isStudent && !isParent,
  });

  const { data: routesDropdown = [] } = useQuery({
    queryKey: ['routes-dropdown-transport'],
    queryFn: () => routesApi.getRoutesDropdown(),
    enabled: !isStudent && !isParent,
  });

  const selectedTrip = useMemo(
    () => (trips as any[]).find(t => t.id === form.trip_id),
    [trips, form.trip_id],
  );

  const { data: stops = [] } = useQuery({
    queryKey: ['route-stops-for-trip', selectedTrip?.route_id],
    queryFn: () => routeStopsApi.getRouteStops({ route_id: selectedTrip!.route_id }),
    enabled: !!selectedTrip?.route_id,
  });

  // ── Dropdown options ───────────────────────────────────────────────────────
  const studentOptions = useMemo(
    () => (studentsDropdown as any[]).map(s => ({
      label: s.admission_number ? `${s.display_name} (${s.admission_number})` : (s.display_name || ''),
      value: s.id,
    })),
    [studentsDropdown],
  );

  const tripOptions = useMemo(
    () => (trips as any[]).map(t => {
      const route = (routesDropdown as any[]).find(r => r.id === t.route_id);
      return {
        label: `Trip #${t.trip_number}${route ? ` — ${route.route_name}` : ''}`,
        value: t.id,
      };
    }),
    [trips, routesDropdown],
  );

  const stopOptions = useMemo(
    () => (stops as any[]).map(s => ({ label: s.name || '', value: s.id })),
    [stops],
  );

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: StudentTransportCreate) => studentTransportApi.createStudentTransport(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student-transport-list'] });
      setIsModalVisible(false);
      resetForm();
      showSuccess('Transport assignment created');
    },
    onError: (err: any) => showError('Create failed', err?.response?.data?.detail ?? err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      studentTransportApi.updateStudentTransport(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student-transport-list'] });
      setIsModalVisible(false);
      resetForm();
      showSuccess('Transport assignment updated');
    },
    onError: (err: any) => showError('Update failed', err?.response?.data?.detail ?? err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => studentTransportApi.deleteStudentTransport(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student-transport-list'] });
      showSuccess('Transport assignment deleted');
    },
    onError: (err: any) => showError('Delete failed', err?.response?.data?.detail ?? err.message),
  });

  // ── Helpers ────────────────────────────────────────────────────────────────
  const resetForm = () => {
    setForm({ student_id: '', trip_id: '', stop_id: '', fee_per_term: '' });
    setEditing(null);
  };

  const openCreate = () => { resetForm(); setIsModalVisible(true); };

  const openEdit = (item: StudentTransportOut) => {
    setEditing(item);
    setForm({
      student_id: item.student_id,
      trip_id: item.trip_id,
      stop_id: item.stop_id,
      fee_per_term: String(item.fee_per_term),
    });
    setIsModalVisible(true);
  };

  const handleDelete = (item: StudentTransportOut) => {
    const name = item.student
      ? `${item.student.first_name} ${item.student.last_name}`
      : 'this student';
    confirm({
      title: 'Delete Assignment',
      message: `Remove transport for ${name}?`,
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: () => deleteMutation.mutate(item.id),
    });
  };

  const handleSubmit = () => {
    if (!form.student_id) { showError('Error', 'Student is required'); return; }
    if (!form.trip_id)    { showError('Error', 'Trip is required'); return; }
    if (!form.stop_id)    { showError('Error', 'Stop is required'); return; }
    const fee = parseFloat(form.fee_per_term);
    if (isNaN(fee) || fee <= 0) { showError('Error', 'Enter a valid fee amount'); return; }

    const payload: StudentTransportCreate = {
      student_id: form.student_id,
      trip_id:    form.trip_id,
      stop_id:    form.stop_id,
      fee_per_term: fee,
    };
    editing
      ? updateMutation.mutate({ id: editing.id, data: payload })
      : createMutation.mutate(payload);
  };

  // ── STUDENT: read-only view ────────────────────────────────────────────────
  if (isStudent) {
    return (
      <AppLayout title="My Transport">
        {myLoading ? (
          <View style={styles.centered}><ActivityIndicator color={AMBER} /></View>
        ) : myTransport ? (
          <View style={{ padding: 16 }}>
            <View style={[styles.readCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <InfoRow icon="bus-outline" label={`Route: ${myTransport.trip?.route?.route_name ?? '—'} · Trip #${myTransport.trip?.trip_number ?? '—'}`} colors={colors} />
              <InfoRow icon="location-outline" label={`Stop: ${myTransport.stop?.name ?? '—'}`} colors={colors} />
              {!!myTransport.stop?.pickup_time && <InfoRow icon="time-outline" label={`Pickup: ${myTransport.stop.pickup_time}`} colors={colors} />}
              {!!myTransport.stop?.drop_time && <InfoRow icon="time-outline" label={`Drop: ${myTransport.stop.drop_time}`} colors={colors} />}
              <InfoRow icon="cash-outline" label={`₹${Number(myTransport.fee_per_term).toLocaleString('en-IN')}/term`} colors={colors} />
            </View>
          </View>
        ) : (
          <View style={styles.centered}>
            <Ionicons name="bus-outline" size={48} color={colors['muted-foreground']} />
            <ThemedText style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
              No transport assignment found.
            </ThemedText>
          </View>
        )}
      </AppLayout>
    );
  }

  // ── PARENT: read-only view for selected child ──────────────────────────────
  if (isParent) {
    return (
      <AppLayout title="Child Transport">
        {!selectedStudent ? (
          <View style={styles.centered}>
            <Ionicons name="person-outline" size={48} color={colors['muted-foreground']} />
            <ThemedText style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
              Select a student from the header
            </ThemedText>
          </View>
        ) : childLoading ? (
          <View style={styles.centered}><ActivityIndicator color={AMBER} /></View>
        ) : childTransport ? (
          <View style={{ padding: 16 }}>
            <ThemedText style={{ fontSize: 15, fontWeight: '600', marginBottom: 12, color: colors.foreground }}>
              {selectedStudent.first_name}&apos;s Transport
            </ThemedText>
            <View style={[styles.readCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <InfoRow icon="bus-outline" label={`Route: ${childTransport.trip?.route?.route_name ?? '—'} · Trip #${childTransport.trip?.trip_number ?? '—'}`} colors={colors} />
              <InfoRow icon="location-outline" label={`Stop: ${childTransport.stop?.name ?? '—'}`} colors={colors} />
              {!!childTransport.stop?.pickup_time && <InfoRow icon="time-outline" label={`Pickup: ${childTransport.stop.pickup_time}`} colors={colors} />}
              {!!childTransport.stop?.drop_time && <InfoRow icon="time-outline" label={`Drop: ${childTransport.stop.drop_time}`} colors={colors} />}
              <InfoRow icon="cash-outline" label={`₹${Number(childTransport.fee_per_term).toLocaleString('en-IN')}/term`} colors={colors} />
            </View>
          </View>
        ) : (
          <View style={styles.centered}>
            <Ionicons name="bus-outline" size={48} color={colors['muted-foreground']} />
            <ThemedText style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
              No transport assignment found for {selectedStudent.first_name}.
            </ThemedText>
          </View>
        )}
      </AppLayout>
    );
  }

  // ── ADMIN / TRANSPORT MANAGER: full CRUD ──────────────────────────────────
  const renderItem = ({ item, index }: { item: StudentTransportOut; index: number }) => {
    const studentName = item.student
      ? `${item.student.first_name} ${item.student.last_name}`
      : 'Unknown student';
    return (
      <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
        <View style={styles.cardTop}>
          <View style={[styles.iconBox, { backgroundColor: AMBER + '20' }]}>
            <Ionicons name="person" size={18} color={AMBER} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.serialNo, { color: colors['muted-foreground'] }]}>{index + 1}</Text>
            <Text style={[styles.cardName, { color: colors.foreground }]}>{studentName}</Text>
            <Text style={[styles.cardSub, { color: colors['muted-foreground'] }]}>
              {item.trip?.route?.route_name ?? '—'} · Trip #{item.trip?.trip_number ?? '—'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row' }}>
            <UpdatePermissionGuard resource={PERMISSION_RESOURCES.STUDENT_TRANSPORT} fallback={null} loadingFallback={null}>
              <TouchableOpacity style={styles.iconBtn} onPress={() => openEdit(item)}
              accessibilityLabel="Edit">
                <Ionicons name="create-outline" size={18} color={colors['muted-foreground']} />
              </TouchableOpacity>
            </UpdatePermissionGuard>
            <DeletePermissionGuard resource={PERMISSION_RESOURCES.STUDENT_TRANSPORT} fallback={null} loadingFallback={null}>
              <TouchableOpacity style={styles.iconBtn} onPress={() => handleDelete(item)}
              accessibilityLabel="Delete">
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            </DeletePermissionGuard>
          </View>
        </View>
        <View style={[styles.cardBody, { borderTopColor: borderCol }]}>
          <InfoRow icon="location-outline" label={`Stop: ${item.stop?.name ?? '—'}`} colors={colors} small />
          {!!item.stop?.pickup_time && <InfoRow icon="time-outline" label={`Pickup: ${item.stop.pickup_time}`} colors={colors} small />}
          {!!item.stop?.drop_time && <InfoRow icon="time-outline" label={`Drop: ${item.stop.drop_time}`} colors={colors} small />}
          <InfoRow icon="cash-outline" label={`₹${Number(item.fee_per_term).toLocaleString('en-IN')}/term`} colors={colors} small />
        </View>
      </View>
    );
  };

  const isMutating = createMutation.isPending || updateMutation.isPending;

  return (
    <AppLayout title="Student Transport">
      <ReadOrListPermissionGuard resource={PERMISSION_RESOURCES.STUDENT_TRANSPORT}>
        {/* Action bar */}
        <View style={styles.topBar}>
          <CreatePermissionGuard resource={PERMISSION_RESOURCES.STUDENT_TRANSPORT} fallback={null} loadingFallback={null}>
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: AMBER }]} onPress={openCreate}>
              <Ionicons name="add" size={16} color="white" />
              <Text style={styles.addBtnText}>Add Assignment</Text>
            </TouchableOpacity>
          </CreatePermissionGuard>
        </View>

        {isLoading ? (
          <View style={styles.centered}><ActivityIndicator color={AMBER} size="large" /></View>
        ) : (
          <FlatList
            data={assignments as StudentTransportOut[]}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                tintColor={AMBER}
                onRefresh={async () => {
                  setRefreshing(true);
                  try { await refetch(); } finally { setRefreshing(false); }
                }}
              />
            }
            ListEmptyComponent={
              <View style={styles.centered}>
                <Ionicons name="bus-outline" size={48} color={colors['muted-foreground']} />
                <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
                  No transport assignments found
                </Text>
              </View>
            }
          />
        )}

        {/* Create / Edit Modal */}
        <Modal visible={isModalVisible} animationType="slide" transparent onRequestClose={() => setIsModalVisible(false)}>
          <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={[styles.modal, { backgroundColor: colors.background }]}>
              <View style={styles.modalTop}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                  {editing ? 'Edit Assignment' : 'New Assignment'}
                </Text>
                <TouchableOpacity onPress={() => setIsModalVisible(false)}
              accessibilityLabel="Close">
                  <Ionicons name="close" size={22} color={colors.foreground} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={[styles.label, { color: colors.foreground }]}>Student *</Text>
                <CustomDropdown
                  data={studentOptions}
                  value={form.student_id}
                  onChange={(v: any) => setForm(f => ({ ...f, student_id: v?.toString() ?? '' }))}
                  placeholder="Select student"
                  search
                />

                <Text style={[styles.label, { color: colors.foreground }]}>Trip *</Text>
                <CustomDropdown
                  data={tripOptions}
                  value={form.trip_id}
                  onChange={(v: any) => setForm(f => ({ ...f, trip_id: v?.toString() ?? '', stop_id: '' }))}
                  placeholder="Select trip"
                />

                <Text style={[styles.label, { color: colors.foreground }]}>Stop *</Text>
                <CustomDropdown
                  data={stopOptions}
                  value={form.stop_id}
                  onChange={(v: any) => setForm(f => ({ ...f, stop_id: v?.toString() ?? '' }))}
                  placeholder={form.trip_id ? 'Select stop' : 'Select a trip first'}
                />

                <Text style={[styles.label, { color: colors.foreground }]}>Fee Per Term (₹) *</Text>
                <TextInput
                  style={[styles.input, { color: colors.foreground, borderColor: borderCol, backgroundColor: inputBg }]}
                  placeholder="0"
                  placeholderTextColor={colors['muted-foreground']}
                  value={form.fee_per_term}
                  onChangeText={t => setForm(f => ({ ...f, fee_per_term: t }))}
                  keyboardType="numeric"
                />
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity style={[styles.cancelBtn, { borderColor: borderCol }]} onPress={() => setIsModalVisible(false)}>
                  <Text style={{ color: colors.foreground }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.submitBtn, { backgroundColor: AMBER }]} onPress={handleSubmit} disabled={isMutating}>
                  <Text style={{ color: 'white', fontWeight: '600' }}>
                    {isMutating ? 'Saving...' : editing ? 'Update' : 'Create'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
        <ConfirmModal {...confirmModalProps} />
      </ReadOrListPermissionGuard>
    </AppLayout>
  );
}

// ── Shared info row component ──────────────────────────────────────────────────
function InfoRow({ icon, label, colors, small }: {
  icon: string; label: string; colors: any; small?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Ionicons name={icon as any} size={small ? 13 : 14} color={AMBER} />
      <Text style={{ fontSize: small ? 12 : 13, color: colors['muted-foreground'] }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  serialNo: { fontSize: 10, fontWeight: '600', marginBottom: 2 },
  topBar: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8, alignItems: 'flex-end' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12 },
  addBtnText: { color: 'white', fontSize: 13, fontWeight: '600' },
  list: { padding: 16, paddingTop: 8, gap: 12 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardName: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  cardSub:  { fontSize: 12 },
  cardBody: { borderTopWidth: 1, paddingHorizontal: 14, paddingVertical: 10, gap: 6 },
  readCard: { borderRadius: 12, borderWidth: 1, padding: 16, gap: 10 },
  centered: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  emptyText: { marginTop: 12, fontSize: 14 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32, maxHeight: '90%' },
  modalTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 14 },
  input: { borderWidth: 1, borderRadius: 10, padding: 11, fontSize: 14 },
  modalFooter: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  submitBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
});
