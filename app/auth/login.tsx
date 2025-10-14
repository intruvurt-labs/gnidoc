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
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mail, Lock, Github, Zap, Shield, Eye, EyeOff, LogIn, ShieldCheck } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import AnimatedMoltenBackground from '@/components/AnimatedMoltenBackground';

const EMAIL_RE =
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

export default function LoginScreen() {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [showPassword, setShowPassword] = useState(false);

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login, loginWithOAuth, sendPasswordReset } = useAuth(); // ensure your context exposes this

  const canSubmit = useMemo(() => {
    return EMAIL_RE.test(email.trim().toLowerCase()) && password.length >= 6 && !isLoading;
  }, [email, password, isLoading]);

  const validate = useCallback(() => {
    const next: { email?: string; password?: string } = {};
    if (!EMAIL_RE.test(email.trim().toLowerCase())) next.email = 'Enter a valid email';
    if (!password || password.length < 6) next.password = 'Password must be at least 6 characters';
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [email, password]);

  const handleLogin = useCallback(async () => {
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      return;
    }
    setIsLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.replace('/(tabs)' as any);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed. Please try again.';
      Alert.alert('Login Failed', message);
      // avoid logging secrets; email/password are not logged
      console.warn('[LoginScreen] Login error'); // minimal
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setIsLoading(false);
    }
  }, [email, password, login, router, validate]);

  const handleOAuthLogin = useCallback(
    async (provider: 'github' | 'google') => {
      setIsLoading(true);
      try {
        await loginWithOAuth(provider);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        router.replace('/(tabs)' as any);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : `${provider} authentication failed`;
        Alert.alert(
          'Authentication Failed',
          `Unable to sign in with ${provider.charAt(0).toUpperCase() + provider.slice(1)}. ${message}`
        );
        console.warn(`[LoginScreen] OAuth error (${provider})`);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      } finally {
        setIsLoading(false);
      }
    },
    [loginWithOAuth, router]
  );

  const handleForgot = useCallback(async () => {
    const normalized = email.trim().toLowerCase();
    if (!EMAIL_RE.test(normalized)) {
      Alert.alert('Reset Password', 'Enter your email above first, then tap “Forgot password?”.');
      return;
    }
    try {
      await sendPasswordReset?.(normalized);
      Alert.alert('Email Sent', 'Check your inbox for password reset instructions.');
    } catch {
      Alert.alert('Try Again', 'Could not send reset email right now.');
    }
  }, [email, sendPasswordReset]);

  return (
    <View style={styles.container} testID="login-screen">
      <AnimatedMoltenBackground
        intensity={0.85}
        heroBannerUri="https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/qvhbsg2l35ali5raxtus0"
        symbolUri="https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/k95rc9dv5sso3otf9ckgb"
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer} accessible accessibilityLabel="gnidoC terceS logo">
              <Image
                source={{
                  uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/9uyhiznsj2k9cegpqglzk',
                }}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.title}>gnidoC terceS</Text>
            <Text style={styles.subtitle}>Master Coding Agent Platform</Text>

            <View style={styles.featureBadges}>
              <View style={styles.featureBadge}>
                <Zap color={Colors.Colors.cyan.primary} size={14} />
                <Text style={styles.featureBadgeText}>AI for Creators, SMB, Entrepreneurs</Text>
              </View>
              <View style={styles.featureBadge}>
                <Shield color={Colors.Colors.red.primary} size={14} />
                <Text style={styles.featureBadgeText}>Secure by design</Text>
              </View>
            </View>
          </View>

          {/* Form */}
          <View style={styles.form}>
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
                blurOnSubmit
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
                placeholder="Password"
                placeholderTextColor={Colors.Colors.text.muted}
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={canSubmit ? handleLogin : undefined}
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

            {/* Login */}
            <TouchableOpacity
              style={[styles.loginButton, (!canSubmit || isLoading) && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={!canSubmit}
              accessibilityRole="button"
              accessibilityLabel="Sign in"
              testID="signin-button"
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.Colors.text.inverse} />
              ) : (
                <View style={styles.loginCta}>
                  <LogIn size={18} color={Colors.Colors.black.primary} />
                  <Text style={styles.loginButtonText}>Sign In</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Helpers */}
            <View style={styles.helpersRow}>
              <TouchableOpacity onPress={handleForgot} disabled={isLoading}>
                <Text style={styles.helperLink}>Forgot password?</Text>
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* OAuth */}
            <TouchableOpacity
              style={styles.oauthButton}
              onPress={() => handleOAuthLogin('github')}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel="Continue with GitHub"
              testID="github-button"
            >
              <Github color={Colors.Colors.text.primary} size={20} />
              <Text style={styles.oauthButtonText}>Continue with GitHub</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.oauthButton, styles.oauthGoogle]}
              onPress={() => handleOAuthLogin('google')}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel="Continue with Google"
              testID="google-button"
            >
              <ShieldCheck color={Colors.Colors.text.primary} size={20} />
              <Text style={styles.oauthButtonText}>Continue with Google</Text>
            </TouchableOpacity>

            {/* Signup */}
            <TouchableOpacity
              style={styles.signupLink}
              onPress={() => router.push('/auth/signup' as any)}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel="Go to signup"
            >
              <Text style={styles.signupLinkText}>
                Don&apos;t have an account? <Text style={styles.signupLinkTextBold}>Sign Up</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.Colors.background.primary },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },

  header: { alignItems: 'center', marginBottom: 40 },
  logoContainer: {
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: Colors.Colors.background.card,
    borderWidth: 4, borderColor: Colors.Colors.cyan.primary,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 24,
    shadowColor: Colors.Colors.cyan.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8, shadowRadius: 30, elevation: 15, overflow: 'hidden',
  },
  logoImage: { width: '90%', height: '90%' },
  title: {
    fontSize: 32, fontWeight: 'bold' as const, color: Colors.Colors.cyan.primary, marginBottom: 8,
    textShadowColor: Colors.Colors.cyan.glow, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 15, letterSpacing: 1.5,
  },
  subtitle: {
    fontSize: 14, color: Colors.Colors.orange.primary, textAlign: 'center', fontWeight: '600' as const, marginBottom: 16,
  },
  featureBadges: { flexDirection: 'row', gap: 12, marginTop: 8 },
  featureBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.Colors.background.card, paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, gap: 6, borderWidth: 1, borderColor: Colors.Colors.cyan.primary + '40',
  },
  featureBadgeText: { fontSize: 11, fontWeight: '600' as const, color: Colors.Colors.text.primary },

  form: { width: '100%' },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.Colors.background.card + 'E6',
    borderRadius: 16, borderWidth: 2, borderColor: Colors.Colors.cyan.primary + '60',
    paddingHorizontal: 16, marginBottom: 12,
    shadowColor: Colors.Colors.cyan.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  inputError: { borderColor: Colors.Colors.red.primary + '90' },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, height: 50, fontSize: 16, color: Colors.Colors.cyan.primary, fontWeight: '500' as const },
  eyeButton: { padding: 6, marginLeft: 8 },

  loginButton: {
    backgroundColor: Colors.Colors.cyan.primary, borderRadius: 16, height: 56,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
    shadowColor: Colors.Colors.cyan.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.6, shadowRadius: 16, elevation: 10,
    borderWidth: 2, borderColor: Colors.Colors.cyan.secondary,
  },
  loginCta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  loginButtonDisabled: { opacity: 0.6 },
  loginButtonText: { fontSize: 18, fontWeight: 'bold' as const, color: Colors.Colors.black.primary, letterSpacing: 0.5 },

  helpersRow: { marginTop: 10, alignItems: 'flex-end' },
  helperLink: { color: Colors.Colors.text.muted, fontSize: 13, textDecorationLine: 'underline' },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 22 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.Colors.border.muted },
  dividerText: { marginHorizontal: 16, fontSize: 14, color: Colors.Colors.text.muted },

  oauthButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.Colors.background.card + 'E6',
    borderRadius: 16, borderWidth: 2, borderColor: Colors.Colors.red.primary + '80',
    height: 52, gap: 12, shadowColor: Colors.Colors.red.primary,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
    marginBottom: 12,
  },
  oauthGoogle: {
    borderColor: Colors.Colors.cyan.primary + '80',
    shadowColor: Colors.Colors.cyan.primary,
  },
  oauthButtonText: { fontSize: 16, fontWeight: '600' as const, color: Colors.Colors.text.primary },

  signupLink: { marginTop: 16, alignItems: 'center' },
  signupLinkText: { fontSize: 14, color: Colors.Colors.text.secondary },
  signupLinkTextBold: { fontWeight: '700' as const, color: Colors.Colors.cyan.primary },

  errorText: { color: Colors.Colors.red.primary, fontSize: 12, marginBottom: 8, marginLeft: 6 },
});
