import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../contexts';
import { authApi } from '../src/api/auth';

const BRAND_COLOR = '#556ee6';
const ACCENT_COLOR = '#556ee6';

const SetPasswordScreen: React.FC = () => {
  const router = useRouter();
  const { refreshAuth } = useAuth();
  const insets = useSafeAreaInsets();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const validate = (): string => {
    if (currentPassword.trim().length === 0) return 'Current password is required';
    if (newPassword.trim().length === 0) return 'New password is required';
    if (newPassword.length < 8) return 'New password must be at least 8 characters';
    if (confirmPassword.trim().length === 0) return 'Please confirm your new password';
    if (newPassword !== confirmPassword) return 'New passwords do not match';
    return '';
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      await authApi.setStaffPassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      await refreshAuth();
      router.replace('/(tabs)');
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || err?.message || 'Failed to update password. Please try again.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style='light' backgroundColor={BRAND_COLOR} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps='handled'
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Header */}
        <View style={[styles.brandSection, { paddingTop: Platform.OS === 'ios' ? insets.top + 12 : 52 }]}>
          <View style={styles.brandDecorCircle1} />
          <View style={styles.brandDecorCircle2} />
          <View style={styles.logoCircle}>
            <Text style={styles.logoInitials}>COS</Text>
            <Text style={styles.logo360}>360</Text>
          </View>
          <Text style={styles.appName}>COS360</Text>
          <Text style={styles.appTagline}>School Management System</Text>
        </View>

        {/* Form Card */}
        <View style={styles.formCard}>
          <View style={styles.formCardHandle} />
          <Text style={styles.cardTitle}>Set New Password</Text>
          <Text style={styles.cardSubtitle}>Please set a new password for your account</Text>

          {/* Current Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Current Password</Text>
            <View style={[styles.inputContainer, currentPassword ? styles.inputFocused : {}]}>
              <Ionicons name='lock-closed-outline' size={20} color={currentPassword ? ACCENT_COLOR : '#9ca3af'} style={styles.inputIcon} />
              <TextInput
                style={[styles.textInput, { flex: 1 }]}
                placeholder='Enter your current password'
                placeholderTextColor='#9ca3af'
                value={currentPassword}
                onChangeText={(v) => { setCurrentPassword(v); setError(''); }}
                secureTextEntry={!showCurrentPassword}
                autoCapitalize='none'
                autoCorrect={false}
                editable={!isLoading}
              />
              <TouchableOpacity onPress={() => setShowCurrentPassword(!showCurrentPassword)} style={styles.eyeButton} disabled={isLoading}>
                <Ionicons name={showCurrentPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color='#9ca3af' />
              </TouchableOpacity>
            </View>
          </View>

          {/* New Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>New Password</Text>
            <View style={[styles.inputContainer, newPassword ? styles.inputFocused : {}]}>
              <Ionicons name='key-outline' size={20} color={newPassword ? ACCENT_COLOR : '#9ca3af'} style={styles.inputIcon} />
              <TextInput
                style={[styles.textInput, { flex: 1 }]}
                placeholder='Enter new password (min 8 characters)'
                placeholderTextColor='#9ca3af'
                value={newPassword}
                onChangeText={(v) => { setNewPassword(v); setError(''); }}
                secureTextEntry={!showNewPassword}
                autoCapitalize='none'
                autoCorrect={false}
                editable={!isLoading}
              />
              <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={styles.eyeButton} disabled={isLoading}>
                <Ionicons name={showNewPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color='#9ca3af' />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm New Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Confirm New Password</Text>
            <View style={[styles.inputContainer, confirmPassword ? styles.inputFocused : {}]}>
              <Ionicons name='checkmark-circle-outline' size={20} color={confirmPassword ? ACCENT_COLOR : '#9ca3af'} style={styles.inputIcon} />
              <TextInput
                style={[styles.textInput, { flex: 1 }]}
                placeholder='Re-enter your new password'
                placeholderTextColor='#9ca3af'
                value={confirmPassword}
                onChangeText={(v) => { setConfirmPassword(v); setError(''); }}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize='none'
                autoCorrect={false}
                editable={!isLoading}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeButton} disabled={isLoading}>
                <Ionicons name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color='#9ca3af' />
              </TouchableOpacity>
            </View>
          </View>

          {/* Error Banner */}
          {error ? (
            <View style={styles.errorBanner}>
              <Ionicons name='warning' size={18} color='white' />
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          ) : null}

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.primaryButton, { opacity: isLoading ? 0.75 : 1, marginTop: 8 }]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color='white' />
            ) : (
              <>
                <Text style={styles.primaryButtonText}>Set Password</Text>
                <Ionicons name='arrow-forward' size={18} color='white' />
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default SetPasswordScreen;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BRAND_COLOR },
  scrollContent: { flexGrow: 1 },
  brandSection: { alignItems: 'center', paddingTop: 52, paddingBottom: 52, overflow: 'hidden' },
  brandDecorCircle1: { position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.05)' },
  brandDecorCircle2: { position: 'absolute', bottom: 20, left: -40, width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(255,255,255,0.04)' },
  logoCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center', marginBottom: 18 },
  logoInitials: { color: 'white', fontSize: 20, fontWeight: '800', letterSpacing: 2, lineHeight: 24 },
  logo360: { color: '#93c5fd', fontSize: 15, fontWeight: '700', letterSpacing: 1, lineHeight: 19 },
  appName: { color: 'white', fontSize: 30, fontWeight: '800', letterSpacing: 3, marginBottom: 6 },
  appTagline: { color: 'rgba(255,255,255,0.65)', fontSize: 13, letterSpacing: 0.5 },
  formCard: { backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 48 },
  formCardHandle: { width: 40, height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
  cardTitle: { fontSize: 26, fontWeight: '700', color: '#111827', marginBottom: 6 },
  cardSubtitle: { fontSize: 14, color: '#6b7280', marginBottom: 28, lineHeight: 20 },
  inputGroup: { marginBottom: 18 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 14, backgroundColor: '#f9fafb', height: 54 },
  inputFocused: { borderColor: ACCENT_COLOR, backgroundColor: '#eff6ff' },
  inputIcon: { marginHorizontal: 14 },
  textInput: { flex: 1, fontSize: 15, color: '#111827', paddingVertical: 0 },
  eyeButton: { padding: 12, marginRight: 2 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ef4444', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16, gap: 10 },
  errorBannerText: { color: 'white', fontSize: 13, flex: 1, lineHeight: 18 },
  primaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: BRAND_COLOR, borderRadius: 16, height: 56, gap: 10, shadowColor: BRAND_COLOR, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 8 },
  primaryButtonText: { color: 'white', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
});
