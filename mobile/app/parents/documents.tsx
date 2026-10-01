import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppLayout } from '@/components';
import { useToastContext } from '@/components/ToastProvider';
import { useAuth, useTheme } from '@/contexts';
import { studentCertificatesApi } from '@/src/api/students';
import { useQuery } from '@tanstack/react-query';
import { ScreenAccessGate } from '@/components/ScreenAccessGate';

function ParentDocumentsScreenContent() {
  const router = useRouter();
  const { colors, theme } = useTheme();
  const { selectedStudent } = useAuth();
  const { showError } = useToastContext();
  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';

  const { data: certs, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['parentCertificates', selectedStudent?.id],
    queryFn: () => studentCertificatesApi.myChildCertificates(selectedStudent!.id),
    enabled: !!selectedStudent?.id,
  });

  const handleDownload = async (certId: string) => {
    try {
      const result = await studentCertificatesApi.downloadCertificate(certId);
      if (result.presigned_url) {
        await Linking.openURL(result.presigned_url);
      }
    } catch {
      showError('Download failed', 'Could not download the document.');
    }
  };

  if (!selectedStudent) {
    return (
      <AppLayout title="Documents">
        <View style={styles.centered}>
          <Ionicons name="person-outline" size={48} color={colors['muted-foreground']} />
          <Text style={[styles.centeredText, { color: colors['muted-foreground'] }]}>
            No child selected.
          </Text>
          <TouchableOpacity style={styles.linkBtn} onPress={() => router.push('/parents/select-child' as any)}>
            <Text style={{ color: '#556ee6', fontWeight: '600' }}>Select a child</Text>
          </TouchableOpacity>
        </View>
      </AppLayout>
    );
  }

  if (isLoading) {
    return (
      <AppLayout title="Documents">
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#556ee6" />
        </View>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={`Documents — ${selectedStudent.name ?? ''}`}>
      <FlatList
        data={certs ?? []}
        keyExtractor={(item) => item.id}
        refreshing={isRefetching}
        onRefresh={refetch}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-outline" size={48} color={colors['muted-foreground']} />
            <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
              No documents or certificates found.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <View style={styles.iconWrap}>
              <Ionicons name="document-text" size={22} color="#556ee6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.docName, { color: colors.foreground }]} numberOfLines={1}>
                {item.type_name}
              </Text>
              {!!item.issue_date && (
                <Text style={[styles.docMeta, { color: colors['muted-foreground'] }]}>
                  Issued: {item.issue_date}
                </Text>
              )}
              {!!item.remarks && (
                <Text style={[styles.docMeta, { color: colors['muted-foreground'] }]} numberOfLines={1}>
                  {item.remarks}
                </Text>
              )}
            </View>
            {!!item.file_path && (
              <TouchableOpacity
                style={styles.dlBtn}
                onPress={() => handleDownload(item.id)}
              accessibilityLabel="Download"
              >
                <Ionicons name="download-outline" size={20} color="#556ee6" />
              </TouchableOpacity>
            )}
          </View>
        )}
      />
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 10, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  centeredText: { fontSize: 15, textAlign: 'center' },
  linkBtn: { marginTop: 4, padding: 8 },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyText: { fontSize: 14, textAlign: 'center' },

  card: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, borderWidth: 1, padding: 14, gap: 12,
  },
  iconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#556ee618', justifyContent: 'center', alignItems: 'center',
  },
  docName: { fontSize: 14, fontWeight: '600', marginBottom: 3 },
  docMeta: { fontSize: 12, lineHeight: 17 },
  dlBtn: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#556ee618', justifyContent: 'center', alignItems: 'center',
  },
});


// Screen-level access control - see docs/USER_ROLES_WORKFLOW.md.
export default function ParentDocumentsScreen() {
  return (
    <ScreenAccessGate
      title="Documents"
      permissions={[
        ['profile', 'read_own'],
        ['students', 'read'],
        ['student_documents', 'read'],
        ['student_documents', 'list'],
        ['student_documents', 'read_related'],
        ['student_documents', 'list_related'],
      ]}
    >
      <ParentDocumentsScreenContent />
    </ScreenAccessGate>
  );
}
