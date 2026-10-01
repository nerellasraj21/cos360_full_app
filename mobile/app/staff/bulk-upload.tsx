import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppLayout } from '@/components';
import { useToastContext } from '@/components/ToastProvider';
import { useTheme } from '@/contexts';
import apiClient from '@/src/api/client';
import { BulkUploadResult, staffApi } from '@/src/api/staff';
import { getValidAccessToken } from '@/services/authUtils';
import { ScreenAccessGate } from '@/components/ScreenAccessGate';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

interface PickedFile {
  uri: string;
  name: string;
  mimeType: string;
}

function StaffBulkUploadScreenContent() {
  const { colors, theme } = useTheme();
  const { showSuccess, showError } = useToastContext();
  const router = useRouter();

  const [file, setFile] = useState<PickedFile | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [result, setResult] = useState<BulkUploadResult | null>(null);

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';

  const uploadMutation = useMutation({
    mutationFn: () => staffApi.bulkUploadEnrollments(file!.uri, file!.mimeType, file!.name),
    onSuccess: (res) => {
      setResult(res);
      setFile(null);
      if (res.errors.length === 0) {
        showSuccess('Upload Complete', `${res.created.length} of ${res.total_rows} staff created successfully.`);
      } else {
        showError('Upload Finished With Errors', `${res.created.length} created, ${res.errors.length} failed. See details below.`);
      }
    },
    onError: (error: any) => {
      showError('Upload Failed', error?.response?.data?.detail || 'Could not process the file.');
    },
  });

  const pickFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: [XLSX_MIME, 'application/vnd.ms-excel'],
        multiple: false,
      });
      if (res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        if (!asset.name.toLowerCase().match(/\.(xlsx|xls)$/)) {
          showError('Error', 'Please select an Excel (.xlsx/.xls) file');
          return;
        }
        setFile({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType || XLSX_MIME });
        setResult(null);
      }
    } catch {
      showError('Error', 'Failed to pick file');
    }
  };

  const downloadTemplate = async () => {
    setDownloading(true);
    try {
      if (Platform.OS === 'web') {
        const blob = await staffApi.getBulkUploadTemplate();
        const w = globalThis as any;
        const url = w.URL.createObjectURL(blob);
        const a = w.document.createElement('a');
        a.href = url;
        a.download = 'staff_bulk_upload_template.xlsx';
        w.document.body.appendChild(a);
        a.click();
        a.remove();
        w.URL.revokeObjectURL(url);
      } else {
        const token = await getValidAccessToken(false);
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        const baseUrl = (apiClient.defaults.baseURL ?? '').replace(/\/$/, '');
        const url = `${baseUrl}/staff/enrollment/bulk-upload/template`;
        const localUri = FileSystem.documentDirectory + 'staff_bulk_upload_template.xlsx';
        const dl = await FileSystem.downloadAsync(url, localUri, { headers });
        await Sharing.shareAsync(dl.uri, { mimeType: XLSX_MIME });
      }
    } catch {
      showError('Error', 'Unable to download template');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <AppLayout title="Bulk Staff Upload">
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Step 1: Template */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
          <View style={styles.stepHeader}>
            <View style={[styles.stepBadge, { backgroundColor: '#556ee618' }]}>
              <Text style={[styles.stepBadgeText, { color: '#556ee6' }]}>1</Text>
            </View>
            <Text style={[styles.stepTitle, { color: colors.foreground }]}>Download Template</Text>
          </View>
          <Text style={[styles.stepDesc, { color: colors['muted-foreground'] }]}>
            Get the Excel template with the required column headers (First Name, Phone, and Address are mandatory).
          </Text>
          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: '#556ee6' }]}
            onPress={downloadTemplate}
            disabled={downloading}
          >
            {downloading ? (
              <ActivityIndicator size="small" color="#556ee6" />
            ) : (
              <Ionicons name="download-outline" size={16} color="#556ee6" />
            )}
            <Text style={[styles.secondaryBtnText, { color: '#556ee6' }]}>
              {downloading ? 'Downloading...' : 'Download Template'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Step 2: Upload */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
          <View style={styles.stepHeader}>
            <View style={[styles.stepBadge, { backgroundColor: '#556ee618' }]}>
              <Text style={[styles.stepBadgeText, { color: '#556ee6' }]}>2</Text>
            </View>
            <Text style={[styles.stepTitle, { color: colors.foreground }]}>Upload Filled File</Text>
          </View>
          <Text style={[styles.stepDesc, { color: colors['muted-foreground'] }]}>
            Each row is validated and created independently — valid rows are created even if others fail.
          </Text>

          <TouchableOpacity
            style={[styles.filePicker, { borderColor: file ? '#556ee6' : borderCol }]}
            onPress={pickFile}
          >
            <Ionicons name="document-attach-outline" size={28} color={file ? '#556ee6' : colors['muted-foreground']} />
            <Text style={[styles.filePickerText, { color: file ? colors.foreground : colors['muted-foreground'] }]}>
              {file ? file.name : 'Tap to select the filled Excel file'}
            </Text>
          </TouchableOpacity>

          <View style={styles.footerRow}>
            <TouchableOpacity
              style={[styles.closeBtn, { borderColor: borderCol }]}
              onPress={() => router.back()}
              disabled={uploadMutation.isPending}
            >
              <Text style={[styles.closeBtnText, { color: colors.foreground }]}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.sendBtn,
                { backgroundColor: '#556ee6', opacity: !file || uploadMutation.isPending ? 0.5 : 1 },
              ]}
              onPress={() => uploadMutation.mutate()}
              disabled={!file || uploadMutation.isPending}
            >
              <Ionicons name="cloud-upload-outline" size={18} color="white" />
              <Text style={styles.sendBtnText}>
                {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Results */}
        {result && (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <Text style={[styles.stepTitle, { color: colors.foreground, marginBottom: 10 }]}>Results</Text>
            <View style={styles.resultRow}>
              <View style={[styles.resultChip, { backgroundColor: '#10B98118' }]}>
                <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                <Text style={[styles.resultChipText, { color: '#10B981' }]}>{result.created.length} created</Text>
              </View>
              <View style={[styles.resultChip, { backgroundColor: result.errors.length ? '#EF444418' : '#88888818' }]}>
                <Ionicons name="alert-circle" size={14} color={result.errors.length ? '#EF4444' : '#888'} />
                <Text style={[styles.resultChipText, { color: result.errors.length ? '#EF4444' : '#888' }]}>
                  {result.errors.length} failed
                </Text>
              </View>
              <View style={[styles.resultChip, { backgroundColor: '#88888818' }]}>
                <Text style={[styles.resultChipText, { color: '#888' }]}>{result.total_rows} total rows</Text>
              </View>
            </View>

            {result.errors.length > 0 && (
              <View style={{ marginTop: 12, gap: 6 }}>
                {result.errors.map((err, i) => (
                  <View key={i} style={[styles.errorRow, { borderColor: '#EF444440' }]}>
                    <Text style={[styles.errorText, { color: '#EF4444' }]}>{err}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={{ height: 48 }} />
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 32 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16 },
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  stepBadge: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  stepBadgeText: { fontSize: 12, fontWeight: '800' },
  stepTitle: { fontSize: 15, fontWeight: '700' },
  stepDesc: { fontSize: 12, lineHeight: 17, marginBottom: 14 },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderRadius: 12, paddingVertical: 12,
  },
  secondaryBtnText: { fontSize: 14, fontWeight: '700' },
  filePicker: {
    borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 12,
    paddingVertical: 24, alignItems: 'center', gap: 8, marginBottom: 14,
  },
  filePickerText: { fontSize: 13, fontWeight: '600', textAlign: 'center', paddingHorizontal: 16 },
  footerRow: { flexDirection: 'row', gap: 10 },
  closeBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderRadius: 12, paddingVertical: 14,
  },
  closeBtnText: { fontSize: 14, fontWeight: '700' },
  sendBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 12, paddingVertical: 14, gap: 8,
  },
  sendBtnText: { color: 'white', fontSize: 14, fontWeight: '700' },
  resultRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  resultChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
  },
  resultChipText: { fontSize: 12, fontWeight: '700' },
  errorRow: { borderWidth: 1, borderRadius: 8, padding: 10 },
  errorText: { fontSize: 12, lineHeight: 17 },
});


// Screen-level access control - see docs/USER_ROLES_WORKFLOW.md.
export default function StaffBulkUploadScreen() {
  return (
    <ScreenAccessGate
      title="Bulk Upload"
      permissions={[['staff', 'create']]}
    >
      <StaffBulkUploadScreenContent />
    </ScreenAccessGate>
  );
}
