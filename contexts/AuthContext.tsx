import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';

WebBrowser.maybeCompleteAuthSession();

const STORAGE_KEY = '@gnidoc/auth_token';
const USER_KEY = '@gnidoc/user_data';

interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  provider?: 'email' | 'github' | 'google';
  subscription?: {
    tier: 'free' | 'pro' | 'enterprise';
    status: 'active' | 'inactive' | 'cancelled';
  };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  loginWithOAuth: (provider: 'github' | 'google') => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

// OAuth Configuration
const useProxy = Platform.select({ web: false, default: true });
const redirectUri = AuthSession.makeRedirectUri({ useProxy });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load stored auth on mount
  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const [storedToken, storedUser] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem(USER_KEY),
      ]);

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('[AuthContext] Failed to load auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveAuth = async (newToken: string, newUser: User) => {
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEY, newToken),
        AsyncStorage.setItem(USER_KEY, JSON.stringify(newUser)),
      ]);
      setToken(newToken);
      setUser(newUser);
    } catch (error) {
      console.error('[AuthContext] Failed to save auth:', error);
      throw new Error('Failed to save authentication');
    }
  };

  const clearAuth = async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEY),
        AsyncStorage.removeItem(USER_KEY),
      ]);
      setToken(null);
      setUser(null);
    } catch (error) {
      console.error('[AuthContext] Failed to clear auth:', error);
    }
  };

  // Email/Password Login
  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const data = await response.json();
      await saveAuth(data.token, data.user);
    } catch (error) {
      console.error('[AuthContext] Login error:', error);
      throw error;
    }
  }, []);

  // Email/Password Signup
  const signup = useCallback(async (email: string, password: string, name?: string) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Signup failed');
      }

      const data = await response.json();
      await saveAuth(data.token, data.user);
    } catch (error) {
      console.error('[AuthContext] Signup error:', error);
      throw error;
    }
  }, []);

  // OAuth Login (GitHub/Google)
  const loginWithOAuth = useCallback(async (provider: 'github' | 'google') => {
    try {
      // Generate PKCE challenge
      const codeVerifier = await generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);

      // OAuth endpoints
      const authEndpoint = provider === 'github' 
        ? 'https://github.com/login/oauth/authorize'
        : 'https://accounts.google.com/o/oauth2/v2/auth';

      const clientId = provider === 'github'
        ? process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID
        : process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

      if (!clientId) {
        throw new Error(`${provider} OAuth not configured`);
      }

      const discovery = {
        authorizationEndpoint: authEndpoint,
      };

      const request = new AuthSession.AuthRequest({
        clientId,
        redirectUri,
        scopes: provider === 'github' ? ['user:email'] : ['openid', 'email', 'profile'],
        usePKCE: true,
        codeChallenge,
        codeChallengeMethod: AuthSession.CodeChallengeMethod.S256,
      });

      const result = await request.promptAsync(discovery, { useProxy });

      if (result.type === 'success') {
        // Exchange code for token on backend
        const response = await fetch(`${API_URL}/api/auth/oauth/${provider}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: result.params.code,
            codeVerifier,
            redirectUri,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'OAuth failed');
        }

        const data = await response.json();
        await saveAuth(data.token, data.user);
      } else if (result.type === 'error') {
        throw new Error(result.error?.message || 'OAuth failed');
      }
    } catch (error) {
      console.error(`[AuthContext] ${provider} OAuth error:`, error);
      throw error;
    }
  }, []);

  // Password Reset
  const sendPasswordReset = useCallback(async (email: string) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send reset email');
      }
    } catch (error) {
      console.error('[AuthContext] Password reset error:', error);
      throw error;
    }
  }, []);

  // Update Profile
  const updateProfile = useCallback(async (updates: Partial<User>) => {
    if (!token) throw new Error('Not authenticated');

    try {
      const response = await fetch(`${API_URL}/api/auth/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update profile');
      }

      const updatedUser = await response.json();
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (error) {
      console.error('[AuthContext] Update profile error:', error);
      throw error;
    }
  }, [token]);

  // Logout
  const logout = useCallback(async () => {
    try {
      if (token) {
        // Optional: Call backend logout endpoint
        await fetch(`${API_URL}/api/auth/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
        }).catch(() => {}); // Ignore errors
      }
    } finally {
      await clearAuth();
    }
  }, [token]);

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user && !!token,
    login,
    logout,
    signup,
    loginWithOAuth,
    sendPasswordReset,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

// PKCE Helpers
async function generateCodeVerifier(): Promise<string> {
  const randomBytes = await Crypto.getRandomBytesAsync(32);
  return base64URLEncode(randomBytes);
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const hashed = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    verifier
  );
  return base64URLEncode(hashed);
}

function base64URLEncode(str: string | ArrayBuffer): string {
  const base64 = typeof str === 'string' 
    ? Buffer.from(str).toString('base64')
    : Buffer.from(str).toString('base64');
  
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}