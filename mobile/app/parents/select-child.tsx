import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppLayout } from '@/components';
import { useAuth, useTheme } from '@/contexts';
import { ScreenAccessGate } from '@/components/ScreenAccessGate';

function SelectChildScreenContent() {
  const router = useRouter();
  const { colors, theme } = useTheme();
  const { availableStudents, selectedStudent, selectStudent } = useAuth();
  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';

  const handleSelect = async (student: typeof availableStudents[0]) => {
    await selectStudent(student);
    router.back();
  };

  return (
    <AppLayout title="Select Child">
      <FlatList
        data={availableStudents}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Text style={[styles.hint, { color: colors['muted-foreground'] }]}>
            Select which child you want to view information for.
          </Text>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color={colors['muted-foreground']} />
            <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
              No children linked to your account.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isSelected = selectedStudent?.id === item.id;
          return (
            <TouchableOpacity
              style={[
                styles.card,
                {
                  backgroundColor: isSelected ? '#556ee610' : cardBg,
                  borderColor: isSelected ? '#556ee6' : borderCol,
                  borderWidth: isSelected ? 2 : 1,
                },
              ]}
              onPress={() => handleSelect(item)}
              activeOpacity={0.75}
            >
              <View style={[styles.avatar, { backgroundColor: isSelected ? '#556ee6' : '#94a3b8' }]}>
                <Text style={styles.avatarText}>
                  {(item.name ?? item.first_name ?? '?').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.info}>
                <Text style={[styles.name, { color: colors.foreground }]}>
                  {item.name ?? `${item.first_name} ${item.last_name}`}
                </Text>
                <Text style={[styles.meta, { color: colors['muted-foreground'] }]}>
                  {[item.class_name, item.section_name].filter(Boolean).join(' – ')}
                </Text>
                <Text style={[styles.meta, { color: colors['muted-foreground'] }]}>
                  {item.admission_number}
                </Text>
              </View>
              {isSelected && <Ionicons name="checkmark-circle" size={22} color="#556ee6" />}
            </TouchableOpacity>
          );
        }}
      />
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 10, paddingBottom: 40 },
  hint: { fontSize: 13, lineHeight: 19, marginBottom: 12 },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyText: { fontSize: 14, textAlign: 'center' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: 'white', fontSize: 18, fontWeight: '700' },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  meta: { fontSize: 12, lineHeight: 17 },
});


// Screen-level access control - see docs/USER_ROLES_WORKFLOW.md.
export default function SelectChildScreen() {
  return (
    <ScreenAccessGate
      title="Select Child"
      permissions={[['parent_profile', 'read_own'], ['students', 'read']]}
    >
      <SelectChildScreenContent />
    </ScreenAccessGate>
  );
}
