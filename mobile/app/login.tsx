import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../contexts';
import apiClient from '../src/api/client';
import { getClientSchema, setClientSchema } from '../services/authUtils';

const BRAND_COLOR = '#556ee6';
const ACCENT_COLOR = '#556ee6';

interface AcademicYear {
  id: string;
  title: string;
  is_active: boolean;
}

interface FormData {
  username: string;
  password: string;
  clientName: string;
}

interface FormErrors {
  username?: string;
  password?: string;
  clientName?: string;
  academicYear?: string;
}

const LoginScreen: React.FC = () => {
  const router = useRouter();
  const { login, isLoading, error, clearError, isAuthenticated, requiresPasswordChange } = useAuth();
  const insets = useSafeAreaInsets();

  const [clientSchema, setClientSchemaState] = useState<string>('');
  const [showClientSelection, setShowClientSelection] = useState<boolean>(true);
  const [clientSchemaLoading, setClientSchemaLoading] = useState<boolean>(true);

  const [formData, setFormData] = useState<FormData>({
    username: '',
    password: '',
    clientName: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);

  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string>('');
  const [academicYearLoading, setAcademicYearLoading] = useState(false);
  const [academicYearError, setAcademicYearError] = useState<string>('');
  const [showAcademicYearPicker, setShowAcademicYearPicker] = useState(false);

  useEffect(() => {
    const checkClientSchema = async () => {
      try {
        setClientSchemaLoading(true);
        const storedSchema = await getClientSchema();
        if (storedSchema) {
          setClientSchemaState(storedSchema);
          setFormData(prev => ({ ...prev, clientName: storedSchema }));
          setShowClientSelection(false);
        } else {
          setShowClientSelection(true);
        }
      } catch (err) {
        console.error('Error checking client schema:', err);
        setShowClientSelection(true);
      } finally {
        setClientSchemaLoading(false);
      }
    };
    checkClientSchema();
  }, []);

  useEffect(() => {
    if (isAuthenticated && requiresPasswordChange) {
      router.replace('/set-password');
    } else if (isAuthenticated && !requiresPasswordChange) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, requiresPasswordChange, router]);

  // Clear auth context error when the user changes form data (so stale errors don't persist).
  // clearError is intentionally excluded from deps — it's a stable callback that changes
  // reference on every render (not memoized), which would cause this effect to fire on
  // every render and immediately clear any freshly-set error before the user sees it.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { clearError(); }, [formData]);

  const fetchAcademicYears = async (showErrors = false) => {
    setAcademicYearLoading(true);
    setAcademicYearError('');
    try {
      const response = await apiClient.get('/auth/academic-years');
      const raw = response.data;
      // Handle both plain array and paginated { items: [...] } / { results: [...] }
      const years: AcademicYear[] = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.items)
        ? raw.items
        : Array.isArray(raw?.results)
        ? raw.results
        : [];
      setAcademicYears(years);
      const activeYear = years.find((y: AcademicYear) => y.is_active) || years[0];
      if (activeYear) setSelectedAcademicYearId(activeYear.id);
      if (years.length === 0 && showErrors) setAcademicYearError('No academic years found for this organization.');
    } catch (err: any) {
      console.error('Failed to fetch academic years:', err);
      if (showErrors) {
        const detail = err?.response?.data?.detail || err?.response?.statusText || err?.message || 'Unknown error';
        const status = err?.response?.status ? ` (${err.response.status})` : '';
        setAcademicYearError(`Could not load academic years${status}: ${detail}`);
      }
      // Silently ignore errors on initial load — user can still login without selecting a year
    } finally {
      setAcademicYearLoading(false);
    }
  };

  useEffect(() => {
    if (!showClientSelection) {
      fetchAcademicYears();
    }
  }, [showClientSelection]);

  // When the picker opens and we have no years, retry with errors visible
  useEffect(() => {
    if (showAcademicYearPicker && academicYears.length === 0 && !academicYearLoading) {
      fetchAcademicYears(true);
    }
  }, [showAcademicYearPicker]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.username.trim()) newErrors.username = 'Username is required';
    if (!formData.password.trim()) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (!formData.clientName.trim()) newErrors.clientName = 'Organization name is required';
    if (!selectedAcademicYearId && !academicYearLoading) {
      newErrors.academicYear = academicYears.length === 0
        ? 'Could not load academic years. Tap to retry.'
        : 'Please select an academic year';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const handleClientSchemaSubmit = async () => {
    if (!clientSchema.trim() || isLoading) return;
    try {
      await setClientSchema(clientSchema);
      setFormData(prev => ({ ...prev, clientName: clientSchema }));
      setShowClientSelection(false);
    } catch (err) {
      console.error('Error saving client schema:', err);
    }
  };

  const handleLogin = async () => {
    if (!validateForm()) return;
    try {
      await login(formData.username, formData.password, formData.clientName, selectedAcademicYearId);
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  if (showClientSelection) {
    if (clientSchemaLoading) {
      return (
        <View style={styles.loadingContainer}>
          <StatusBar style="light" backgroundColor={BRAND_COLOR} />
          <View style={styles.loadingLogo}>
            <Image source={require('../assets/images/cos360-logo.jpg')} style={styles.logoImage} resizeMode="contain" />
          </View>
          <ActivityIndicator size="large" color="white" style={{ marginTop: 32 }} />
          <Text style={styles.loadingText}>Initializing...</Text>
        </View>
      );
    }

    return (
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <StatusBar style="light" backgroundColor={BRAND_COLOR} />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand Header */}
          <View style={[styles.brandSection, { paddingTop: Platform.OS === 'ios' ? insets.top + 12 : 52 }]}>
            <View style={styles.brandDecorCircle1} />
            <View style={styles.brandDecorCircle2} />
            <View style={styles.logoCircle}>
              <Image source={require('../assets/images/cos360-logo.jpg')} style={styles.logoImage} resizeMode="contain" />
            </View>
            <Text style={styles.appName}>COS360</Text>
            <Text style={styles.appTagline}>School Management System</Text>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            <View style={styles.formCardHandle} />
            <Text style={styles.cardTitle}>Select Organization</Text>
            <Text style={styles.cardSubtitle}>Enter your organization code to get started</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Organization Code</Text>
              <View style={[styles.inputContainer, clientSchema ? { borderColor: ACCENT_COLOR } : {}]}>
                <Ionicons name="business-outline" size={20} color={clientSchema ? ACCENT_COLOR : '#9ca3af'} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. school_name"
                  placeholderTextColor="#9ca3af"
                  value={clientSchema}
                  onChangeText={setClientSchemaState}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onSubmitEditing={handleClientSchemaSubmit}
                  returnKeyType="done"
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, { opacity: clientSchema.trim() ? 1 : 0.5 }]}
              onPress={handleClientSchemaSubmit}
              disabled={!clientSchema.trim() || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Continue</Text>
                  <Ionicons name="arrow-forward" size={18} color="white" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" backgroundColor={BRAND_COLOR} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Header */}
        <View style={[styles.brandSection, { paddingTop: Platform.OS === 'ios' ? insets.top + 12 : 52 }]}>
          <View style={styles.brandDecorCircle1} />
          <View style={styles.brandDecorCircle2} />
          <View style={styles.logoCircle}>
            <Image source={require('../assets/images/cos360-logo.jpg')} style={styles.logoImage} resizeMode="contain" />
          </View>
          <Text style={styles.appName}>COS360</Text>
          <Text style={styles.appTagline}>School Management System</Text>
        </View>

        {/* Form Card */}
        <View style={styles.formCard}>
          <View style={styles.formCardHandle} />
          <Text style={styles.cardTitle}>Welcome Back!</Text>
          <Text style={styles.cardSubtitle}>Sign in to your account to continue</Text>

          {/* Username */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Username</Text>
            <View style={[styles.inputContainer, errors.username ? styles.inputError : formData.username ? styles.inputFocused : {}]}>
              <Ionicons name="person-outline" size={20} color={errors.username ? '#ef4444' : formData.username ? ACCENT_COLOR : '#9ca3af'} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Enter your username"
                placeholderTextColor="#9ca3af"
                value={formData.username}
                onChangeText={(v) => handleInputChange('username', v)}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>
            {errors.username && (
              <View style={styles.fieldErrorRow}>
                <Ionicons name="alert-circle" size={12} color="#ef4444" />
                <Text style={styles.fieldErrorText}>{errors.username}</Text>
              </View>
            )}
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={[styles.inputContainer, errors.password ? styles.inputError : formData.password ? styles.inputFocused : {}]}>
              <Ionicons name="lock-closed-outline" size={20} color={errors.password ? '#ef4444' : formData.password ? ACCENT_COLOR : '#9ca3af'} style={styles.inputIcon} />
              <TextInput
                style={[styles.textInput, { flex: 1 }]}
                placeholder="Enter your password"
                placeholderTextColor="#9ca3af"
                value={formData.password}
                onChangeText={(v) => handleInputChange('password', v)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton} disabled={isLoading}>
                <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color="#9ca3af" />
              </TouchableOpacity>
            </View>
            {errors.password && (
              <View style={styles.fieldErrorRow}>
                <Ionicons name="alert-circle" size={12} color="#ef4444" />
                <Text style={styles.fieldErrorText}>{errors.password}</Text>
              </View>
            )}
          </View>

          {/* Academic Year */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Academic Year</Text>
            <TouchableOpacity
              style={[
                styles.inputContainer,
                errors.academicYear ? styles.inputError : selectedAcademicYearId ? styles.inputFocused : {},
              ]}
              onPress={() => {
                setErrors(prev => ({ ...prev, academicYear: undefined }));
                setShowAcademicYearPicker(true);
              }}
              disabled={isLoading || academicYearLoading}
            >
              <Ionicons
                name="calendar-outline"
                size={20}
                color={errors.academicYear ? '#ef4444' : selectedAcademicYearId ? ACCENT_COLOR : '#9ca3af'}
                style={styles.inputIcon}
              />
              {academicYearLoading ? (
                <ActivityIndicator size="small" color={ACCENT_COLOR} style={{ flex: 1 }} />
              ) : (
                <Text style={[styles.textInput, { color: selectedAcademicYearId ? '#111827' : '#9ca3af' }]}>
                  {academicYears.find(y => y.id === selectedAcademicYearId)?.title || 'Select academic year'}
                </Text>
              )}
              <Ionicons name="chevron-down" size={18} color="#9ca3af" style={{ marginRight: 12 }} />
            </TouchableOpacity>
            {errors.academicYear && (
              <View style={styles.fieldErrorRow}>
                <Ionicons name="alert-circle" size={12} color="#ef4444" />
                <Text style={styles.fieldErrorText}>{errors.academicYear}</Text>
              </View>
            )}
          </View>

          {/* Client Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Organization Name</Text>
            <View style={[styles.inputContainer, errors.clientName ? styles.inputError : formData.clientName ? styles.inputFocused : {}]}>
              <Ionicons name="shield-checkmark-outline" size={20} color={errors.clientName ? '#ef4444' : formData.clientName ? ACCENT_COLOR : '#9ca3af'} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Organization name"
                placeholderTextColor="#9ca3af"
                value={formData.clientName}
                onChangeText={(v) => handleInputChange('clientName', v)}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>
            {errors.clientName && (
              <View style={styles.fieldErrorRow}>
                <Ionicons name="alert-circle" size={12} color="#ef4444" />
                <Text style={styles.fieldErrorText}>{errors.clientName}</Text>
              </View>
            )}
          </View>

          {/* Error Banner */}
          {error && (
            <View style={styles.errorBanner}>
              <Ionicons name="warning" size={18} color="white" />
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          )}

          {/* Sign In Button */}
          <TouchableOpacity
            style={[styles.primaryButton, { opacity: (isLoading || academicYearLoading) ? 0.75 : 1, marginTop: 8 }]}
            onPress={handleLogin}
            disabled={isLoading || academicYearLoading}
          >
            {isLoading || academicYearLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Text style={styles.primaryButtonText}>Sign In</Text>
                <Ionicons name="arrow-forward" size={18} color="white" />
              </>
            )}
          </TouchableOpacity>

          {/* Forgot Password Link */}
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => router.push('/forgot-password' as any)}
          >
            <Ionicons name="lock-open-outline" size={15} color={ACCENT_COLOR} />
            <Text style={styles.linkButtonText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Change Org Link */}
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => setShowClientSelection(true)}
          >
            <Ionicons name="swap-horizontal-outline" size={15} color={ACCENT_COLOR} />
            <Text style={styles.linkButtonText}>Change Organization</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Academic Year Modal */}
      <Modal visible={showAcademicYearPicker} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setShowAcademicYearPicker(false)}
          activeOpacity={1}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Select Academic Year</Text>

            {academicYearLoading ? (
              <View style={styles.modalCenter}>
                <ActivityIndicator size="large" color={ACCENT_COLOR} />
                <Text style={styles.modalCenterText}>Loading academic years...</Text>
              </View>
            ) : academicYearError ? (
              <View style={styles.modalCenter}>
                <Ionicons name="alert-circle-outline" size={40} color="#ef4444" />
                <Text style={[styles.modalCenterText, { color: '#ef4444', marginTop: 8 }]}>{academicYearError}</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={() => { fetchAcademicYears(true); }}
                  >
                    <Ionicons name="refresh" size={16} color="white" />
                    <Text style={styles.retryButtonText}>Retry</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.retryButton, { backgroundColor: '#6b7280' }]}
                    onPress={() => setShowAcademicYearPicker(false)}
                  >
                    <Text style={styles.retryButtonText}>Skip</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <FlatList
                data={academicYears}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.modalItem, selectedAcademicYearId === item.id && styles.modalItemActive]}
                    onPress={() => { setSelectedAcademicYearId(item.id); setShowAcademicYearPicker(false); }}
                  >
                    <View style={styles.modalItemLeft}>
                      <Text style={[styles.modalItemText, selectedAcademicYearId === item.id && styles.modalItemTextActive]}>
                        {item.title}
                      </Text>
                      {item.is_active && (
                        <View style={styles.activeBadge}>
                          <Text style={styles.activeBadgeText}>Current</Text>
                        </View>
                      )}
                    </View>
                    {selectedAcademicYearId === item.id && (
                      <Ionicons name="checkmark-circle" size={22} color={ACCENT_COLOR} />
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.modalCenter}>
                    <Ionicons name="calendar-outline" size={40} color="#9ca3af" />
                    <Text style={styles.modalCenterText}>No academic years available</Text>
                    <TouchableOpacity
                      style={styles.retryButton}
                      onPress={() => fetchAcademicYears(true)}
                    >
                      <Ionicons name="refresh" size={16} color="white" />
                      <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                  </View>
                }
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BRAND_COLOR,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: BRAND_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingLogo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: 'rgba(255,255,255,0.75)',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  scrollContent: {
    flexGrow: 1,
  },
  brandSection: {
    alignItems: 'center',
    paddingTop: 52,
    paddingBottom: 52,
    overflow: 'hidden',
  },
  brandDecorCircle1: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  brandDecorCircle2: {
    position: 'absolute',
    bottom: 20,
    left: -40,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  logoImage: {
    width: 72,
    height: 72,
  },
  appName: {
    color: 'white',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 3,
    marginBottom: 6,
  },
  appTagline: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  formCard: {
    backgroundColor: 'white',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 48,
  },
  formCardHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 28,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    backgroundColor: '#f9fafb',
    height: 54,
  },
  inputFocused: {
    borderColor: ACCENT_COLOR,
    backgroundColor: '#eff6ff',
  },
  inputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  inputIcon: {
    marginHorizontal: 14,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    paddingVertical: 0,
  },
  eyeButton: {
    padding: 12,
    marginRight: 2,
  },
  fieldErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
    marginLeft: 2,
  },
  fieldErrorText: {
    fontSize: 12,
    color: '#ef4444',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 10,
  },
  errorBannerText: {
    color: 'white',
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND_COLOR,
    borderRadius: 16,
    height: 56,
    gap: 10,
    shadowColor: BRAND_COLOR,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 6,
  },
  linkButtonText: {
    color: ACCENT_COLOR,
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: 420,
    paddingBottom: 32,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 14,
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb',
  },
  modalItemActive: {
    backgroundColor: '#eff6ff',
  },
  modalItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalItemText: {
    fontSize: 15,
    color: '#374151',
  },
  modalItemTextActive: {
    color: ACCENT_COLOR,
    fontWeight: '600',
  },
  activeBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  activeBadgeText: {
    color: '#16a34a',
    fontSize: 11,
    fontWeight: '600',
  },
  modalCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  modalCenterText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: ACCENT_COLOR,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
});
