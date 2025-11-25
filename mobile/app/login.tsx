import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { ThemedText, ThemedView } from '../components';
import { Radius } from '../constants/theme';
import { useAuth, useTheme } from '../contexts';
import { getClientSchema, setClientSchema } from '../services/authUtils';

// Form validation
interface FormData {
  username: string;
  password: string;
  clientName: string;
}

interface FormErrors {
  username?: string;
  password?: string;
  clientName?: string;
}

const LoginScreen: React.FC = () => {
  const router = useRouter();
  const { login, isLoading, error, clearError, isAuthenticated } = useAuth();
  const { colors, componentStyles } = useTheme();

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

  // Check if client schema is stored
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
      } catch (error) {
        console.error('Error checking client schema:', error);
        setShowClientSelection(true);
      } finally {
        setClientSchemaLoading(false);
      }
    };
    checkClientSchema();
  }, []);

  // Redirect to dashboard after successful login
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, router]);

  // Clear errors when form data changes
  useEffect(() => {
    if (error) {
      clearError();
    }
  }, [formData, clearError]);

  // Form validation
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.clientName.trim()) {
      newErrors.clientName = 'Client name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input changes
  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Handle client schema selection
  const handleClientSchemaSubmit = async () => {
    if (!clientSchema.trim() || isLoading) {
      return;
    }

    try {
      await setClientSchema(clientSchema);
      setFormData(prev => ({ ...prev, clientName: clientSchema }));
      setShowClientSelection(false);
    } catch (error) {
      console.error('Error saving client schema:', error);
    }
  };

  // Handle login
  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      await login(formData.username, formData.password, formData.clientName);
      // Navigation will be handled by the useEffect above
    } catch (error) {
      // Error is handled by AuthContext
      console.error('Login failed:', error);
    }
  };


  if (showClientSelection) {
    if (clientSchemaLoading) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: 16, color: colors.foreground }}>Loading...</Text>
        </View>
      );
    }

    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            padding: 20,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <ThemedView style={{ alignItems: 'center', marginBottom: 40 }}>
            {/* App Logo/Title */}
            <ThemedView
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: colors.primary,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 20,
              }}
            >
              <ThemedText style={{ fontSize: 32, color: colors['primary-foreground'] }}>
                COS360
              </ThemedText>
            </ThemedView>

            <ThemedText
              style={{
                fontSize: 24,
                fontWeight: 'bold',
                marginBottom: 8,
              }}
            >
              Select Client
            </ThemedText>

            <ThemedText
              style={{
                fontSize: 16,
                textAlign: 'center',
              }}
            >
              Enter your client schema to continue
            </ThemedText>
          </ThemedView>

          {/* Client Schema Input */}
          <View style={{ marginBottom: 20 }}>
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: colors.foreground,
                  marginBottom: 8,
                }}
              >
                Client Schema
              </Text>
              <TextInput
                style={{
                  ...styles.textInput,
                  borderColor: colors.border,
                  backgroundColor: colors.input,
                  color: colors.foreground,
                }}
                placeholder="Enter client schema"
                placeholderTextColor={colors['muted-foreground']}
                value={clientSchema}
                onChangeText={setClientSchemaState}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Continue Button */}
            <TouchableOpacity
              style={{
                ...styles.button,
                backgroundColor: clientSchema.trim() ? colors.primary : colors.muted,
              }}
              onPress={handleClientSchemaSubmit}
              disabled={!clientSchema.trim() || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors['primary-foreground']} />
              ) : (
                <Text style={{
                  color: colors['primary-foreground'],
                  fontSize: 14,
                  fontWeight: '600' as const,
                }}>Continue</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          padding: 20,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <ThemedView style={{ alignItems: 'center', marginBottom: 40 }}>
          {/* App Logo/Title */}
          <ThemedView
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: colors.primary,
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 20,
            }}
          >
            <ThemedText style={{ fontSize: 32, color: colors['primary-foreground'] }}>
              COS360
            </ThemedText>
          </ThemedView>

          <ThemedText
            style={{
              fontSize: 24,
              fontWeight: 'bold',
              marginBottom: 8,
            }}
          >
            Welcome Back
          </ThemedText>

          <ThemedText
            style={{
              fontSize: 16,
              textAlign: 'center',
            }}
          >
            Sign in to your account to continue
          </ThemedText>
        </ThemedView>

        {/* Login Form */}
        <View style={{ marginBottom: 20 }}>
          {/* Username Input */}
          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: colors.foreground,
                marginBottom: 8,
              }}
            >
              Username
            </Text>
            <TextInput
              style={{
                ...styles.textInput,
                borderColor: errors.username ? colors.destructive : colors.border,
                backgroundColor: colors.input,
                color: colors.foreground,
              }}
              placeholder="Enter your username"
              placeholderTextColor={colors['muted-foreground']}
              value={formData.username}
              onChangeText={(value) => handleInputChange('username', value)}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
            {errors.username && (
              <Text
                style={{
                  fontSize: 12,
                  color: colors.destructive,
                  marginTop: 4,
                }}
              >
                {errors.username}
              </Text>
            )}
          </View>

          {/* Password Input */}
          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: colors.foreground,
                marginBottom: 8,
              }}
            >
              Password
            </Text>
            <View style={{ position: 'relative' }}>
              <TextInput
                style={{
                  ...styles.textInput,
                  borderColor: errors.password ? colors.destructive : colors.border,
                  backgroundColor: colors.input,
                  color: colors.foreground,
                  paddingRight: 50,
                }}
                placeholder="Enter your password"
                placeholderTextColor={colors['muted-foreground']}
                value={formData.password}
                onChangeText={(value) => handleInputChange('password', value)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              <TouchableOpacity
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: [{ translateY: -10 }],
                }}
                onPress={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                <Text style={{ color: colors.primary, fontSize: 14 }}>
                  {showPassword ? 'Hide' : 'Show'}
                </Text>
              </TouchableOpacity>
            </View>
            {errors.password && (
              <Text
                style={{
                  fontSize: 12,
                  color: colors.destructive,
                  marginTop: 4,
                }}
              >
                {errors.password}
              </Text>
            )}
          </View>

          {/* Client Name Input */}
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: colors.foreground,
                marginBottom: 8,
              }}
            >
              Client Name
            </Text>
            <TextInput
              style={{
                ...styles.textInput,
                borderColor: errors.clientName ? colors.destructive : colors.border,
                backgroundColor: colors.input,
                color: colors.foreground,
              }}
              placeholder="Enter client name"
              placeholderTextColor={colors['muted-foreground']}
              value={formData.clientName}
              onChangeText={(value) => handleInputChange('clientName', value)}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
            {errors.clientName && (
              <Text
                style={{
                  fontSize: 12,
                  color: colors.destructive,
                  marginTop: 4,
                }}
              >
                {errors.clientName}
              </Text>
            )}
          </View>

          {/* Error Message */}
          {error && (
            <View
              style={{
                backgroundColor: colors.destructive,
                padding: 12,
                borderRadius: Radius.default,
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  color: 'white',
                  fontSize: 14,
                  textAlign: 'center',
                }}
              >
                {error}
              </Text>
            </View>
          )}

          {/* Login Button */}
          <TouchableOpacity
            style={{
              ...styles.button,
              backgroundColor: isLoading ? colors.muted : colors.primary,
              marginBottom: 16,
            }}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors['primary-foreground']} />
            ) : (
              <Text style={{
                color: colors['primary-foreground'],
                fontSize: 14,
                fontWeight: '600' as const,
              }}>Sign In</Text>
            )}
          </TouchableOpacity>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  textInput: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  button: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});