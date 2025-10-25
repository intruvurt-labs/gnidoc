import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mail, Lock, User, Eye, EyeOff, UserPlus, ArrowLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import AnimatedMoltenBackground from '@/components/AnimatedMoltenBackground';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

export default function SignupScreen() {
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signup } = useAuth();

  const canSubmit = useMemo(() => {
    return (
      name.trim().length >= 2 &&
      EMAIL_RE.test(email.trim().toLowerCase()) &&
      password.length >= 6 &&
      password === confirmPassword &&
      !isLoading
    );
  }, [name, email, password, confirmPassword, isLoading]);

  const validate = useCallback(() => {
    const next: typeof errors = {};
    if (!name.trim() || name.trim().length < 2) next.name = 'Name must be at least 2 characters';
    if (!EMAIL_RE.test(email.trim().toLowerCase())) next.email = 'Enter a valid email';
    if (!password || password.length < 6) next.password = 'Password must be at least 6 characters';
    if (password !== confirmPassword) next.confirmPassword = 'Passwords do not match';
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [name, email, password, confirmPassword]);

  const handleSignup = useCallback(async () => {
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      return;
    }
    setIsLoading(true);
    try {
      await signup(email.trim().toLowerCase(), password, name.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.replace('/(tabs)' as any);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Signup failed. Please try again.';
      Alert.alert('Signup Failed', message);
      console.warn('[SignupScreen] Signup error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setIsLoading(false);
    }
  }, [name, email, password, signup, router, validate]);

  return (
    <View style={styles.container} testID="signup-screen">
      <AnimatedMoltenBackground intensity={0.85} />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
          >
            <ArrowLeft color={Colors.Colors.cyan.primary} size={24} />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join gnidoC terceS Platform</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Name */}
            <View style={[styles.inputContainer, errors.name && styles.inputError]}>
              <User color={Colors.Colors.text.muted} size={20} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor={Colors.Colors.text.muted}
                value={name}
                onChangeText={(t) => {
                  setName(t);
                  if (errors.name) setErrors((e) => ({ ...e, name: undefined }));
                }}
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
                returnKeyType="next"
                editable={!isLoading}
                accessibilityLabel="Full Name"
                testID="name-input"
              />
            </View>
            {!!errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

            {/* Email */}
            <View style={[styles.inputContainer, errors.email && styles.inputError]}>
              <Mail color={Colors.Colors.text.muted} size={20} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={Colors.Colors.text.muted}
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (errors.email) setErrors((e) => ({ ...e, email: undefined }));
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="next"
                editable={!isLoading}
                accessibilityLabel="Email"
                testID="email-input"
              />
            </View>
            {!!errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

            {/* Password */}
            <View style={[styles.inputContainer, errors.password && styles.inputError]}>
              <Lock color={Colors.Colors.text.muted} size={20} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password (min 6 characters)"
                placeholderTextColor={Colors.Colors.text.muted}
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="password-new"
                textContentType="newPassword"
                returnKeyType="next"
                editable={!isLoading}
                accessibilityLabel="Password"
                testID="password-input"
              />
              <TouchableOpacity
                onPress={() => setShowPassword((v) => !v)}
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                style={styles.eyeButton}
              >
                {showPassword ? (
                  <EyeOff size={18} color={Colors.Colors.text.muted} />
                ) : (
                  <Eye size={18} color={Colors.Colors.text.muted} />
                )}
              </TouchableOpacity>
            </View>
            {!!errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

            {/* Confirm Password */}
            <View style={[styles.inputContainer, errors.confirmPassword && styles.inputError]}>
              <Lock color={Colors.Colors.text.muted} size={20} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                placeholderTextColor={Colors.Colors.text.muted}
                value={confirmPassword}
                onChangeText={(t) => {
                  setConfirmPassword(t);
                  if (errors.confirmPassword)
                    setErrors((e) => ({ ...e, confirmPassword: undefined }));
                }}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoComplete="password-new"
                textContentType="newPassword"
                returnKeyType="go"
                onSubmitEditing={canSubmit ? handleSignup : undefined}
                editable={!isLoading}
                accessibilityLabel="Confirm Password"
                testID="confirm-password-input"
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword((v) => !v)}
                accessibilityLabel={showConfirmPassword ? 'Hide password' : 'Show password'}
                style={styles.eyeButton}
              >
                {showConfirmPassword ? (
                  <EyeOff size={18} color={Colors.Colors.text.muted} />
                ) : (
                  <Eye size={18} color={Colors.Colors.text.muted} />
                )}
              </TouchableOpacity>
            </View>
            {!!errors.confirmPassword && (
              <Text style={styles.errorText}>{errors.confirmPassword}</Text>
            )}

            {/* Signup Button */}
            <TouchableOpacity
              style={[
                styles.signupButton,
                (!canSubmit || isLoading) && styles.signupButtonDisabled,
              ]}
              onPress={handleSignup}
              disabled={!canSubmit}
              accessibilityRole="button"
              accessibilityLabel="Create account"
              testID="signup-button"
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.Colors.text.inverse} />
              ) : (
                <View style={styles.signupCta}>
                  <UserPlus size={18} color={Colors.Colors.black.primary} />
                  <Text style={styles.signupButtonText}>Create Account</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Terms */}
            <Text style={styles.termsText}>
              By signing up, you agree to our{' '}
              <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>

            {/* Login Link */}
            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => router.push('/auth/login' as any)}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel="Go to login"
            >
              <Text style={styles.loginLinkText}>
                Already have an account? <Text style={styles.loginLinkTextBold}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0F12' },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#161B22',
    borderWidth: 1,
    borderColor: '#30363D',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },

  header: { alignItems: 'center', marginBottom: 40 },
  title: {
    fontSize: 32,
    fontWeight: 'bold' as const,
    color: Colors.Colors.cyan.primary,
    marginBottom: 8,
    textShadowColor: Colors.Colors.cyan.glow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
    letterSpacing: 1.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#8B92A0',
    textAlign: 'center',
    fontWeight: '600' as const,
  },

  form: { width: '100%' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161B22',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#30363D',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  inputError: { borderColor: '#FF4757' },
  inputIcon: { marginRight: 12 },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: Colors.Colors.cyan.primary,
    fontWeight: '500' as const,
  },
  eyeButton: { padding: 6, marginLeft: 8 },

  signupButton: {
    backgroundColor: '#4169E1',
    borderRadius: 12,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#4169E1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  signupCta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  signupButtonDisabled: { opacity: 0.6 },
  signupButtonText: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  termsText: {
    fontSize: 12,
    color: Colors.Colors.text.muted,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
  termsLink: {
    color: Colors.Colors.cyan.primary,
    textDecorationLine: 'underline',
  },

  loginLink: { marginTop: 24, alignItems: 'center' },
  loginLinkText: { fontSize: 14, color: Colors.Colors.text.secondary },
  loginLinkTextBold: {
    fontWeight: '700' as const,
    color: Colors.Colors.cyan.primary,
  },

  errorText: {
    color: Colors.Colors.red.primary,
    fontSize: 12,
    marginBottom: 8,
    marginLeft: 6,
  },
});