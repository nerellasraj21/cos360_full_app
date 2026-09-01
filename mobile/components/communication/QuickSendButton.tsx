import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useAuth, useTheme } from '@/contexts';
import { Colors } from '@/constants/theme';
import { useToastContext } from '@/components/ToastProvider';
import {
  CommChannel,
  CommunicationTemplate,
  communicationApi,
  SendRequest,
  TargetRef,
  TargetType,
} from '@/src/api/communication';

/**
 * Variables the backend resolves on its own from the recipient record.
 * These are never asked for in the dialog. Mirrors the web app's
 * src/components/communication/QuickSendButton.tsx.
 */
const SYSTEM_VARS = new Set([
  'name',
  'parent_name',
  'student_name',
  'staff_name',
  'class_name',
  'section_name',
]);

const CHANNELS: { value: CommChannel; label: string }[] = [
  { value: 'sms', label: 'SMS' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
];

function buildPreview(body: string, vars: Record<string, string>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_, v: string) =>
    vars[v]?.trim() ? vars[v] : `[${v}]`,
  );
}

export interface QuickSendButtonProps {
  /** Template name to preselect, e.g. 'Holiday' — matched case-insensitively. */
  templateName: string;
  /** Who receives the message. */
  targetType: TargetType;
  targetRef: TargetRef;
  /** Values known from the row — prefill and lock the matching placeholders. */
  variables?: Record<string, string | number | null | undefined>;
  /** Shown in the dialog subtitle so the user can confirm the recipient. */
  recipientLabel?: string;
  title?: string;
}

/**
 * Single-recipient "Send" action reusing the Communication templates + send API.
 * Renders nothing when the user lacks `communications:create`, matching the web app.
 */
