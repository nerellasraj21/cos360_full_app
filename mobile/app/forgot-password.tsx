import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton, SecondaryButton } from '@/components/buttons';

const BRAND = '#556ee6';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.flex}>
      <StatusBar style="dark" />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Back button */}
        <SecondaryButton
          onPress={() => router.back()}
          icon={<Ionicons name="arrow-back" size={20} color="#374151" />}
          style={{ backgroundColor: 'transparent', borderWidth: 0, alignSelf: 'flex-start', paddingHorizontal: 0 }}
          textStyle={styles.backText}
        >
          Back to Login
        </SecondaryButton>

        {/* Logo area */}
        <View style={styles.logoRow}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>@</Text>
          </View>
          <Text style={styles.logoTitle}>COS360</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name="lock-open-outline" size={32} color={BRAND} />
          </View>
          <Text style={styles.heading}>Forgot Password?</Text>
          <Text style={styles.subtext}>Password reset by email is not available yet.</Text>
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={18} color="#2563eb" style={{ marginTop: 1 }} />
            <Text style={styles.infoText}>
              Please contact your school administrator. They can reset your password and give you a temporary one to sign in with.
            </Text>
          </View>

          <PrimaryButton
            onPress={() => router.replace('/login')}
            fullWidth
            style={{ marginTop: 16 }}
          >
            Back to Login
          </PrimaryButton>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f9fafb' },
  content: { paddingHorizontal: 24 },
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
});
