// contexts/AuthContext.tsx
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
  subscription?: 'free' | 'basic' | 'pro' | 'elite';
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
        let userObj: User;
        try {
          userObj = typeof storedUser === 'string' ? JSON.parse(storedUser) : storedUser;
        } catch (err) {
          console.warn('[AuthContext] Failed parsing stored user JSON:', err);
          setAuthState(prev => ({ ...prev, isLoading: false }));
          return;
        }

        setAuthState({
          user: userObj,
          token: storedToken,
          isAuthenticated: true,
          isLoading: false,
        });
        console.log('[AuthContext] User session restored:', userObj.email);
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
  }, []);

  const signup = useCallback(async (email: string, password: string, name: string) => {
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
  }, []);

  const loginWithOAuth = useCallback(async (provider: 'github' | 'google') => {
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
      const { useGoogleAuth } = await import('@/lib/google-oauth');
      const { promptAsync } = useGoogleAuth();
      const result = await promptAsync();
      const user: User = {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        avatar: result.user.picture,
        provider: 'google',
        createdAt: new Date().toISOString(),
        subscription: 'free',
        credits: 100,
      };

      await batchSetItems({
        [STORAGE_KEYS.USER]: JSON.stringify(user),
        [STORAGE_KEYS.TOKEN]: result.accessToken,
        'google-access-token': result.accessToken,
      });

      setAuthState({
        user,
        token: result.accessToken,
        isAuthenticated: true,
        isLoading: false,
      });

      console.log(`[AuthContext] Google OAuth successful:`, user.name);
      return { success: true, user };
    }
  }, []);

  const logout = useCallback(async () => {
    console.log('[AuthContext] Logging out user');
    await AsyncStorage.multiRemove([STORAGE_KEYS.USER, STORAGE_KEYS.TOKEN]);
    setAuthState({ user: null, token: null, isAuthenticated: false, isLoading: false });
    console.log('[AuthContext] Logout successful');
  }, []);

  const updateProfile = useCallback(async (updates: Partial<User>) => {
    if (!authState.user) throw new Error('No user logged in');

    console.log('[AuthContext] Profile updating:', updates);
    const updatedUser = { ...authState.user, ...updates };
    setAuthState(prev => ({ ...prev, user: updatedUser }));
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
    return { success: true, user: updatedUser };
  }, [authState.user]);

  const updateCredits = useCallback(async (amount: number) => {
    if (!authState.user) throw new Error('No user logged in');

    const newCredits = Math.max(0, authState.user.credits + amount);
    const updatedUser = { ...authState.user, credits: newCredits };
    setAuthState(prev => ({ ...prev, user: updatedUser }));
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
    console.log('[AuthContext] Credits updated:', amount);
    return { success: true, credits: newCredits };
  }, [authState.user]);

  const upgradeSubscription = useCallback(async (tier: 'basic' | 'pro' | 'enterprise') => {
    if (!authState.user) throw new Error('No user logged in');

    console.log('[AuthContext] Subscription upgrade to:', tier);
    const updatedUser = { ...authState.user, subscription: tier };
    setAuthState(prev => ({ ...prev, user: updatedUser }));
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
    return { success: true, subscription: tier };
  }, [authState.user]);

  return useMemo(() => ({
    user: authState.user,
    token: authState.token,
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    login,
    signup,
    loginWithOAuth,
    logout,
    updateProfile,
    updateCredits,
    upgradeSubscription,
  }), [authState, login, signup, loginWithOAuth, logout, updateProfile, updateCredits, upgradeSubscription]);
});
