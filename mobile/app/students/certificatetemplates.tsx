import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';

import { AppLayout, ScreenAccessGate } from '@/components';
import { ConfirmModal, useConfirmModal } from '@/components/ConfirmModal';
import { useToastContext } from '@/components/ToastProvider';
import { useTheme } from '@/contexts';
import {
  useIssuableCertificateTemplates,
  useCreateIssuableCertificateTemplate,
  useUpdateIssuableCertificateTemplate,
  useDeleteIssuableCertificateTemplate,
} from '@/src/api/hooks/students/certificates';
import type { IssuableCertificateTemplate } from '@/src/api/students';
import { useMobilePermission } from '@/src/hooks/useMobilePermission';

// Mirrors the web app's TemplateManager — CRUD for issuable certificate templates.

type ColorTheme = 'blue' | 'green' | 'red' | 'orange';

const THEME_COLORS: Record<ColorTheme, string> = {
  blue: '#3B82F6',
  green: '#10B981',
  red: '#EF4444',
  orange: '#F97316',
};

// Placeholder variables supported by the certificate engine (parity with web).
const VARIABLE_SUGGESTIONS = [
  'student_name', 'father_name', 'mother_name', 'dob', 'admission_number',
  'class_name', 'section', 'academic_year', 'issue_date', 'school_name',
  'gender_he_she', 'gender_his_her',
];

const isActive = (v: string | boolean | undefined) => v === true || v === 'True';

/** Strips HTML tags for a plain-text preview (mobile has no HTML renderer). */
const toPlainText = (html: string) =>
  html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>(\n)?/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

