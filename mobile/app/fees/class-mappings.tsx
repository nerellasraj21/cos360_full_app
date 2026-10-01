import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppLayout } from '@/components';
import { ConfirmModal, useConfirmModal } from '@/components/ConfirmModal';
import CustomDropdown from '@/components/ui/dropdown';
import { FeeClassMappingResponse, FeeClassMappingRequest, feeClassMappingsApi, feeClassMappingTermAmountsApi, feeStudentMappingsApi, feeTypesApi, feeTermsApi } from '@/src/api/fees';
import { classSectionsApi } from '@/src/api/masters';
import { studentAdmissionsApi } from '@/src/api/students';
import {
  ReadOrListPermissionGuard,
  CreatePermissionGuard,
  UpdatePermissionGuard,
  DeletePermissionGuard
} from '@/components/PermissionGuards';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import { useToastContext } from '@/components/ToastProvider';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState, useMemo, useEffect } from 'react';
import { useAuth, useTheme } from '@/contexts';
import { roleBlocksFees } from '@/src/lib/menuUtils';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';


// ─── Manage Term Amounts Modal ───────────────────────────────────────────────

function TermAmountsModal({
  mapping,
  visible,
  onClose,
  colors,
}: {
  mapping: FeeClassMappingResponse | null;
  visible: boolean;
  onClose: () => void;
  colors: any;
}) {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();

  // Fetch full mapping detail (term amounts)
  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['feeClassMapping', mapping?.id],
    queryFn: () => feeClassMappingsApi.getFeeClassMapping(mapping!.id),
    enabled: !!mapping?.id && visible,
  });

  // Fetch fee type to get fee_term_id
  const { data: feeTypeDetail } = useQuery({
    queryKey: ['feeType', mapping?.fee_type_id],
    queryFn: () => feeTypesApi.getFeeType(mapping!.fee_type_id),
    enabled: !!mapping?.fee_type_id && visible,
  });

  // Fetch fee term to get term dates
  const { data: feeTerm } = useQuery({
    queryKey: ['feeTerm', feeTypeDetail?.fee_term_id],
    queryFn: () => feeTermsApi.getFeeTerm(feeTypeDetail!.fee_term_id),
    enabled: !!feeTypeDetail?.fee_term_id && visible,
  });

  // Web parity: the list endpoint (mapping prop) already embeds the saved term
  // amounts, so prefer it — the single-mapping detail endpoint doesn't always
  // return class_fee_mapping_terms the same way, which was leaving this blank.
  const existingTerms: any[] =
    (mapping?.class_fee_mapping_terms?.length ? mapping.class_fee_mapping_terms : null) ||
    (mapping?.term_amounts?.length ? mapping.term_amounts : null) ||
    (detail?.class_fee_mapping_terms?.length ? detail.class_fee_mapping_terms : null) ||
    (detail?.term_amounts?.length ? detail.term_amounts : null) ||
    [];

  const termDates = feeTerm?.fee_term_dates || [];
  const numberOfTerms = feeTerm?.number_of_terms || existingTerms.length || 1;
  const totalFee = Number(mapping?.total_fee || 0);

  const [amounts, setAmounts] = useState<{ term_date_id: string; term_amount: number; id?: string; term_name?: string; due_date?: string }[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [distributionMode, setDistributionMode] = useState<'equal' | 'manual'>('equal');

  // Fee category name lookup from fee type detail
  const feeCategoryName = (feeTypeDetail as any)?.fee_category_name || null;

  // Initialize amounts when data loads
  React.useEffect(() => {
    if (!visible) { setInitialized(false); setDistributionMode('equal'); return; }
    if (detailLoading || !mapping) return;

    const rows = [];
    const count = termDates.length || numberOfTerms;
    for (let i = 0; i < count; i++) {
      const existing = existingTerms[i];
      const termDate = termDates[i];
      rows.push({
        term_date_id: existing?.term_date_id || existing?.fee_term_date_id || termDate?.id || `term_${i + 1}`,
        term_amount: existing ? (Number(existing.term_amount) || Number(existing.amount) || 0) : 0,
        id: existing?.id,
        // Web parity: rows read "<Term Structure> - Term N", e.g. "Quaterly - Term 1"
        term_name: existing?.term_name
          || (feeTerm?.term_name ? `${feeTerm.term_name} - Term ${i + 1}` : `Term ${i + 1}`),
        due_date: existing?.term_date || termDate?.fee_term_date || null,
      });
    }
    setAmounts(rows);
    setInitialized(true);
  }, [visible, detailLoading, mapping?.id, feeTerm?.id, existingTerms.length]);

  const totalAmount = amounts.reduce((s, a) => s + (a.term_amount || 0), 0);
  const difference = totalAmount - totalFee;
  const isValid = Math.abs(difference) < 0.01;

  const handleEqualDistribution = () => {
    const equal = totalFee / (amounts.length || 1);
    setAmounts(prev => prev.map(a => ({ ...a, term_amount: equal })));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const isUpdate = existingTerms.length > 0 && existingTerms[0]?.id;
      if (isUpdate) {
        return feeClassMappingTermAmountsApi.bulkUpdateTermAmounts({
          fee_class_mapping_id: mapping!.id,
          term_amounts: amounts.map(a => ({ id: a.id!, term_date_id: a.term_date_id, term_amount: a.term_amount })),
        });
      } else {
        return feeClassMappingTermAmountsApi.bulkCreateTermAmounts({
          fee_class_mapping_id: mapping!.id,
          term_amounts: amounts.map(a => ({ term_date_id: a.term_date_id, term_amount: a.term_amount })),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeClassMappings'] });
      queryClient.invalidateQueries({ queryKey: ['feeClassMapping', mapping?.id] });
      showSuccess('Saved', 'Term amounts saved successfully');
      onClose();
    },
    onError: (err: any) => showError('Error', err?.message || 'Failed to save term amounts'),
  });

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={taStyles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ThemedView style={[taStyles.sheet, { backgroundColor: colors.card }]}>
          {/* Header */}
          <View style={[taStyles.header, { borderBottomColor: colors.border }]}>
            <Ionicons name="grid-outline" size={20} color={colors.foreground} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <ThemedText style={[taStyles.title, { color: colors.foreground }]}>Manage Term Amounts</ThemedText>
              {mapping && (
                <ThemedText style={[taStyles.subtitle, { color: colors['muted-foreground'] }]} numberOfLines={1}>
                  {mapping.fee_type_name} · ₹{totalFee.toLocaleString('en-IN')}
                </ThemedText>
              )}
            </View>
            <TouchableOpacity onPress={onClose}
              style={[taStyles.closeBtn, { borderColor: colors.border }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Close">
              <Ionicons name="close" size={18} color={colors['muted-foreground']} />
            </TouchableOpacity>
          </View>

          {detailLoading || !initialized ? (
            <View style={taStyles.loadingBox}>
              <ThemedText style={{ color: colors['muted-foreground'] }}>Loading term amounts...</ThemedText>
            </View>
          ) : (
            <ScrollView style={taStyles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 12 }}>

              {/* Info card — Fee Type / Total Amount / Number of Terms / Term Structure */}
              <View style={[taStyles.infoCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <View style={taStyles.infoRow}>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={[taStyles.infoLabel, { color: colors['muted-foreground'] }]}>Fee Type:</ThemedText>
                    <ThemedText style={[taStyles.infoValue, { color: colors.foreground }]}>{mapping?.fee_type_name || '—'}</ThemedText>
                    {feeCategoryName ? (
                      <ThemedText style={[taStyles.infoSub, { color: colors['muted-foreground'] }]}>{feeCategoryName}</ThemedText>
                    ) : null}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <ThemedText style={[taStyles.infoLabel, { color: colors['muted-foreground'] }]}>Total Amount:</ThemedText>
                    <ThemedText style={[taStyles.infoAmount, { color: colors.foreground }]}>₹{totalFee.toLocaleString('en-IN')}</ThemedText>
                  </View>
                </View>
                <View style={[taStyles.infoRow, { marginTop: 10 }]}>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={[taStyles.infoLabel, { color: colors['muted-foreground'] }]}>Number of Terms:</ThemedText>
                    <ThemedText style={[taStyles.infoValue, { color: colors.foreground }]}>{numberOfTerms}</ThemedText>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <ThemedText style={[taStyles.infoLabel, { color: colors['muted-foreground'] }]}>Term Structure:</ThemedText>
                    <ThemedText style={[taStyles.infoValue, { color: colors.foreground }]}>{feeTerm?.term_name || '—'}</ThemedText>
                  </View>
                </View>
              </View>

              {/* Distribution Options */}
              <ThemedText style={[taStyles.sectionLabel, { color: colors['muted-foreground'] }]}>Distribution Options</ThemedText>
              <View style={taStyles.distributionBtns}>
                <TouchableOpacity
                  style={[taStyles.distBtn, distributionMode === 'equal'
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : { backgroundColor: 'transparent', borderColor: colors.border }]}
                  onPress={() => { handleEqualDistribution(); setDistributionMode('equal'); }}
                >
                  <Ionicons name="grid-outline" size={14} color={distributionMode === 'equal' ? 'white' : colors.foreground} />
                  <ThemedText style={[taStyles.distBtnText, { color: distributionMode === 'equal' ? 'white' : colors.foreground }]}>
                    Equal Distribution
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[taStyles.distBtn, distributionMode === 'manual'
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : { backgroundColor: 'transparent', borderColor: colors.border }]}
                  onPress={() => setDistributionMode('manual')}
                >
                  <ThemedText style={[taStyles.distBtnText, { color: distributionMode === 'manual' ? 'white' : colors.foreground }]}>
                    Manual Entry
                  </ThemedText>
                </TouchableOpacity>
              </View>

              {/* Term-wise Amount Distribution */}
              <ThemedText style={[taStyles.sectionLabel, { color: colors['muted-foreground'] }]}>Term-wise Amount Distribution</ThemedText>
              {amounts.map((item, i) => {
                const dueDate = item.due_date
                  ? `Due: ${new Date(item.due_date).toISOString().slice(0, 10)}`
                  : null;
                return (
                  <View key={i} style={[taStyles.termRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={[taStyles.termName, { color: colors.foreground }]}>{item.term_name || `Term ${i + 1}`}</ThemedText>
                      {dueDate ? (
                        <ThemedText style={[taStyles.termDate, { color: colors['muted-foreground'] }]}>{dueDate}</ThemedText>
                      ) : null}
                    </View>
                    <TextInput
                      style={[taStyles.amountInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                      value={item.term_amount > 0 ? String(item.term_amount) : ''}
                      onChangeText={(t) => {
                        const val = parseFloat(t) || 0;
                        setAmounts(prev => prev.map((a, idx) => idx === i ? { ...a, term_amount: val } : a));
                        setDistributionMode('manual');
                      }}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={colors['muted-foreground']}
                    />
                    <ThemedText style={[taStyles.amountLabel, { color: colors['muted-foreground'] }]}>
                      ₹{Number(item.term_amount || 0).toLocaleString('en-IN')}
                    </ThemedText>
                  </View>
                );
              })}

              {/* Validation summary */}
              <View style={[taStyles.summary, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={[taStyles.summaryLabel, { color: colors['muted-foreground'] }]}>Total Term Amount:</ThemedText>
                  <ThemedText style={[taStyles.summaryValue, { color: colors.foreground }]}>₹{totalAmount.toLocaleString('en-IN')}</ThemedText>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <ThemedText style={[taStyles.summaryLabel, { color: colors['muted-foreground'] }]}>Difference:</ThemedText>
                  <ThemedText style={[taStyles.summaryDiff, { color: isValid ? '#16A34A' : '#EF4444' }]}>
                    {difference >= 0 ? '+' : ''}₹{difference.toFixed(2)}
                  </ThemedText>
                </View>
                <View style={[taStyles.validBadge, { backgroundColor: isValid ? '#16A34A18' : '#EF444418' }]}>
                  <Ionicons name={isValid ? 'checkmark-circle' : 'alert-circle'} size={16} color={isValid ? '#16A34A' : '#EF4444'} />
                  <ThemedText style={[taStyles.validText, { color: isValid ? '#16A34A' : '#EF4444' }]}>
                    {isValid ? 'Valid' : 'Invalid'}
                  </ThemedText>
                </View>
              </View>
            </ScrollView>
          )}

          {/* Footer */}
          <View style={[taStyles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity style={[taStyles.cancelBtn, { borderColor: colors.border }]} onPress={onClose}>
              <ThemedText style={{ color: colors.foreground, fontWeight: '600' }}>Cancel</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[taStyles.saveBtn, { backgroundColor: colors.primary, opacity: (!isValid || saveMutation.isPending) ? 0.5 : 1 }]}
              onPress={() => saveMutation.mutate()}
              disabled={!isValid || saveMutation.isPending}
            >
              <ThemedText style={{ color: 'white', fontWeight: '600' }}>
                {saveMutation.isPending ? 'Saving...' : 'Save Term Amounts'}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const taStyles = StyleSheet.create({
  // Centered dialog (web parity) rather than a bottom sheet. The old
  // slide-up sheet used `flex: 0` + `maxHeight: '92%'` with a `flex: 1`
  // ScrollView inside it — the ScrollView collapsed to zero height, leaving
  // nothing but the dark overlay on screen, which read as a black screen.
  // `flexShrink` on both card and body keeps the card content-sized until it
  // hits maxHeight, then scrolls, so it can never collapse.
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  sheet: { width: '100%', maxWidth: 520, maxHeight: '85%', minHeight: 160, flexShrink: 1, borderRadius: 16, overflow: 'hidden' },
  body: { flexGrow: 0, flexShrink: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-start', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  title: { fontSize: 17, fontWeight: '700' },
  subtitle: { fontSize: 12, marginTop: 2 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  loadingBox: { padding: 32, alignItems: 'center', justifyContent: 'center', minHeight: 120 },
  // Info card
  infoCard: { borderRadius: 10, padding: 14, borderWidth: StyleSheet.hairlineWidth },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start' },
  infoLabel: { fontSize: 12, marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '600' },
  infoSub: { fontSize: 11, marginTop: 1 },
  infoAmount: { fontSize: 20, fontWeight: '700' },
  // Section label
  sectionLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },
  // Distribution buttons
  distributionBtns: { flexDirection: 'row', gap: 10 },
  distBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, gap: 6 },
  distBtnText: { fontSize: 13, fontWeight: '600' },
  // Term rows
  termRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth },
  termName: { fontSize: 14, fontWeight: '600' },
  termDate: { fontSize: 12, marginTop: 2 },
  amountInput: { width: 90, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 15, textAlign: 'right', marginHorizontal: 8 },
  amountLabel: { width: 72, textAlign: 'right', fontSize: 13, fontWeight: '500' },
  // Summary
  summary: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, marginTop: 4, gap: 12 },
  summaryLabel: { fontSize: 11, marginBottom: 2 },
  summaryValue: { fontSize: 16, fontWeight: '700' },
  summaryDiff: { fontSize: 16, fontWeight: '700' },
  validBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  validText: { fontSize: 13, fontWeight: '700' },
  // Footer
  footer: { flexDirection: 'row', gap: 12, padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  saveBtn: { flex: 2, padding: 14, borderRadius: 8, alignItems: 'center' },
});

// ─── Mapping card with expandable term amounts ──────────────────────────────

function MappingCard({
  item, index, colors, classDisplayName, feeCategoryName, onEdit, onDelete,
  onToggleMandatory, mandatoryPending, onManageTermAmounts,
}: {
  item: FeeClassMappingResponse;
  index: number;
  colors: any;
  classDisplayName: string;
  feeCategoryName: string | null;
  onEdit: () => void;
  onDelete: () => void;
  onToggleMandatory: () => void;
  mandatoryPending: boolean;
  onManageTermAmounts: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  // Fetch full detail (including term amounts) only when expanded
  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['feeClassMapping', item.id],
    queryFn: () => feeClassMappingsApi.getFeeClassMapping(item.id),
    enabled: expanded,
    staleTime: 5 * 60 * 1000,
  });

  const isDefault = item.all_by_default;
  const termCount =
    item.term_amounts_count ||
    (item as any).class_fee_mapping_terms_count ||
    item.class_fee_mapping_terms?.length ||
    item.term_amounts?.length ||
    0;
  const termLabel = termCount > 0
    ? `Complete (${termCount} term${termCount !== 1 ? 's' : ''})`
    : 'Not Set';

  // Use detail data when expanded, list data as fallback
  const rawTerms: any[] =
    (detail?.class_fee_mapping_terms?.length ? detail.class_fee_mapping_terms : null) ||
    (detail?.term_amounts?.length ? detail.term_amounts : null) ||
    (item.class_fee_mapping_terms?.length ? item.class_fee_mapping_terms : null) ||
    (item.term_amounts?.length ? item.term_amounts : null) ||
    [];

  return (
    <ThemedView style={[styles.mappingCard, { backgroundColor: colors.card }]}>
      {/* Header row: info area (tap to expand) + action buttons side by side */}
      <View style={styles.cardHeaderRow}>
        {/* Info area — tap to expand/collapse */}
        <TouchableOpacity
          style={{ flex: 1, padding: 12 }}
          onPress={() => setExpanded(!expanded)}
          activeOpacity={0.75}
        >
          <View style={styles.mappingInfo}>
            <ThemedText style={[styles.serialNo, { color: colors['muted-foreground'] }]}>{index + 1}</ThemedText>
            <ThemedText style={[styles.mappingTitle, { color: colors.foreground }]} numberOfLines={2}>
              {classDisplayName}
            </ThemedText>
            <View style={styles.metaRow}>
              <View style={{ flex: 1 }}>
                <ThemedText style={[styles.feeTypeName, { color: colors.foreground }]} numberOfLines={1}>
                  {item.fee_type_name || 'Unknown Fee Type'}
                </ThemedText>
                {feeCategoryName ? (
                  <ThemedText style={[styles.feeCategoryName, { color: colors['muted-foreground'] }]} numberOfLines={1}>
                    {feeCategoryName}
                  </ThemedText>
                ) : null}
              </View>
            </View>
            <View style={styles.badgeRow}>
              <ThemedText style={[styles.totalFee, { color: colors['muted-foreground'] }]}>
                ₹{Number(item.total_fee || 0).toLocaleString('en-IN')}
              </ThemedText>
              <View style={[styles.termBadge, { backgroundColor: termCount > 0 ? '#3B82F620' : '#6B728020' }]}>
                <ThemedText style={[styles.termBadgeText, { color: termCount > 0 ? '#3B82F6' : '#6B7280' }]}>
                  {termLabel}
                </ThemedText>
              </View>
              <Ionicons
                name={expanded ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={colors['muted-foreground']}
              />
            </View>
          </View>
        </TouchableOpacity>

        {/* Action buttons — outside the expand touchable so they always fire */}
        <View style={[styles.actionButtons, { padding: 12, paddingLeft: 4 }]}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#6366F118' }]}
            onPress={onManageTermAmounts}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="grid-outline" size={16} color="#6366F1" />
          </TouchableOpacity>
          <UpdatePermissionGuard resource={PERMISSION_RESOURCES.FEE_CLASS_MAPPINGS} fallback={null} loadingFallback={null}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary + '18' }]}
              onPress={onEdit}
              accessibilityLabel="Edit"
            >
              <Ionicons name="create-outline" size={16} color={colors.primary} />
            </TouchableOpacity>
          </UpdatePermissionGuard>
          <DeletePermissionGuard resource={PERMISSION_RESOURCES.FEE_CLASS_MAPPINGS} fallback={null} loadingFallback={null}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#EF444422' }]}
              onPress={onDelete}
              accessibilityLabel="Delete"
            >
              <Ionicons name="trash-outline" size={16} color="#EF4444" />
            </TouchableOpacity>
          </DeletePermissionGuard>
        </View>
      </View>

      {/* Mandatory toggle — web parity: PATCH toggle-mandatory + bulk apply to class */}
      <UpdatePermissionGuard resource={PERMISSION_RESOURCES.FEE_CLASS_MAPPINGS} fallback={null} loadingFallback={null}>
        <View style={[styles.mandatoryRow, { borderTopColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <ThemedText style={[styles.mandatoryLabel, { color: colors.foreground }]}>
              {isDefault ? 'Mandatory' : 'Optional'}
            </ThemedText>
            <ThemedText style={[styles.mandatoryHint, { color: colors['muted-foreground'] }]}>
              {isDefault
                ? 'Applied to every student in this class'
                : 'Assign this fee to students individually'}
            </ThemedText>
          </View>
          {mandatoryPending && (
            <ActivityIndicator size="small" color={colors['muted-foreground']} style={{ marginRight: 8 }} />
          )}
          <Switch
            value={!!isDefault}
            onValueChange={onToggleMandatory}
            disabled={mandatoryPending}
          />
        </View>
      </UpdatePermissionGuard>

      {/* Expanded term amounts */}
      {expanded && (
        <View style={[styles.termAmountsContainer, { borderTopColor: colors.border }]}>
          {detailLoading ? (
            <ThemedText style={[styles.termAmountName, { color: colors['muted-foreground'], textAlign: 'center', paddingVertical: 8 }]}>
              Loading term amounts...
            </ThemedText>
          ) : rawTerms.length === 0 ? (
            <ThemedText style={[styles.termAmountName, { color: colors['muted-foreground'], textAlign: 'center', paddingVertical: 8 }]}>
              No term amounts found
            </ThemedText>
          ) : rawTerms.map((term: any, i: number) => {
            const amount = term.amount ?? term.term_amount ?? 0;
            const termDate = term.term_date
              ? new Date(term.term_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
              : null;
            const termName = term.term_name || term.fee_term_name || `Term ${i + 1}`;
            return (
              <View key={term.id ?? i} style={[styles.termAmountRow2, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={[styles.termAmountName, { color: colors.foreground }]}>{termName}</ThemedText>
                  {termDate ? (
                    <ThemedText style={[styles.termAmountDate, { color: colors['muted-foreground'] }]}>Due: {termDate}</ThemedText>
                  ) : null}
                </View>
                <ThemedText style={[styles.termAmountValue, { color: colors.foreground }]}>
                  ₹{Number(amount).toLocaleString('en-IN')}
                </ThemedText>
              </View>
            );
          })}
        </View>
      )}
    </ThemedView>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export function ClassMappingsContent() {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingMapping, setEditingMapping] = useState<FeeClassMappingResponse | null>(null);
  // Single top-level instance — mounting one <Modal> per FlatList row (as this
  // used to inside MappingCard) opens a native window per row and can
  // black-screen on open when the row gets recycled by the list.
  const [termAmountsMapping, setTermAmountsMapping] = useState<FeeClassMappingResponse | null>(null);
  const [formData, setFormData] = useState({
    class_id: '',
    fee_type_id: '',
    total_fee: 0,
    all_by_default: false,
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [searchQuery, setSearchQuery] = useState('');


  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const { activeAcademicYearId } = useAcademicYear();
  const { showSuccess, showError } = useToastContext();
  const { confirm: confirmModal, modalProps } = useConfirmModal();

  const { data: classes = [] } = useQuery({
    queryKey: ['classSections'],
    queryFn: () => classSectionsApi.getClassSections({ active_only: true }),
  });

  const { data: mappingsRaw = [], isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['feeClassMappings', activeAcademicYearId],
    queryFn: () => feeClassMappingsApi.getFeeClassMappings(activeAcademicYearId ?? undefined),
  });

  // Build class display name with sections — same as web: "ClassName (A, B, C)"
  const getClassDisplayName = (classId: string, fallback?: string): string => {
    try {
      const classList = Array.isArray(classes) ? classes as any[] : [];
      const classItem = classList.find((c: any) => c?.id === classId);
      if (!classItem) return String(fallback ?? classId ?? '');
      const name = String(classItem?.name ?? fallback ?? classId ?? '');
      const sectionNames = Array.isArray(classItem?.sections)
        ? classItem.sections.map((s: any) => String(s?.name ?? '')).filter(Boolean)
        : [];
      return sectionNames.length > 0 ? `${name} (${sectionNames.join(', ')})` : name;
    } catch {
      return String(fallback ?? classId ?? '');
    }
  };

  const mappings = useMemo(() => {
    const validItems = (Array.isArray(mappingsRaw) ? mappingsRaw : []) as FeeClassMappingResponse[];
    // Filter out Pydantic/API error objects that accidentally end up in the array
    const safeItems = validItems.filter((item: any) => item?.id && typeof item.id === 'string' && !item.type);
    if (!searchQuery.trim()) return safeItems;
    const q = searchQuery.toLowerCase();
    return safeItems.filter((item) => {
      const classDisplay = getClassDisplayName(item.class_id, item.class_name).toLowerCase();
      return classDisplay.includes(q) ||
        (item.fee_type_name || '').toLowerCase().includes(q) ||
        String(item.total_fee || '').includes(q);
    });
  }, [mappingsRaw, searchQuery, classes]);

  const { data: types = [] } = useQuery({
    queryKey: ['feeTypes'],
    queryFn: () => feeTypesApi.getFeeTypes(),
  });

  const createMutation = useMutation({
    mutationFn: feeClassMappingsApi.createFeeClassMapping,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeClassMappings'] });
      setIsModalVisible(false);
      resetForm();
      setErrors({});
      showSuccess('Mapping Created', 'Fee class mapping created successfully');
    },
    onError: (error: any) => {
      console.error('Create error:', error);
      if (error.response?.data?.field_errors) {
        const raw = error.response.data.field_errors;
        const normalized: {[key: string]: string} = {};
        Object.entries(raw).forEach(([k, v]) => {
          normalized[k] = typeof v === 'string' ? v : (v as any)?.msg ?? JSON.stringify(v);
        });
        setErrors(normalized);
      } else {
        showError('Error', error.response?.data?.detail || 'Failed to create fee class mapping');
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FeeClassMappingRequest> }) =>
      feeClassMappingsApi.updateFeeClassMapping(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeClassMappings'] });
      setIsModalVisible(false);
      resetForm();
      setErrors({});
      showSuccess('Mapping Updated', 'Fee class mapping updated successfully');
    },
    onError: (error: any) => {
      console.error('Update error:', error);
      if (error.response?.data?.field_errors) {
        const raw = error.response.data.field_errors;
        const normalized: {[key: string]: string} = {};
        Object.entries(raw).forEach(([k, v]) => {
          normalized[k] = typeof v === 'string' ? v : (v as any)?.msg ?? JSON.stringify(v);
        });
        setErrors(normalized);
      } else {
        showError('Error', error.response?.data?.detail || 'Failed to update fee class mapping');
      }
    },
  });

  /**
   * Mirrors the web ClassMappingTable behaviour: when a class mapping becomes
   * mandatory, the fee is bulk-assigned to every active student of every
   * section in that class.
   */
  const applyMandatoryFeeToAllStudents = async (target: {
    class_id: string;
    fee_type_id: string;
    total_fee: number;
  }) => {
    const classItem = (classes as any[]).find((c: any) => c?.id === target.class_id);
    if (!classItem || !Array.isArray(classItem.sections) || classItem.sections.length === 0) return;

    let successCount = 0;
    let attemptedCount = 0;

    for (const section of classItem.sections) {
      try {
        const sectionStudents = await studentAdmissionsApi.studentsDropdown({
          active_only: true,
          class_id: target.class_id,
          section_id: section.id,
        });
        if (!sectionStudents || sectionStudents.length === 0) continue;

        const result = await feeStudentMappingsApi.bulkCreateFeeStudentMappings({
          student_ids: sectionStudents.map((st) => st.id),
          class_id: target.class_id,
          section_id: section.id,
          fee_type_id: target.fee_type_id,
          total_fee: target.total_fee,
          academic_year_id: activeAcademicYearId || '',
        });
        successCount += result.success_count;
        attemptedCount += result.total_count;
      } catch (err) {
        console.error('[class-mappings] Failed to apply mandatory fee for section', section.id, err);
      }
    }

    queryClient.invalidateQueries({ queryKey: ['feeStudentMappings'] });
    queryClient.invalidateQueries({ queryKey: ['feeCollection'] });

    if (attemptedCount > 0) {
      showSuccess('Fee Applied', `Fee applied to ${successCount} of ${attemptedCount} students in this class.`);
    }
  };

  const [togglingMandatoryId, setTogglingMandatoryId] = useState<string | null>(null);

  const handleToggleMandatory = async (mapping: FeeClassMappingResponse) => {
    setTogglingMandatoryId(mapping.id);
    try {
      const updated = await feeClassMappingsApi.toggleMandatory(mapping.id);
      queryClient.invalidateQueries({ queryKey: ['feeClassMappings'] });
      if (updated?.all_by_default) {
        showSuccess('Marked Mandatory', 'Applying this fee to all students in the class...');
        await applyMandatoryFeeToAllStudents({
          class_id: updated.class_id,
          fee_type_id: updated.fee_type_id,
          total_fee: Number(updated.total_fee ?? mapping.total_fee ?? 0) || 0,
        });
      }
    } catch (error: any) {
      showError('Error', error?.response?.data?.detail || 'Failed to toggle mandatory status');
    } finally {
      setTogglingMandatoryId(null);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: feeClassMappingsApi.deleteFeeClassMapping,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeClassMappings'] });
      showSuccess('Mapping Deleted', 'Fee class mapping deleted successfully');
    },
    onError: () => {
      showError('Error', 'Failed to delete fee class mapping');
    },
  });


  const resetForm = () => {
    setFormData({
      class_id: '',
      fee_type_id: '',
      total_fee: 0,
      all_by_default: false,
    });
    setEditingMapping(null);
  };

  const handleCreate = () => {
    setEditingMapping(null);
    resetForm();
    setIsModalVisible(true);
  };

  const handleEdit = (mapping: FeeClassMappingResponse) => {
    setEditingMapping(mapping);
    setFormData({
      class_id: mapping.class_id,
      fee_type_id: mapping.fee_type_id,
      total_fee: parseFloat(mapping.total_fee || '0') || 0,
      all_by_default: mapping.all_by_default ?? false,
    });
    setIsModalVisible(true);
  };

  const handleDelete = (mapping: FeeClassMappingResponse) => {
    confirmModal({
      title: 'Delete Class Mapping',
      message: `Are you sure you want to delete the mapping for Class ${mapping.class_name}?`,
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: () => deleteMutation.mutate(mapping.id),
    });
  };

  const handleSubmit = () => {
    setErrors({});

    if (!formData.class_id) {
      setErrors({ class_id: 'Class is required' });
      return;
    }
    if (!formData.fee_type_id) {
      setErrors({ fee_type_id: 'Fee type is required' });
      return;
    }
    if (formData.total_fee <= 0) {
      setErrors({ total_fee: 'Total fee must be greater than 0' });
      return;
    }
    if (!activeAcademicYearId) {
      showError('Error', 'No active academic year selected');
      return;
    }

    // Web parity: after saving with all_by_default on, cascade the fee to every
    // student in the class.
    if (editingMapping) {
      const target = {
        class_id: editingMapping.class_id,
        fee_type_id: editingMapping.fee_type_id,
        total_fee: formData.total_fee,
      };
      updateMutation.mutate(
        {
          id: editingMapping.id,
          data: {
            ...formData,
            academic_year_id: activeAcademicYearId!,
          },
        },
        {
          onSuccess: () => {
            if (formData.all_by_default) {
              void applyMandatoryFeeToAllStudents(target);
            }
          },
        },
      );
    } else {
      createMutation.mutate(
        {
          academic_year_id: activeAcademicYearId!,
          all_by_default: formData.all_by_default,
          class_id: formData.class_id,
          fee_type_id: formData.fee_type_id,
          total_fee: formData.total_fee,
        },
        {
          onSuccess: (created) => {
            if (formData.all_by_default) {
              void applyMandatoryFeeToAllStudents({
                class_id: created?.class_id ?? formData.class_id,
                fee_type_id: created?.fee_type_id ?? formData.fee_type_id,
                total_fee: formData.total_fee,
              });
            }
          },
        },
      );
    }
  };



  const renderMappingItem = ({ item, index }: { item: FeeClassMappingResponse; index: number }) => (
    <MappingCard
      key={item.id}
      item={item}
      index={index}
      colors={colors}
      classDisplayName={getClassDisplayName(item.class_id, item.class_name)}
      feeCategoryName={
        (types as any[]).find((t: any) => t.id === item.fee_type_id)?.fee_category_name ||
        (item as any).fee_category_name ||
        null
      }
      onEdit={() => handleEdit(item)}
      onDelete={() => handleDelete(item)}
      onToggleMandatory={() => handleToggleMandatory(item)}
      mandatoryPending={togglingMandatoryId === item.id}
      onManageTermAmounts={() => setTermAmountsMapping(item)}
    />
  );

  const classOptions = classes.map(c => ({ label: c.name, value: c.id }));

  const typeOptions = types.map(type => ({
    label: type.type_name,
    value: type.id,
  }));

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ThemedText>Loading fee class mappings...</ThemedText>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <ThemedText style={{ color: colors.destructive }}>
          Error loading fee class mappings
        </ThemedText>
      </View>
    );
  }

  return (
    <ReadOrListPermissionGuard resource={PERMISSION_RESOURCES.FEE_CLASS_MAPPINGS}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <CreatePermissionGuard resource={PERMISSION_RESOURCES.FEE_CLASS_MAPPINGS} fallback={null} loadingFallback={null}>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={handleCreate}
              accessibilityLabel="Add Mapping"
            >
              <Ionicons name="add" size={15} color="white" />
              <ThemedText style={styles.addButtonText}>
                Add Mapping
              </ThemedText>
            </TouchableOpacity>
          </CreatePermissionGuard>
        </View>

      {/* Search bar */}
      <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={15} color={colors['muted-foreground']} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Search by class, fee type, or amount..."
          placeholderTextColor={colors['muted-foreground']}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}
              accessibilityLabel="Close">
            <Ionicons name="close-circle" size={15} color={colors['muted-foreground']} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Count row */}
      <View style={styles.countRow}>
        <ThemedText style={[styles.countText, { color: colors['muted-foreground'] }]}>
          {searchQuery.trim()
            ? `${mappings.length} of ${(mappingsRaw as FeeClassMappingResponse[]).length} mappings`
            : `Showing ${mappings.length} ${mappings.length === 1 ? 'mapping' : 'mappings'}`}
        </ThemedText>
      </View>

      <FlatList
        data={mappings}
        keyExtractor={(item) => item.id}
        renderItem={renderMappingItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.primary} />}
        ListEmptyComponent={
          <ThemedView style={styles.emptyContainer}>
            <Ionicons name="school-outline" size={48} color={colors['muted-foreground']} />
            <ThemedText style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
              {searchQuery ? 'No mappings match your search' : 'No fee class mappings found'}
            </ThemedText>
          </ThemedView>
        }
      />

      {/* Single Mapping Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ThemedView style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">
                {editingMapping ? 'Edit Class Mapping' : 'Add Class Mapping'}
              </ThemedText>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}
              accessibilityLabel="Close">
                <Ionicons name="close" size={24} color={colors['muted-foreground']} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll} keyboardShouldPersistTaps="handled">
              <View style={styles.form}>
                <ThemedText style={styles.label}>Class *</ThemedText>
                <CustomDropdown
                  data={classOptions}
                  value={formData.class_id}
                  onChange={(value) => setFormData(prev => ({ ...prev, class_id: value as string }))}
                  placeholder="Select class"
                />
                {!!errors.class_id && <ThemedText style={[styles.errorText, { color: colors.destructive }]}>{errors.class_id}</ThemedText>}

                <ThemedText style={styles.label}>Fee Type *</ThemedText>
                <CustomDropdown
                  data={typeOptions}
                  value={formData.fee_type_id}
                  onChange={(value) => setFormData(prev => ({ ...prev, fee_type_id: value as string }))}
                  placeholder="Select fee type"
                />
                {!!errors.fee_type_id && <ThemedText style={[styles.errorText, { color: colors.destructive }]}>{errors.fee_type_id}</ThemedText>}

                <ThemedText style={styles.label}>Total Fee *</ThemedText>
                <TextInput
                  style={[styles.input, {
                    backgroundColor: colors.background,
                    color: colors.foreground,
                    borderColor: colors.border,
                  }]}
                  value={formData.total_fee.toString()}
                  onChangeText={(text) => {
                    const num = parseFloat(text) || 0;
                    setFormData(prev => ({ ...prev, total_fee: num }));
                  }}
                  placeholder="Enter total fee"
                  placeholderTextColor={colors['muted-foreground']}
                  keyboardType="numeric"
                />
                {!!errors.total_fee && <ThemedText style={[styles.errorText, { color: colors.destructive }]}>{errors.total_fee}</ThemedText>}

                <ThemedText style={[styles.hintText, { color: colors['muted-foreground'] }]}>
                  After saving, use the grid icon on the mapping card to split this total into term-wise amounts.
                </ThemedText>

                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => setFormData(prev => ({ ...prev, all_by_default: !prev.all_by_default }))}
                >
                  <View style={[styles.checkbox, { borderColor: colors.border }]}>
                    {formData.all_by_default && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                  </View>
                  <ThemedText style={styles.checkboxLabel}>Apply for all students as default</ThemedText>
                </TouchableOpacity>

              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: colors.border }]}
                onPress={() => setIsModalVisible(false)}
              >
                <ThemedText style={{ color: colors.foreground }}>Cancel</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: colors.primary }]}
                onPress={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                <ThemedText style={styles.submitButtonText}>
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' :
                    editingMapping ? 'Update' : 'Create'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </ThemedView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Term Amounts Modal — single top-level instance shared by every row
          (see termAmountsMapping state above for why it isn't per-row). */}
      {termAmountsMapping && (
        <TermAmountsModal
          mapping={termAmountsMapping}
          visible={!!termAmountsMapping}
          onClose={() => setTermAmountsMapping(null)}
          colors={colors}
        />
      )}

      </ThemedView>
      <ConfirmModal {...modalProps} />
    </ReadOrListPermissionGuard>
  );
}

// Web parity (_app/fee.tsx beforeLoad): teachers cannot access the Fee
// module, even via a deep link into a specific fee sub-screen.
export default function FeeClassMappingsScreen() {
  const router = useRouter();
  const { role } = useAuth();
  const isFeeBlocked = roleBlocksFees(role?.name);

  useEffect(() => {
    if (isFeeBlocked) router.replace('/(tabs)');
  }, [isFeeBlocked, router]);

  if (isFeeBlocked) return null;

  return (
    <AppLayout title="Class Mappings">
      <ClassMappingsContent />
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  serialNo: { fontSize: 10, fontWeight: '600', marginBottom: 4 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 13, padding: 0 },
  countRow: {
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  countText: { fontSize: 12 },
  container: {
    flex: 1,
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bulkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  bulkButtonText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    marginLeft: 4,
    fontSize: 13,
    fontWeight: '600',
    color: 'white',
  },
  selectionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  selectionText: {
    fontWeight: '600',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  clearButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  listContainer: {
    paddingBottom: 20,
  },
  mappingCard: {
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectionIndicator: {
    marginRight: 12,
  },
  mappingInfo: {
    flex: 1,
  },
  mappingDetails: {
    fontSize: 14,
    marginBottom: 2,
  },
  mappingDate: {
    fontSize: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    minWidth: 40,
    minHeight: 40,
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    marginTop: 16,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  formScroll: {
    maxHeight: 400,
  },
  form: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  selectedClasses: {
    marginBottom: 16,
  },
  selectedLabel: {
    marginBottom: 8,
    fontWeight: '600',
  },
  selectedClassChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 4,
  },
  chipText: {
    marginRight: 8,
    fontSize: 14,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  submitButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderRadius: 4,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxLabel: {
    fontSize: 16,
  },
  errorText: {
    fontSize: 14,
    marginTop: 4,
  },
  hintText: {
    fontSize: 12,
    marginTop: -8,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  // Card improvements
  mappingTitle: { fontSize: 14, fontWeight: '700', marginBottom: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  feeTypeName: { fontSize: 13, fontWeight: '500' },
  feeCategoryName: { fontSize: 11, marginTop: 1 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  totalFee: { fontSize: 13, fontWeight: '600' },
  termBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  termBadgeText: { fontSize: 11, fontWeight: '600' },
  assignBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  assignBadgeText: { fontSize: 11, fontWeight: '600' },
  mandatoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  mandatoryLabel: { fontSize: 13, fontWeight: '600' },
  mandatoryHint: { fontSize: 11, marginTop: 1 },
  // Card header clickable row
  cardHeaderRow: { flexDirection: 'row', alignItems: 'flex-start' },
  // Term amounts expandable section
  termAmountsContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  termAmountRow2: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginBottom: 6,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  termAmountName: { fontSize: 13, fontWeight: '500', marginBottom: 2 },
  termAmountDate: { fontSize: 11 },
  termAmountValue: { fontSize: 14, fontWeight: '700' },
});