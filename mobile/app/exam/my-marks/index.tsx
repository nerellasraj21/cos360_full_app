import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppLayout } from '@/components';
import { useAuth, useTheme } from '@/contexts';
import { examsApi, ExamListItem } from '@/src/api/exam';

export default function MyMarksIndexScreen() {
  const router = useRouter();
  const { colors, theme } = useTheme();
  const { role } = useAuth();

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';

  const roleName = role?.name?.toLowerCase() ?? '';
  const isStudentOrParent =
    roleName === 'student' ||
    ['parent', 'guardian', 'father', 'mother'].includes(roleName);

  // Admin/Teacher has no "my marks" — redirect to exams list
  useEffect(() => {
    if (!isStudentOrParent) {
      router.replace('/exam/list' as any);
    }
  }, [isStudentOrParent]);

  const { data, isLoading } = useQuery({
    queryKey: ['exams', 'published-finalized'],
    queryFn: () => examsApi.list({ exam_status: 'published', size: 50 }),
    enabled: isStudentOrParent,
  });

  const exams = Array.isArray(data) ? data : [];

  const renderItem = ({ item }: { item: ExamListItem }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}
      onPress={() => router.push(`/exam/my-marks/${item.id}` as any)}
      activeOpacity={0.75}
    >
      <View style={[styles.iconBox, { backgroundColor: '#556EE618' }]}>
        <Ionicons name="document-text" size={20} color="#556EE6" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.examName, { color: colors.foreground }]}>{item.exam_name}</Text>
        <Text style={[styles.examMeta, { color: colors['muted-foreground'] }]}>
          {item.exam_type} · {item.nature} · {item.academic_year_title ?? item.academic_year_id}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors['muted-foreground']} />
    </TouchableOpacity>
  );

  return (
    <AppLayout title="My Marks">
      {isLoading ? (
        <View style={styles.centered}>
          <Text style={{ color: colors['muted-foreground'] }}>Loading exams…</Text>
        </View>
      ) : exams.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="document-text-outline" size={48} color={colors['muted-foreground']} />
          <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>No published exams yet</Text>
        </View>
      ) : (
        <FlatList
          data={exams}
          keyExtractor={e => e.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          ListHeaderComponent={
            <Text style={[styles.hint, { color: colors['muted-foreground'] }]}>
              Tap an exam to view your marks
            </Text>
          }
        />
      )}
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { marginTop: 12, fontSize: 14, textAlign: 'center' },
  hint: { fontSize: 13, marginBottom: 12 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14,
    borderWidth: 1, padding: 14, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  iconBox: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  examName: { fontSize: 14, fontWeight: '600', marginBottom: 3 },
  examMeta: { fontSize: 12 },
});