function CertificateTemplatesScreenContent() {
  const router = useRouter();
  const { colors, theme } = useTheme();
  const { hasPermission } = useMobilePermission();
  const { showError } = useToastContext();
  const { confirm, modalProps: confirmProps } = useConfirmModal();

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';
  const inputBg = theme === 'dark' ? '#0f0f23' : '#f8fafc';

  const canCreate = hasPermission?.('student_certificates', 'create');
  const canUpdate = hasPermission?.('student_certificates', 'update');
  const canDelete = hasPermission?.('student_certificates', 'delete');

  const { data: templates = [], isLoading } = useIssuableCertificateTemplates();
  const createMutation = useCreateIssuableCertificateTemplate();
  const updateMutation = useUpdateIssuableCertificateTemplate();
  const deleteMutation = useDeleteIssuableCertificateTemplate();

  // Form / mode state
  const [editing, setEditing] = useState<IssuableCertificateTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [colorTheme, setColorTheme] = useState<ColorTheme>('blue');
  const [htmlTemplate, setHtmlTemplate] = useState('');
  const bodyRef = useRef<TextInput>(null);
  const bodySelection = useRef({ start: 0, end: 0 });

  // Preview state
  const [previewTemplate, setPreviewTemplate] = useState<IssuableCertificateTemplate | null>(null);

  const showForm = isCreating || !!editing;

  const resetForm = () => {
    setIsCreating(false);
    setEditing(null);
    setName('');
    setColorTheme('blue');
    setHtmlTemplate('');
    bodySelection.current = { start: 0, end: 0 };
  };

  const openCreate = () => {
    resetForm();
    setIsCreating(true);
  };

  const openEdit = (t: IssuableCertificateTemplate) => {
    setEditing(t);
    setIsCreating(false);
    setName(t.name);
    setColorTheme((t.color_theme as ColorTheme) || 'blue');
    setHtmlTemplate(t.html_template ?? '');
  };

  const insertVariable = (v: string) => {
    const token = `{{${v}}}`;
    const { start, end } = bodySelection.current;
    const next = htmlTemplate.slice(0, start) + token + htmlTemplate.slice(end);
    const cursor = start + token.length;
    setHtmlTemplate(next);
    bodySelection.current = { start: cursor, end: cursor };
    setTimeout(() => bodyRef.current?.setNativeProps({ selection: { start: cursor, end: cursor } }), 50);
  };

  const handleSave = () => {
    if (!name.trim()) { showError('Validation', 'Template name is required.'); return; }
    if (!htmlTemplate.trim()) { showError('Validation', 'Certificate content is required.'); return; }
    if (editing) {
      updateMutation.mutate(
        { templateId: editing.id, data: { name: name.trim(), html_template: htmlTemplate, color_theme: colorTheme } },
        { onSuccess: resetForm },
      );
    } else {
      createMutation.mutate(
        { name: name.trim(), html_template: htmlTemplate, color_theme: colorTheme },
        { onSuccess: resetForm },
      );
    }
  };

  const handleDelete = (t: IssuableCertificateTemplate) => {
    confirm({
      title: 'Delete Template?',
      message: `Delete "${t.name}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: () => deleteMutation.mutate(t.id),
    });
  };

  const saving = createMutation.isPending || updateMutation.isPending;

  // ── Create / Edit form ─────────────────────────────────────────────────────
  if (showForm) {
    return (
      <AppLayout title={editing ? 'Edit Template' : 'Create Template'}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Template Name *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: inputBg, color: colors.foreground, borderColor: borderCol }]}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Bonafide Certificate"
            placeholderTextColor={colors['muted-foreground']}
          />

          <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Color Theme</Text>
          <View style={styles.themeRow}>
            {(Object.keys(THEME_COLORS) as ColorTheme[]).map(t => {
              const active = colorTheme === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={[styles.themeChip, { borderColor: active ? THEME_COLORS[t] : borderCol, backgroundColor: active ? THEME_COLORS[t] + '18' : 'transparent' }]}
                  onPress={() => setColorTheme(t)}
                >
                  <View style={[styles.themeDot, { backgroundColor: THEME_COLORS[t] }]} />
                  <Text style={{ color: active ? THEME_COLORS[t] : colors['muted-foreground'], fontSize: 13, fontWeight: '600', textTransform: 'capitalize' }}>
                    {t}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Certificate Content *</Text>
          <Text style={[styles.hint, { color: colors['muted-foreground'] }]}>
            Enter the certificate body (HTML supported). Tap a variable below to insert a dynamic field.
          </Text>
          <TextInput
            ref={bodyRef}
            style={[styles.input, styles.textarea, { backgroundColor: inputBg, color: colors.foreground, borderColor: borderCol, fontFamily: 'monospace' }]}
            value={htmlTemplate}
            onChangeText={setHtmlTemplate}
            onSelectionChange={(e) => { bodySelection.current = e.nativeEvent.selection; }}
            placeholder={'This is to certify that {{student_name}}...'}
            placeholderTextColor={colors['muted-foreground']}
            multiline
            textAlignVertical="top"
          />

          <Text style={[styles.insertLabel, { color: colors['muted-foreground'] }]}>Insert variable:</Text>
          <View style={styles.varWrap}>
            {VARIABLE_SUGGESTIONS.map(v => (
              <TouchableOpacity
                key={v}
                style={[styles.varChip, { backgroundColor: '#556ee618', borderColor: '#556ee640' }]}
                onPress={() => insertVariable(v)}
              >
                <Text style={{ fontSize: 11, color: '#556ee6', fontWeight: '700' }}>{`{{${v}}}`}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.formActions}>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: inputBg, borderColor: borderCol, borderWidth: 1 }]}
              onPress={resetForm}
            >
              <Text style={[styles.btnText, { color: colors['muted-foreground'] }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: '#556ee6', opacity: saving ? 0.5 : 1 }]}
              onPress={handleSave}
              disabled={saving}
            >
              <Ionicons name="save-outline" size={16} color="white" />
              <Text style={[styles.btnText, { color: 'white' }]}>
                {saving ? 'Saving…' : editing ? 'Update Template' : 'Create Template'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
        <ConfirmModal {...confirmProps} />
      </AppLayout>
    );
  }

  // ── List ───────────────────────────────────────────────────────────────────
  return (
    <AppLayout title="Certificate Templates">
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Templates</Text>
          {canCreate && (
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: '#556ee6' }]} onPress={openCreate}>
              <Ionicons name="add" size={16} color="white" />
              <Text style={styles.addBtnText}>Create</Text>
            </TouchableOpacity>
          )}
        </View>

        {isLoading ? (
          <View style={styles.centered}>
            <Text style={{ color: colors['muted-foreground'] }}>Loading templates…</Text>
          </View>
        ) : templates.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="document-text-outline" size={48} color={colors['muted-foreground']} />
            <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>No templates created yet</Text>
            {canCreate && (
              <TouchableOpacity style={[styles.addBtn, { backgroundColor: '#556ee6', marginTop: 14 }]} onPress={openCreate}>
                <Ionicons name="add" size={16} color="white" />
                <Text style={styles.addBtnText}>Create Your First Template</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          templates.map(t => {
            const tc = THEME_COLORS[(t.color_theme as ColorTheme)] ?? '#6B7280';
            const active = isActive(t.is_active);
            const varCount = t.variables_used ? t.variables_used.split(',').filter(Boolean).length : 0;
            return (
              <View key={t.id} style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <View style={styles.cardTop}>
                  <Text style={[styles.cardName, { color: colors.foreground }]} numberOfLines={1}>{t.name}</Text>
                  <View style={[styles.badge, { backgroundColor: tc + '20' }]}>
                    <Text style={[styles.badgeText, { color: tc, textTransform: 'capitalize' }]}>{t.color_theme ?? 'blue'}</Text>
                  </View>
                </View>
                <View style={styles.metaRow}>
                  <View style={[styles.badge, { backgroundColor: active ? '#10B98120' : '#88888820' }]}>
                    <Text style={[styles.badgeText, { color: active ? '#10B981' : '#888' }]}>{active ? 'Active' : 'Inactive'}</Text>
                  </View>
                  {varCount > 0 && (
                    <Text style={[styles.metaText, { color: colors['muted-foreground'] }]}>{varCount} variable{varCount !== 1 ? 's' : ''}</Text>
                  )}
                  {!!t.created_at && (
                    <Text style={[styles.metaText, { color: colors['muted-foreground'] }]}>
                      {new Date(t.created_at).toLocaleDateString()}
                    </Text>
                  )}
                </View>

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={[styles.cardBtn, { borderColor: borderCol }]}
                    onPress={() => setPreviewTemplate(t)}
                  >
                    <Ionicons name="eye-outline" size={15} color="#556ee6" />
                    <Text style={[styles.cardBtnText, { color: '#556ee6' }]}>Preview</Text>
                  </TouchableOpacity>
                  {canUpdate && (
                    <TouchableOpacity
                      style={[styles.cardBtn, { borderColor: borderCol }]}
                      onPress={() => openEdit(t)}
                    >
                      <Ionicons name="pencil-outline" size={15} color="#10B981" />
                      <Text style={[styles.cardBtnText, { color: '#10B981' }]}>Edit</Text>
                    </TouchableOpacity>
                  )}
                  {canDelete && (
                    <TouchableOpacity
                      style={[styles.cardBtn, { borderColor: borderCol }]}
                      onPress={() => handleDelete(t)}
                      disabled={deleteMutation.isPending}
              accessibilityLabel="Delete"
                    >
                      <Ionicons name="trash-outline" size={15} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Preview modal — plain-text rendering (mobile has no HTML renderer) */}
      <Modal visible={!!previewTemplate} animationType="slide" transparent onRequestClose={() => setPreviewTemplate(null)}>
        <View style={styles.overlay}>
          <View style={[styles.modalSheet, { backgroundColor: cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]} numberOfLines={1}>
                {previewTemplate?.name} — Preview
              </Text>
              <TouchableOpacity onPress={() => setPreviewTemplate(null)}
              accessibilityLabel="Close">
                <Ionicons name="close" size={22} color={colors['muted-foreground']} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ padding: 4 }}>
              <Text style={[styles.previewText, { color: colors.foreground }]}>
                {toPlainText(previewTemplate?.html_template ?? '') || 'No content.'}
              </Text>
            </ScrollView>
            <Text style={[styles.hint, { color: colors['muted-foreground'], marginTop: 8 }]}>
              Variables like {'{{student_name}}'} are filled in when a certificate is generated for a student.
            </Text>
          </View>
        </View>
      </Modal>

      <ConfirmModal {...confirmProps} />
    </AppLayout>
  );
}

// Screen-level access control — matches sibling students/certificatetypes.tsx.
// Web parity: template management (TemplateManager) is admin/staff-only —
// students only ever see their own issued certificates (mycertificates.tsx).
export default function CertificateTemplatesScreen() {
  return (
    <ScreenAccessGate
      title="Certificate Templates"
      resources={['certificate_types', 'student_certificates']}
      blockRoles={['student']}
    >
      <CertificateTemplatesScreenContent />
    </ScreenAccessGate>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { color: 'white', fontWeight: '600', fontSize: 13 },
  centered: { alignItems: 'center', justifyContent: 'center', paddingVertical: 56, gap: 8 },
  emptyText: { fontSize: 14, marginTop: 8 },
  card: {
    borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardName: { flex: 1, fontSize: 15, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' },
  metaText: { fontSize: 12 },
  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(128,128,128,0.2)' },
  cardBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 1, borderRadius: 9, paddingVertical: 8, paddingHorizontal: 12, flex: 1 },
  cardBtnText: { fontSize: 12, fontWeight: '600' },
  // form
  fieldLabel: { fontSize: 13, fontWeight: '600', marginTop: 14, marginBottom: 6 },
  hint: { fontSize: 12, marginBottom: 8, lineHeight: 17 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14 },
  textarea: { minHeight: 200 },
  themeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  themeChip: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  themeDot: { width: 12, height: 12, borderRadius: 6 },
  insertLabel: { fontSize: 12, fontWeight: '600', marginTop: 14, marginBottom: 8 },
  varWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  varChip: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
  formActions: { flexDirection: 'row', gap: 10, marginTop: 24 },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 10, paddingVertical: 13 },
  btnText: { fontSize: 14, fontWeight: '700' },
  // preview modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  modalTitle: { flex: 1, fontSize: 16, fontWeight: '700', marginRight: 8 },
  previewText: { fontSize: 14, lineHeight: 22 },
});
