import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  provider?: 'github' | 'google' | 'email';
  createdAt: string;
  subscription?: 'free' | 'basic' | 'pro' | 'enterprise';
  credits: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const STORAGE_KEYS = {
  USER: 'auth-user',
  TOKEN: 'auth-token',
} as const;

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const loadAuthState = useCallback(async () => {
    try {
      const [storedUser, storedToken] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.USER),
        AsyncStorage.getItem(STORAGE_KEYS.TOKEN),
      ]);

      if (storedUser && storedToken) {
        const user = JSON.parse(storedUser);
        setAuthState({
          user,
          token: storedToken,
          isAuthenticated: true,
          isLoading: false,
        });
        console.log('[AuthContext] User session restored:', user.email);
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error('[AuthContext] Failed to load auth state:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    loadAuthState();
  }, [loadAuthState]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      console.log('[AuthContext] Logging in user:', email);
      
      const mockUser: User = {
        id: `user_${Date.now()}`,
        email,
        name: email.split('@')[0],
        provider: 'email',
        createdAt: new Date().toISOString(),
        subscription: 'free',
        credits: 100,
      };

      const mockToken = `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(mockUser)),
        AsyncStorage.setItem(STORAGE_KEYS.TOKEN, mockToken),
      ]);

      setAuthState({
        user: mockUser,
        token: mockToken,
        isAuthenticated: true,
        isLoading: false,
      });

      console.log('[AuthContext] Login successful');
      return { success: true, user: mockUser };
    } catch (error) {
      console.error('[AuthContext] Login failed:', error);
      throw new Error('Login failed. Please try again.');
    }
  }, []);

  const signup = useCallback(async (email: string, password: string, name: string) => {
    try {
      console.log('[AuthContext] Signing up user:', email);
      
      const mockUser: User = {
        id: `user_${Date.now()}`,
        email,
        name,
        provider: 'email',
        createdAt: new Date().toISOString(),
        subscription: 'free',
        credits: 100,
      };

      const mockToken = `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(mockUser)),
        AsyncStorage.setItem(STORAGE_KEYS.TOKEN, mockToken),
      ]);

      setAuthState({
        user: mockUser,
        token: mockToken,
        isAuthenticated: true,
        isLoading: false,
      });

      console.log('[AuthContext] Signup successful');
      return { success: true, user: mockUser };
    } catch (error) {
      console.error('[AuthContext] Signup failed:', error);
      throw new Error('Signup failed. Please try again.');
    }
  }, []);

  const loginWithOAuth = useCallback(async (provider: 'github' | 'google') => {
    try {
      console.log(`[AuthContext] Initiating OAuth login with ${provider}`);

      if (Platform.OS === 'web') {
        const authUrl = provider === 'github' 
          ? 'https://github.com/login/oauth/authorize?client_id=YOUR_GITHUB_CLIENT_ID&scope=user:email'
          : 'https://accounts.google.com/o/oauth2/v2/auth?client_id=YOUR_GOOGLE_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI&response_type=code&scope=email%20profile';
        
        window.location.href = authUrl;
      } else {
        const authUrl = provider === 'github'
          ? 'https://github.com/login/oauth/authorize?client_id=YOUR_GITHUB_CLIENT_ID&scope=user:email'
          : 'https://accounts.google.com/o/oauth2/v2/auth?client_id=YOUR_GOOGLE_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI&response_type=code&scope=email%20profile';

        const result = await WebBrowser.openAuthSessionAsync(
          authUrl,
          'exp://localhost:8081'
        );

        if (result.type === 'success') {
          const mockUser: User = {
            id: `user_${Date.now()}`,
            email: `user@${provider}.com`,
            name: `${provider} User`,
            provider,
            createdAt: new Date().toISOString(),
            subscription: 'free',
            credits: 100,
          };

          const mockToken = `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

          await Promise.all([
            AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(mockUser)),
            AsyncStorage.setItem(STORAGE_KEYS.TOKEN, mockToken),
          ]);

          setAuthState({
            user: mockUser,
            token: mockToken,
            isAuthenticated: true,
            isLoading: false,
          });

          console.log(`[AuthContext] OAuth login successful with ${provider}`);
          return { success: true, user: mockUser };
        }
      }

      throw new Error('OAuth authentication was cancelled');
    } catch (error) {
      console.error(`[AuthContext] OAuth login failed with ${provider}:`, error);
      throw new Error(`${provider} authentication failed. Please try again.`);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      console.log('[AuthContext] Logging out user');
      
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.USER),
        AsyncStorage.removeItem(STORAGE_KEYS.TOKEN),
      ]);

      setAuthState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });

      console.log('[AuthContext] Logout successful');
    } catch (error) {
      console.error('[AuthContext] Logout failed:', error);
      throw new Error('Logout failed. Please try again.');
    }
  }, []);

  const updateProfile = useCallback(async (updates: Partial<User>) => {
    try {
      if (!authState.user) {
        throw new Error('No user logged in');
      }

      const updatedUser = { ...authState.user, ...updates };
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));

      setAuthState(prev => ({
        ...prev,
        user: updatedUser,
      }));

      console.log('[AuthContext] Profile updated:', updates);
      return { success: true, user: updatedUser };
    } catch (error) {
      console.error('[AuthContext] Profile update failed:', error);
      throw new Error('Failed to update profile. Please try again.');
    }
  }, [authState.user]);

  const updateCredits = useCallback(async (amount: number) => {
    try {
      if (!authState.user) {
        throw new Error('No user logged in');
      }

      const updatedUser = {
        ...authState.user,
        credits: authState.user.credits + amount,
      };

      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));

      setAuthState(prev => ({
        ...prev,
        user: updatedUser,
      }));

      console.log('[AuthContext] Credits updated:', amount);
      return { success: true, credits: updatedUser.credits };
    } catch (error) {
      console.error('[AuthContext] Credits update failed:', error);
      throw new Error('Failed to update credits. Please try again.');
    }
  }, [authState.user]);

  const upgradeSubscription = useCallback(async (tier: 'basic' | 'pro' | 'enterprise') => {
    try {
      if (!authState.user) {
        throw new Error('No user logged in');
      }

      const updatedUser = {
        ...authState.user,
        subscription: tier,
      };

      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));

      setAuthState(prev => ({
        ...prev,
        user: updatedUser,
      }));

      console.log('[AuthContext] Subscription upgraded to:', tier);
      return { success: true, subscription: tier };
    } catch (error) {
      console.error('[AuthContext] Subscription upgrade failed:', error);
      throw new Error('Failed to upgrade subscription. Please try again.');
    }
  }, [authState.user]);

  return useMemo(() => ({
    ...authState,
    login,
    signup,
    loginWithOAuth,
    logout,
    updateProfile,
    updateCredits,
    upgradeSubscription,
  }), [
    authState,
    login,
    signup,
    loginWithOAuth,
    logout,
    updateProfile,
    updateCredits,
    upgradeSubscription,
  ]);
});
