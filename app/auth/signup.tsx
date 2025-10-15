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
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mail, Lock, User, Github, Zap, Shield } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import AnimatedMoltenBackground from '@/components/AnimatedMoltenBackground';

export default function SignupScreen() {
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signup, loginWithOAuth } = useAuth();

  const handleSignup = useCallback(async () => {
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      Alert.alert('Validation Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Validation Error', 'Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      await signup(email.trim().toLowerCase(), password, name.trim());
      router.replace('/(tabs)' as any);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Signup failed. Please try again.';
      Alert.alert('Signup Failed', message);
      console.error('[SignupScreen] Signup error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [name, email, password, confirmPassword, signup, router]);

  const handleOAuthSignup = useCallback(async (provider: 'github' | 'google') => {
    setIsLoading(true);
    try {
      await loginWithOAuth(provider);
      router.replace('/(tabs)' as any);
    } catch (error) {
      const message = error instanceof Error ? error.message : `${provider} authentication failed`;
      Alert.alert('OAuth Failed', message);
      console.error(`[SignupScreen] OAuth error (${provider}):`, error);
    } finally {
      setIsLoading(false);
    }
  }, [loginWithOAuth, router]);

  return (
    <View style={styles.container}>
      <AnimatedMoltenBackground 
        intensity={0.8}
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
        >
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image
                source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/9uyhiznsj2k9cegpqglzk' }}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.title}>Join gnidoC terceS</Text>
            <Text style={styles.subtitle}>Start Building with AI Today</Text>
            <View style={styles.featureBadges}>
              <View style={styles.featureBadge}>
                <Zap color={Colors.Colors.cyan.primary} size={14} />
                <Text style={styles.featureBadgeText}>Free Trial</Text>
              </View>
              <View style={styles.featureBadge}>
                <Shield color={Colors.Colors.red.primary} size={14} />
                <Text style={styles.featureBadgeText}>No Credit Card</Text>
              </View>
            </View>
          </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <User color={Colors.Colors.text.muted} size={20} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor={Colors.Colors.text.muted}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoComplete="name"
              editable={!isLoading}
            />
          </View>

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

          <View style={styles.inputContainer}>
            <Lock color={Colors.Colors.text.muted} size={20} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              placeholderTextColor={Colors.Colors.text.muted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
              editable={!isLoading}
            />
          </View>

          <TouchableOpacity
            style={[styles.signupButton, isLoading && styles.signupButtonDisabled]}
            onPress={handleSignup}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={Colors.Colors.text.inverse} />
            ) : (
              <Text style={styles.signupButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.oauthButton}
            onPress={() => handleOAuthSignup('github')}
            disabled={isLoading}
          >
            <Github color={Colors.Colors.text.primary} size={20} />
            <Text style={styles.oauthButtonText}>Continue with GitHub</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => router.push('/auth/login' as any)}
            disabled={isLoading}
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
  container: {
    flex: 1,
    backgroundColor: '#0A0F12',
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
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#161B22',
    borderWidth: 3,
    borderColor: '#FF4757',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#FF4757',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12,
    overflow: 'hidden',
  },
  logoImage: {
    width: '90%',
    height: '90%',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold' as const,
    color: '#FF4757',
    marginBottom: 8,
    textShadowColor: '#FF475780',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
    letterSpacing: 1.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#8B92A0',
    textAlign: 'center',
    fontWeight: '600' as const,
    marginBottom: 16,
  },
  featureBadges: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  featureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161B22',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: '#30363D',
  },
  featureBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.Colors.text.primary,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161B22',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#30363D',
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
    color: '#FFFFFF',
    fontWeight: '500' as const,
  },
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
  signupButtonDisabled: {
    opacity: 0.6,
  },
  signupButtonText: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
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
    backgroundColor: '#161B22',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#30363D',
    height: 52,
    gap: 12,
  },
  oauthButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.Colors.cyan.primary,
  },
  loginLink: {
    marginTop: 24,
    alignItems: 'center',
  },
  loginLinkText: {
    fontSize: 14,
    color: Colors.Colors.text.secondary,
  },
  loginLinkTextBold: {
    fontWeight: '700' as const,
    color: '#FF4757',
  },
});