export function QuickSendButton({
  templateName,
  targetType,
  targetRef,
  variables,
  recipientLabel,
  title,
}: QuickSendButtonProps) {
  const { theme } = useTheme();
  const themeColors = Colors[theme];
  const { hasPermission } = useAuth();
  const { showSuccess, showError } = useToastContext();
  const canSend = hasPermission('communications', 'create');

  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<CommChannel>('sms');
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [extraVars, setExtraVars] = useState<Record<string, string>>({});

  const { data: templatesData, isLoading: templatesLoading } = useQuery({
    queryKey: ['comm-templates', 'quick-send', channel],
    queryFn: () => communicationApi.getTemplates({ channel, page_size: 100 }),
    enabled: open,
  });

  const sendMutation = useMutation({
    mutationFn: (data: SendRequest) => communicationApi.send(data),
    onSuccess: (res) => {
      showSuccess('Message Queued', `${res.queued_count} message(s) queued successfully.`);
      handleOpenChange(false);
    },
    onError: (error: any) => {
      showError('Send Failed', error?.response?.data?.detail || error?.message || 'Could not send message.');
    },
  });

  const templates = useMemo<CommunicationTemplate[]>(
    () => (templatesData ?? []).filter((t) => t.is_active),
    [templatesData],
  );

  // Prefilled values coming from the row, normalised to strings.
  const prefill = useMemo<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(variables ?? {})) {
      if (v !== null && v !== undefined && String(v).trim() !== '') out[k] = String(v);
    }
    return out;
  }, [variables]);

  // Preselect the template whose name matches `templateName`.
  useEffect(() => {
    if (!open || templates.length === 0) return;
    const wanted = templateName.trim().toLowerCase();
    const match =
      templates.find((t) => t.name.trim().toLowerCase() === wanted) ??
      templates.find((t) => t.name.toLowerCase().includes(wanted));
    setTemplateId(match?.id ?? null);
  }, [open, templates, templateName]);

  const selectedTemplate = templates.find((t) => t.id === templateId) ?? null;

  // Placeholders the user must still fill: not system-resolved, not prefilled.
  const missingVars = useMemo(
    () =>
      selectedTemplate
        ? selectedTemplate.variables.filter((v) => !SYSTEM_VARS.has(v) && !prefill[v])
        : [],
    [selectedTemplate, prefill],
  );

  useEffect(() => {
    setExtraVars({});
  }, [templateId]);

  const mergedVars = { ...prefill, ...extraVars };
  const previewText = selectedTemplate ? buildPreview(selectedTemplate.body, mergedVars) : '';
  const charCount = previewText.length;
  const credits = charCount > 0 ? Math.ceil(charCount / 160) : 0;

  const canSubmit =
    !!selectedTemplate &&
    missingVars.every((v) => !!extraVars[v]?.trim()) &&
    !sendMutation.isPending;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setExtraVars({});
      setTemplateId(null);
    }
  }

  function handleSend() {
    if (!selectedTemplate) return;
    const payloadVars = Object.fromEntries(
      Object.entries(mergedVars).filter(([k]) => !SYSTEM_VARS.has(k)),
    );
    sendMutation.mutate({
      channel,
      target_type: targetType,
      target_ref: targetRef,
      template_id: selectedTemplate.id,
      extra_variables: Object.keys(payloadVars).length ? payloadVars : undefined,
    });
  }

  if (!canSend) return null;

  const buttonTitle = title ?? `Send ${templateName} message`;

  return (
    <>
      <TouchableOpacity
        style={[styles.iconButton, { backgroundColor: themeColors.primary }]}
        onPress={() => setOpen(true)}
        accessibilityLabel={buttonTitle}
      >
        <Ionicons name="send" size={16} color="white" />
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => handleOpenChange(false)}>
        <View style={styles.overlay}>
          <View style={[styles.content, { backgroundColor: themeColors.background }]}>
            <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
              <View style={{ flex: 1 }}>
                <ThemedText type="subtitle">Send Message</ThemedText>
                {recipientLabel && (
                  <ThemedText style={{ color: themeColors['muted-foreground'], marginTop: 2 }}>
                    To: {recipientLabel}
                  </ThemedText>
                )}
              </View>
              <TouchableOpacity onPress={() => handleOpenChange(false)} accessibilityLabel="Close">
                <Ionicons name="close" size={24} color={themeColors['card-foreground']} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.body}>
              {/* Channel */}
              <ThemedText style={styles.label}>Channel</ThemedText>
              <View style={[styles.channelRow, { borderColor: themeColors.border }]}>
                {CHANNELS.map(({ value, label }) => (
                  <TouchableOpacity
                    key={value}
                    style={[
                      styles.channelBtn,
                      channel === value && { backgroundColor: themeColors.primary },
                    ]}
                    onPress={() => setChannel(value)}
                  >
                    <ThemedText
                      style={[
                        styles.channelBtnText,
                        channel === value && { color: 'white', fontWeight: '600' },
                      ]}
                    >
                      {label}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Template */}
              <ThemedText style={styles.label}>Template</ThemedText>
              {templatesLoading ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 }}>
                  <ActivityIndicator size="small" color={themeColors.primary} />
                  <ThemedText style={{ color: themeColors['muted-foreground'] }}>Loading templates…</ThemedText>
                </View>
              ) : templates.length === 0 ? (
                <ThemedText style={{ color: themeColors['muted-foreground'] }}>
                  No active {channel.toUpperCase()} templates. Create one in Communication → Templates.
                </ThemedText>
              ) : (
                <View style={{ gap: 8 }}>
                  {templates.map((t) => (
                    <TouchableOpacity
                      key={t.id}
                      style={[
                        styles.templateOption,
                        { borderColor: themeColors.border },
                        templateId === t.id && { borderColor: themeColors.primary, backgroundColor: themeColors.primary + '10' },
                      ]}
                      onPress={() => setTemplateId(t.id)}
                    >
                      <ThemedText
                        style={templateId === t.id ? { color: themeColors.primary, fontWeight: '600' } : undefined}
                      >
                        {t.name}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Remaining variables */}
              {missingVars.map((varName) => (
                <View key={varName} style={{ marginTop: 12 }}>
                  <ThemedText style={[styles.label, { textTransform: 'capitalize' }]}>
                    {varName.replace(/_/g, ' ')}
                  </ThemedText>
                  <TextInput
                    style={[styles.input, { color: themeColors['card-foreground'], borderColor: themeColors.border }]}
                    placeholder={varName.replace(/_/g, ' ')}
                    placeholderTextColor={themeColors['muted-foreground']}
                    value={extraVars[varName] ?? ''}
                    onChangeText={(text) => setExtraVars((prev) => ({ ...prev, [varName]: text }))}
                  />
                </View>
              ))}

              {/* Preview */}
              <ThemedText style={[styles.label, { marginTop: 12 }]}>Preview</ThemedText>
              <View style={[styles.previewBox, { borderColor: themeColors.border, backgroundColor: themeColors.card }]}>
                {previewText ? (
                  <ThemedText>{previewText}</ThemedText>
                ) : (
                  <ThemedText style={{ color: themeColors['muted-foreground'], fontStyle: 'italic' }}>
                    Select a template to preview the message.
                  </ThemedText>
                )}
              </View>
              {channel === 'sms' && previewText ? (
                <ThemedText style={{ color: themeColors['muted-foreground'], fontSize: 12, marginTop: 4 }}>
                  {charCount} chars · {credits} SMS credit{credits !== 1 ? 's' : ''}
                </ThemedText>
              ) : null}
            </ScrollView>

            <View style={[styles.footer, { borderTopColor: themeColors.border }]}>
              <TouchableOpacity
                style={[styles.footerBtn, { backgroundColor: themeColors.muted }]}
                onPress={() => handleOpenChange(false)}
              >
                <ThemedText>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.footerBtn,
                  { backgroundColor: themeColors.primary },
                  !canSubmit && { opacity: 0.5 },
                ]}
                onPress={handleSend}
                disabled={!canSubmit}
              >
                {sendMutation.isPending ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <ThemedText style={{ color: 'white', fontWeight: '600' }}>Send Now</ThemedText>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

export default QuickSendButton;

const styles = StyleSheet.create({
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
  },
  body: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  channelRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 10,
    padding: 4,
    gap: 4,
    marginBottom: 16,
  },
  channelBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  channelBtnText: {
    fontSize: 14,
  },
  templateOption: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
  },
  previewBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
  },
  footerBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
