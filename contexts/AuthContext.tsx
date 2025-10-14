import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { trpcClient } from '@/lib/trpc';
import { batchSetItems, batchGetItems } from '@/lib/storage';

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
      const data = await batchGetItems([STORAGE_KEYS.USER, STORAGE_KEYS.TOKEN]);

      if (!data) {
        console.log('[AuthContext] No stored auth data found');
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      const storedUser = data[STORAGE_KEYS.USER];
      const storedToken = data[STORAGE_KEYS.TOKEN] as string | null;

      if (storedUser && storedToken) {
        const user = typeof storedUser === 'string' ? JSON.parse(storedUser) : storedUser;
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
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Please enter a valid email address');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      const response = await trpcClient.auth.login.mutate({ email, password });

      if (!response.success || !response.user || !response.token) {
        throw new Error('Invalid response from server');
      }

      await batchSetItems({
        [STORAGE_KEYS.USER]: JSON.stringify(response.user),
        [STORAGE_KEYS.TOKEN]: response.token,
      });

      setAuthState({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
      });

      console.log('[AuthContext] Login successful');
      return { success: true, user: response.user };
    } catch (error) {
      console.error('[AuthContext] Login failed:', error);
      const message = error instanceof Error ? error.message : 'Login failed. Please try again.';
      throw new Error(message);
    }
  }, []);

  const signup = useCallback(async (email: string, password: string, name: string) => {
    try {
      console.log('[AuthContext] Signing up user:', email);
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Please enter a valid email address');
      }

      if (name.length < 2) {
        throw new Error('Name must be at least 2 characters');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      const response = await trpcClient.auth.signup.mutate({ email, password, name });

      if (!response.success || !response.user || !response.token) {
        throw new Error('Invalid response from server');
      }

      await batchSetItems({
        [STORAGE_KEYS.USER]: JSON.stringify(response.user),
        [STORAGE_KEYS.TOKEN]: response.token,
      });

      setAuthState({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
      });

      console.log('[AuthContext] Signup successful');
      return { success: true, user: response.user };
    } catch (error) {
      console.error('[AuthContext] Signup failed:', error);
      const message = error instanceof Error ? error.message : 'Signup failed. Please try again.';
      throw new Error(message);
    }
  }, []);

  const loginWithOAuth = useCallback(async (provider: 'github' | 'google') => {
    try {
      console.log(`[AuthContext] Initiating OAuth login with ${provider}`);

      if (provider === 'github') {
        const { authenticateWithGitHub } = await import('@/lib/github-oauth');
        const result = await authenticateWithGitHub();

        const user: User = {
          id: result.user.id.toString(),
          email: result.user.email,
          name: result.user.name || result.user.login,
          avatar: result.user.avatar_url,
          provider: 'github',
          createdAt: new Date().toISOString(),
          subscription: 'free',
          credits: 100,
        };

        await batchSetItems({
          [STORAGE_KEYS.USER]: JSON.stringify(user),
          [STORAGE_KEYS.TOKEN]: result.accessToken,
          'github-access-token': result.accessToken,
        });

        setAuthState({
          user,
          token: result.accessToken,
          isAuthenticated: true,
          isLoading: false,
        });

        console.log(`[AuthContext] GitHub OAuth successful:`, user.name);
        return { success: true, user };
      } else {
        const mockUser: User = {
          id: `user_${Date.now()}`,
          email: `demo@${provider}.com`,
          name: `${provider.charAt(0).toUpperCase() + provider.slice(1)} Demo User`,
          avatar: 'https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png',
          provider,
          createdAt: new Date().toISOString(),
          subscription: 'free',
          credits: 100,
        };

        const mockToken = `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        await batchSetItems({
          [STORAGE_KEYS.USER]: JSON.stringify(mockUser),
          [STORAGE_KEYS.TOKEN]: mockToken,
        });

        setAuthState({
          user: mockUser,
          token: mockToken,
          isAuthenticated: true,
          isLoading: false,
        });

        console.log(`[AuthContext] OAuth login successful with ${provider}`);
        return { success: true, user: mockUser };
      }
    } catch (error) {
      console.error(`[AuthContext] OAuth login failed with ${provider}:`, error);
      const message = error instanceof Error ? error.message : `${provider} authentication failed. Please try again.`;
      throw new Error(message);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      console.log('[AuthContext] Logging out user');
      
      await AsyncStorage.multiRemove([STORAGE_KEYS.USER, STORAGE_KEYS.TOKEN]);

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
      if (!authState.user || !authState.token) {
        throw new Error('No user logged in');
      }

      const updatedUser = { ...authState.user, ...updates };
      
      setAuthState(prev => ({
        ...prev,
        user: updatedUser,
      }));

      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));

      console.log('[AuthContext] Profile updated:', updates);
      return { success: true, user: updatedUser };
    } catch (error) {
      console.error('[AuthContext] Profile update failed:', error);
      
      if (authState.user) {
        setAuthState(prev => ({
          ...prev,
          user: authState.user,
        }));
      }
      
      throw new Error('Failed to update profile. Please try again.');
    }
  }, [authState.user, authState.token]);

  const updateCredits = useCallback(async (amount: number) => {
    try {
      if (!authState.user) {
        throw new Error('No user logged in');
      }

      const updatedUser = {
        ...authState.user,
        credits: Math.max(0, authState.user.credits + amount),
      };

      setAuthState(prev => ({
        ...prev,
        user: updatedUser,
      }));

      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));

      console.log('[AuthContext] Credits updated:', amount);
      return { success: true, credits: updatedUser.credits };
    } catch (error) {
      console.error('[AuthContext] Credits update failed:', error);
      
      if (authState.user) {
        setAuthState(prev => ({
          ...prev,
          user: authState.user,
        }));
      }
      
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

      setAuthState(prev => ({
        ...prev,
        user: updatedUser,
      }));

      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));

      console.log('[AuthContext] Subscription upgraded to:', tier);
      return { success: true, subscription: tier };
    } catch (error) {
      console.error('[AuthContext] Subscription upgrade failed:', error);
      
      if (authState.user) {
        setAuthState(prev => ({
          ...prev,
          user: authState.user,
        }));
      }
      
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
