import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  StyleSheet, Text, TextInput, View, ScrollView,
} from 'react-native';
import { useMutation } from '@tanstack/react-query';

import { AppLayout } from '@/components';
import { useToastContext } from '@/components/ToastProvider';
import { useTheme } from '@/contexts';
import { userProfileApi } from '@/src/api/users';
import { PrimaryButton, IconButton } from '@/components/buttons';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { colors, theme } = useTheme();
  const { showSuccess, showError } = useToastContext();
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.12)' : '#e2e8f0';
  const inputBg   = theme === 'dark' ? '#1a1a2e' : '#f8fafc';

  const [current, setCurrent]   = useState('');
  const [next, setNext]         = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext]       = useState(false);

  const changeMutation = useMutation({
    mutationFn: () => userProfileApi.changePassword({ current_password: current, new_password: next, confirm_password: confirm }),
    onSuccess: () => {
      showSuccess('Password changed successfully');
      router.back();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail ?? 'Failed to change password';
      showError(msg);
    },
  });

  const handleSubmit = () => {
    if (!current.trim()) { showError('Current password is required'); return; }
    if (next.length < 8) { showError('New password must be at least 8 characters'); return; }
    if (next !== confirm) { showError('Passwords do not match'); return; }
    changeMutation.mutate();
  };

  const Field = ({
    label, value, onChange, show, onToggle, placeholder,
  }: {
    label: string; value: string; onChange: (v: string) => void;
    show: boolean; onToggle: () => void; placeholder: string;
  }) => (
    <View style={styles.fieldWrap}>
      <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      <View style={[styles.inputRow, { borderColor: borderCol, backgroundColor: inputBg }]}>
        <TextInput
          style={[styles.input, { color: colors.foreground }]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors['muted-foreground']}
          secureTextEntry={!show}
          autoCapitalize="none"
        />
        <IconButton
          onPress={onToggle}
          icon={<Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors['muted-foreground']} />}
          accessibilityLabel={show ? 'Hide password' : 'Show password'}
          variant="ghost"
          size="sm"
        />
      </View>
    </View>
  );

  return (
    <AppLayout title="Change Password">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.card, { backgroundColor: theme === 'dark' ? '#1a1a2e' : '#fff', borderColor: borderCol }]}>
          <Field
            label="Current Password *"
            value={current}
            onChange={setCurrent}
            show={showCurrent}
            onToggle={() => setShowCurrent((v) => !v)}
            placeholder="Enter current password"
          />
          <Field
            label="New Password *"
            value={next}
            onChange={setNext}
            show={showNext}
            onToggle={() => setShowNext((v) => !v)}
            placeholder="Min 8 characters"
          />
          <Field
            label="Confirm New Password *"
            value={confirm}
            onChange={setConfirm}
            show={showNext}
            onToggle={() => setShowNext((v) => !v)}
            placeholder="Re-enter new password"
          />

          {next.length > 0 && next !== confirm && (
            <Text style={styles.mismatch}>Passwords do not match</Text>
          )}
        </View>

        <PrimaryButton
          onPress={handleSubmit}
          disabled={changeMutation.isPending}
          loading={changeMutation.isPending}
          fullWidth
          style={styles.submitBtn}
          icon={!changeMutation.isPending ? <Ionicons name="lock-closed" size={18} color="white" /> : undefined}
        >
          Change Password
        </PrimaryButton>

      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 20, gap: 4 },
  fieldWrap: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12,
  },
  input: { flex: 1, paddingVertical: 12, fontSize: 14 },
  eyeBtn: { padding: 4 },
  mismatch: { color: '#EF4444', fontSize: 12, marginTop: -8, marginBottom: 4 },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 16, borderRadius: 14,
  },
  submitText: { color: 'white', fontWeight: '700', fontSize: 15 },
});
