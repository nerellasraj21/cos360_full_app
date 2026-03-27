import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BRAND = '#556ee6';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [username, setUsername] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!username.trim()) {
      setError('Please enter your username or email');
      return;
    }
    setError('');
    setSubmitted(true);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="dark" />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back button */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#374151" />
          <Text style={styles.backText}>Back to Login</Text>
        </TouchableOpacity>

        {/* Logo area */}
        <View style={styles.logoRow}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>@</Text>
          </View>
          <Text style={styles.logoTitle}>COS360</Text>
        </View>

        {!submitted ? (
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <Ionicons name="lock-open-outline" size={32} color={BRAND} />
            </View>
            <Text style={styles.heading}>Forgot Password?</Text>
            <Text style={styles.subtext}>
              Enter your username or email address and your school administrator will help you reset your password.
            </Text>

            <Text style={styles.label}>Username / Email</Text>
            <TextInput
              style={[styles.input, error ? styles.inputError : null]}
              placeholder="Enter your username or email"
              placeholderTextColor="#9ca3af"
              value={username}
              onChangeText={(t) => { setUsername(t); setError(''); }}
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="send"
              onSubmitEditing={handleSubmit}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} activeOpacity={0.85}>
              <Ionicons name="mail-outline" size={18} color="white" />
              <Text style={styles.submitBtnText}>Send Reset Request</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            <View style={[styles.iconCircle, { backgroundColor: '#dcfce7' }]}>
              <Ionicons name="checkmark-circle" size={36} color="#16a34a" />
            </View>
            <Text style={styles.heading}>Request Submitted</Text>
            <Text style={styles.subtext}>
              Your password reset request for{' '}
              <Text style={{ fontWeight: '700', color: '#111827' }}>{username}</Text>
              {' '}has been noted.
            </Text>
            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={18} color="#2563eb" style={{ marginTop: 1 }} />
              <Text style={styles.infoText}>
                Please contact your school administrator to complete the password reset. They will provide you with a temporary password.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: '#374151' }]}
              onPress={() => { setUsername(''); setSubmitted(false); }}
            >
              <Text style={styles.submitBtnText}>Try a Different Account</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.loginLink} onPress={() => router.replace('/login')}>
              <Text style={styles.loginLinkText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f9fafb' },
  content: { paddingHorizontal: 24 },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 32,
  },
  backText: { color: '#374151', fontSize: 14, fontWeight: '500' },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 32,
  },
  logoBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: 'white', fontWeight: '900', fontSize: 16 },
  logoTitle: { fontSize: 22, fontWeight: '800', color: '#111827' },
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    alignItems: 'center',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: BRAND + '18',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },
  label: {
    alignSelf: 'flex-start',
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: '#111827',
    marginBottom: 4,
  },
  inputError: { borderColor: '#ef4444' },
  errorText: {
    alignSelf: 'flex-start',
    color: '#ef4444',
    fontSize: 12,
    marginBottom: 8,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BRAND,
    borderRadius: 12,
    paddingVertical: 14,
    width: '100%',
    marginTop: 16,
  },
  submitBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
  infoBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 14,
    width: '100%',
    marginBottom: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1d4ed8',
    lineHeight: 20,
  },
  loginLink: { marginTop: 16 },
  loginLinkText: { color: BRAND, fontWeight: '600', fontSize: 14 },
});
