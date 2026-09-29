import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { AppLayout } from '@/components';
import { useToastContext } from '@/components/ToastProvider';
import { useTheme } from '@/contexts';
import { schoolSettingsApi, SchoolSettingsUpdate } from '@/src/api/schoolSettings';
import { ScreenAccessGate } from '@/components/ScreenAccessGate';

const IMAGE_TYPES = ['image/jpeg', 'image/png'];

type FormState = Omit<SchoolSettingsUpdate, 'installation_date'> & { installation_date: string };

const EMPTY_FORM: FormState = {
  school_name: '', contact_no: '', alt_contact_no: '', school_email: '',
  address: '', city: '', state: '', district: '', pin_code: '', country: '',
  academic_year: '', installation_date: '', school_board: '',
};

function SchoolSettingsScreenContent() {
  const { colors, theme } = useTheme();
  const { showSuccess, showError } = useToastContext();
  const qc = useQueryClient();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';
  const inputBg = theme === 'dark' ? '#1a1a2e' : '#f8fafc';

  const { data: settings, isLoading } = useQuery({
    queryKey: ['school-settings'],
    queryFn: () => schoolSettingsApi.getSettings(),
  });

  useEffect(() => {
    if (settings) {
      setForm({
        school_name: settings.school_name ?? '',
        contact_no: settings.contact_no ?? '',
        alt_contact_no: settings.alt_contact_no ?? '',
        school_email: settings.school_email ?? '',
        address: settings.address ?? '',
        city: settings.city ?? '',
        state: settings.state ?? '',
        district: settings.district ?? '',
        pin_code: settings.pin_code ?? '',
        country: settings.country ?? '',
        academic_year: settings.academic_year ?? '',
        installation_date: settings.installation_date ?? '',
        school_board: settings.school_board ?? '',
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: (data: SchoolSettingsUpdate) => schoolSettingsApi.updateSettings(data),
    onSuccess: (res) => {
      qc.setQueryData(['school-settings'], res);
      showSuccess('Saved', 'School settings have been updated.');
    },
    onError: (error: any) => {
      showError('Save Failed', error?.response?.data?.detail || 'Could not save school settings.');
    },
  });

  const imageMutation = useMutation({
    mutationFn: (vars: { uri: string; mimeType: string }) => schoolSettingsApi.uploadImage(vars.uri, vars.mimeType),
    onSuccess: (res) => {
      qc.setQueryData(['school-settings'], res);
      showSuccess('Uploaded', 'School logo has been updated.');
    },
    onError: () => showError('Upload Failed', 'Could not upload the school logo.'),
    onSettled: () => setUploadingImage(false),
  });

  const signatureMutation = useMutation({
    mutationFn: (vars: { uri: string; mimeType: string }) => schoolSettingsApi.uploadSignature(vars.uri, vars.mimeType),
    onSuccess: (res) => {
      qc.setQueryData(['school-settings'], res);
      showSuccess('Uploaded', 'Principal signature has been updated.');
    },
    onError: () => showError('Upload Failed', 'Could not upload the principal signature.'),
    onSettled: () => setUploadingSignature(false),
  });

  const updateField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const pickAndUpload = async (kind: 'image' | 'signature') => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: IMAGE_TYPES, multiple: false });
      if (!res.assets || res.assets.length === 0) return;
      const asset = res.assets[0];
      const mimeType = asset.mimeType || 'image/jpeg';
      if (kind === 'image') {
        setUploadingImage(true);
        imageMutation.mutate({ uri: asset.uri, mimeType });
      } else {
        setUploadingSignature(true);
        signatureMutation.mutate({ uri: asset.uri, mimeType });
      }
    } catch {
      showError('Error', 'Failed to pick image');
    }
  };

  const handleSave = () => {
    if (!form.school_name?.trim()) { showError('Error', 'School name is required'); return; }
    saveMutation.mutate({
      ...form,
      installation_date: form.installation_date?.trim() || undefined,
    } as SchoolSettingsUpdate);
  };

  const field = (
    label: string,
    key: keyof FormState,
    opts?: { placeholder?: string; keyboardType?: 'default' | 'email-address' | 'phone-pad'; multiline?: boolean },
  ) => (
    <View style={{ marginBottom: 12 }}>
      <Text style={[styles.fieldLabel, { color: colors.foreground }]}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          opts?.multiline && styles.textarea,
          { color: colors.foreground, borderColor: borderCol, backgroundColor: inputBg },
        ]}
        placeholder={opts?.placeholder ?? label}
        placeholderTextColor={colors['muted-foreground']}
        value={form[key] as string}
        onChangeText={(v) => updateField(key, v)}
        keyboardType={opts?.keyboardType}
        multiline={opts?.multiline}
        autoCapitalize={key === 'school_email' ? 'none' : 'sentences'}
      />
    </View>
  );

  if (isLoading) {
    return (
      <AppLayout title="School Settings">
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#556ee6" />
        </View>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="School Settings">
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Logo & Signature */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Branding</Text>
          <View style={styles.brandingRow}>
            <View style={styles.brandingItem}>
              <TouchableOpacity
                style={[styles.imageBox, { borderColor: borderCol, backgroundColor: inputBg }]}
                onPress={() => pickAndUpload('image')}
                disabled={uploadingImage}
              >
                {uploadingImage ? (
                  <ActivityIndicator size="small" color="#556ee6" />
                ) : settings?.image_url ? (
                  <Image source={{ uri: settings.image_url }} style={styles.imagePreview} resizeMode="contain" />
                ) : (
                  <Ionicons name="image-outline" size={28} color={colors['muted-foreground']} />
                )}
              </TouchableOpacity>
              <Text style={[styles.imageLabel, { color: colors['muted-foreground'] }]}>School Logo</Text>
            </View>

            <View style={styles.brandingItem}>
              <TouchableOpacity
                style={[styles.imageBox, { borderColor: borderCol, backgroundColor: inputBg }]}
                onPress={() => pickAndUpload('signature')}
                disabled={uploadingSignature}
              >
                {uploadingSignature ? (
                  <ActivityIndicator size="small" color="#556ee6" />
                ) : settings?.principal_signature_url ? (
                  <Image source={{ uri: settings.principal_signature_url }} style={styles.imagePreview} resizeMode="contain" />
                ) : (
                  <Ionicons name="create-outline" size={28} color={colors['muted-foreground']} />
                )}
              </TouchableOpacity>
              <Text style={[styles.imageLabel, { color: colors['muted-foreground'] }]}>Principal Signature</Text>
            </View>
          </View>
        </View>

        {/* Basic Info */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Basic Information</Text>
          {field('School Name *', 'school_name')}
          {field('Contact Number', 'contact_no', { keyboardType: 'phone-pad' })}
          {field('Alternate Contact Number', 'alt_contact_no', { keyboardType: 'phone-pad' })}
          {field('School Email', 'school_email', { keyboardType: 'email-address' })}
          {field('School Board', 'school_board', { placeholder: 'e.g. CBSE, State Board' })}
          {field('Academic Year', 'academic_year', { placeholder: 'e.g. 2025-2026' })}
          {field('Installation Date', 'installation_date', { placeholder: 'YYYY-MM-DD' })}
        </View>

        {/* Address */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Address</Text>
          {field('Address', 'address', { multiline: true })}
          {field('City', 'city')}
          {field('District', 'district')}
          {field('State', 'state')}
          {field('Pin Code', 'pin_code', { keyboardType: 'phone-pad' })}
          {field('Country', 'country')}
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: '#556ee6', opacity: saveMutation.isPending ? 0.5 : 1 }]}
          onPress={handleSave}
          disabled={saveMutation.isPending}
        >
          <Ionicons name="save-outline" size={18} color="white" />
          <Text style={styles.saveBtnText}>{saveMutation.isPending ? 'Saving...' : 'Save Settings'}</Text>
        </TouchableOpacity>

        <View style={{ height: 48 }} />
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: 16, paddingBottom: 32 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  textarea: { minHeight: 70, textAlignVertical: 'top' },
  brandingRow: { flexDirection: 'row', gap: 16 },
  brandingItem: { flex: 1, alignItems: 'center', gap: 8 },
  imageBox: {
    width: '100%', aspectRatio: 1.6, borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  imagePreview: { width: '100%', height: '100%' },
  imageLabel: { fontSize: 11, fontWeight: '600' },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 14, paddingVertical: 15, gap: 8,
  },
  saveBtnText: { color: 'white', fontSize: 15, fontWeight: '700' },
});


// Screen-level access control - see docs/USER_ROLES_WORKFLOW.md.
export default function SchoolSettingsScreen() {
  return (
    <ScreenAccessGate
      title="School Settings"
      resources={['school_settings']}
    >
      <SchoolSettingsScreenContent />
    </ScreenAccessGate>
  );
}
