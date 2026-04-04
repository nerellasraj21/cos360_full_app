import React from 'react';
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/contexts';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
}

export function ConfirmModal({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  destructive = false,
}: ConfirmModalProps) {
  const { colors, theme } = useTheme();

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.08)' : '#e5e7eb';
  const confirmColor = destructive ? '#ef4444' : colors.primary;
  const confirmBg = destructive
    ? theme === 'dark' ? '#3f1010' : '#fff1f2'
    : theme === 'dark' ? '#1e3a5f' : '#eff6ff';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onCancel}
      >
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <View style={styles.header}>
              <ThemedText style={styles.title}>{title}</ThemedText>
              <ThemedText style={[styles.message, { color: colors['muted-foreground'] }]}>
                {message}
              </ThemedText>
            </View>

            <View style={[styles.divider, { backgroundColor: borderCol }]} />

            <View style={styles.buttons}>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.cancelButton,
                  { borderColor: borderCol, backgroundColor: theme === 'dark' ? '#0f0f1a' : '#f9fafb' },
                ]}
                onPress={onCancel}
                activeOpacity={0.7}
              >
                <ThemedText style={[styles.cancelText, { color: colors['muted-foreground'] }]}>
                  {cancelText}
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.confirmButton, { backgroundColor: confirmBg, borderColor: confirmColor + '40' }]}
                onPress={onConfirm}
                activeOpacity={0.7}
              >
                <ThemedText style={[styles.confirmText, { color: confirmColor }]}>
                  {confirmText}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: 320,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  header: {
    padding: 24,
    paddingBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  divider: {
    height: 1,
    marginHorizontal: 0,
  },
  buttons: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cancelButton: {},
  confirmButton: {},
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
