import React, { useState, useCallback } from 'react';
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
import { Mail, Lock, Github, Sparkles } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import AnimatedMoltenBackground from '@/components/AnimatedMoltenBackground';

export default function LoginScreen() {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login, loginWithOAuth } = useAuth();

  const handleLogin = useCallback(async () => {
    if (!email.trim() || !password) {
      Alert.alert('Validation Error', 'Please enter both email and password');
      return;
    }

    setIsLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace('/(tabs)' as any);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed. Please try again.';
      Alert.alert('Login Failed', message);
      console.error('[LoginScreen] Login error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [email, password, login, router]);

  const handleOAuthLogin = useCallback(async (provider: 'github' | 'google') => {
    setIsLoading(true);
    try {
      await loginWithOAuth(provider);
      router.replace('/(tabs)' as any);
    } catch (error) {
      const message = error instanceof Error ? error.message : `${provider} authentication failed`;
      Alert.alert(
        'Authentication Failed',
        `Unable to sign in with ${provider.charAt(0).toUpperCase() + provider.slice(1)}. ${message}`
      );
      console.error(`[LoginScreen] OAuth error (${provider}):`, error);
    } finally {
      setIsLoading(false);
    }
  }, [loginWithOAuth, router]);

  return (
    <View style={styles.container}>
      <AnimatedMoltenBackground intensity={0.5} />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Sparkles color={Colors.Colors.cyan.primary} size={56} strokeWidth={2.5} />
            </View>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to gnidoC Terces</Text>
          </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Mail color={Colors.Colors.text.muted} size={20} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={Colors.Colors.text.muted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Lock color={Colors.Colors.text.muted} size={20} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={Colors.Colors.text.muted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
              editable={!isLoading}
            />
          </View>

          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={Colors.Colors.text.inverse} />
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.oauthButton}
            onPress={() => handleOAuthLogin('github')}
            disabled={isLoading}
          >
            <Github color={Colors.Colors.text.primary} size={20} />
            <Text style={styles.oauthButtonText}>Continue with GitHub</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.signupLink}
            onPress={() => router.push('/auth/signup' as any)}
            disabled={isLoading}
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
  container: {
    flex: 1,
    backgroundColor: Colors.Colors.background.primary,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.Colors.background.card,
    borderWidth: 3,
    borderColor: Colors.Colors.cyan.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: Colors.Colors.cyan.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold' as const,
    color: Colors.Colors.cyan.primary,
    marginBottom: 8,
    textShadowColor: Colors.Colors.cyan.glow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.Colors.orange.primary,
    textAlign: 'center',
    fontWeight: '500' as const,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.Colors.cyan.primary + '40',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: Colors.Colors.cyan.primary,
    fontWeight: '500' as const,
  },
  loginButton: {
    backgroundColor: Colors.Colors.cyan.primary,
    borderRadius: 12,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: Colors.Colors.cyan.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: Colors.Colors.black.primary,
    letterSpacing: 0.5,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.Colors.border.muted,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: Colors.Colors.text.muted,
  },
  oauthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.Colors.red.primary + '60',
    height: 50,
    gap: 12,
  },
  oauthButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.Colors.red.primary,
  },
  signupLink: {
    marginTop: 24,
    alignItems: 'center',
  },
  signupLinkText: {
    fontSize: 14,
    color: Colors.Colors.text.secondary,
  },
  signupLinkTextBold: {
    fontWeight: '700' as const,
    color: Colors.Colors.cyan.primary,
  },
});
