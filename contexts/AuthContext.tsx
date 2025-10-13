// AuthContext.tsx
import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { trpcClient } from '@/lib/trpc';
import { batchSetItems, batchGetItems } from '@/lib/storage';
import { requestCache } from '@/lib/batch-requests';

/** ───────────────────────── Types ───────────────────────── **/

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
  isLoading: boolean; // initial boot/loading flag
}

type OAuthProvider = 'github' | 'google';

/** ───────────────────────── Constants ───────────────────────── **/

const STORAGE_KEYS = {
  USER: 'auth-user',
  TOKEN: 'auth-token',
  GH_TOKEN: 'github-access-token', // optional—used when logging out to clean up
} as const;

/** ───────────────────────── Utils ───────────────────────── **/

const logger = {
  info: (...args: any[]) => { if (typeof __DEV__ === 'undefined' || __DEV__) console.log(...args); },
  warn: (...args: any[]) => { if (typeof __DEV__ === 'undefined' || __DEV__) console.warn(...args); },
  error: (...args: any[]) => console.error(...args),
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}

function safeParseJSON<T = unknown>(value: unknown, fallback: T): T {
  try {
    if (typeof value === 'string') return JSON.parse(value) as T;
    if (value && typeof value === 'object') return value as T;
    return fallback;
  } catch {
    return fallback;
  }
}

function sanitizeUser(u: any): User | null {
  if (!u) return null;
  const email = String(u.email || '').trim();
  const id = String(u.id || '').trim();
  const name = String(u.name || '').trim() || email.split('@')[0] || 'User';
  if (!email || !id) return null;
  const createdAt = isNonEmptyString(u.createdAt) ? u.createdAt : new Date().toISOString();
  const credits = Number.isFinite(u.credits) ? Number(u.credits) : 0;
  const provider = (u.provider === 'github' || u.provider === 'google' || u.provider === 'email') ? u.provider : undefined;
  const avatar = isNonEmptyString(u.avatar) ? u.avatar : undefined;
  const subscription = (['free', 'basic', 'pro', 'enterprise'] as const).includes(u.subscription)
    ? u.subscription
    : (u.subscription ? 'free' : undefined);
  return { id, email, name, avatar, provider, createdAt, subscription, credits };
}

function mask(token: string | null) {
  if (!token) return '(null)';
  return token.length <= 8 ? '********' : `${token.slice(0, 4)}…${token.slice(-4)}`;
}

function debounce<T extends (...args: any[]) => void>(fn: T, delay = 250) {
  let t: any;
  return (...args: Parameters<T>) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

/** ───────────────────────── Context ───────────────────────── **/

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Prevent concurrent auth mutations (double-taps)
  const busyRef = useRef(false);

  /** ───────── Boot: restore session from storage (with cache) ───────── **/
  const loadAuthState = useCallback(async () => {
    try {
      const data = await requestCache.get('auth-state', async () => {
        return await batchGetItems([STORAGE_KEYS.USER, STORAGE_KEYS.TOKEN]);
      }) as Record<string, any>;

      const storedUserRaw = data[STORAGE_KEYS.USER];
      const storedToken = data[STORAGE_KEYS.TOKEN] as string | null;

      if (storedUserRaw && storedToken) {
        const user = sanitizeUser(safeParseJSON<User>(storedUserRaw, null));
        if (user) {
          setAuthState({
            user,
            token: storedToken,
            isAuthenticated: true,
            isLoading: false,
          });
          logger.info('[AuthContext] Session restored for', user.email);
        } else {
          // Corrupt user payload; clear
          await AsyncStorage.multiRemove([STORAGE_KEYS.USER, STORAGE_KEYS.TOKEN]);
          setAuthState({ user: null, token: null, isAuthenticated: false, isLoading: false });
          logger.warn('[AuthContext] Corrupt user in storage; cleared.');
        }
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      logger.error('[AuthContext] Failed to load auth state:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    loadAuthState();
  }, [loadAuthState]);

  /** ───────── Persist helpers ───────── **/
  const persistAuth = useCallback(
    debounce(async (user: User | null, token: string | null) => {
      try {
        if (user && token) {
          await batchSetItems({
            [STORAGE_KEYS.USER]: JSON.stringify(user),
            [STORAGE_KEYS.TOKEN]: token,
          });
        } else {
          await AsyncStorage.multiRemove([STORAGE_KEYS.USER, STORAGE_KEYS.TOKEN, STORAGE_KEYS.GH_TOKEN]);
        }
      } catch (e) {
        logger.error('[AuthContext] Persist auth failed:', e);
      }
    }, 150),
    []
  );

  /** ───────── Login (email/password) ───────── **/
  const login = useCallback(async (email: string, password: string) => {
    if (busyRef.current) return Promise.reject(new Error('Please wait…'));
    busyRef.current = true;

    try {
      logger.info('[AuthContext] Logging in user:', email);

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) throw new Error('Please enter a valid email address');
      if (password.length < 6) throw new Error('Password must be at least 6 characters');

      const response = await trpcClient.auth.login.mutate({ email, password });

      if (!response?.success || !response.user || !response.token) {
        throw new Error('Invalid response from server');
      }

      const user = sanitizeUser(response.user);
      if (!user) throw new Error('Malformed user profile returned');

      setAuthState({
        user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
      });

      persistAuth(user, response.token);
      requestCache.clear(); // clear cached unauthenticated results
      logger.info('[AuthContext] Login successful (token:', mask(response.token), ')');
      return { success: true, user };
    } catch (error) {
      logger.error('[AuthContext] Login failed:', error);
      const message = error instanceof Error ? error.message : 'Login failed. Please try again.';
      throw new Error(message);
    } finally {
      busyRef.current = false;
    }
  }, [persistAuth]);

  /** ───────── Signup ───────── **/
  const signup = useCallback(async (email: string, password: string, name: string) => {
    if (busyRef.current) return Promise.reject(new Error('Please wait…'));
    busyRef.current = true;

    try {
      logger.info('[AuthContext] Signing up user:', email);

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) throw new Error('Please enter a valid email address');
      if ((name || '').trim().length < 2) throw new Error('Name must be at least 2 characters');
      if (password.length < 6) throw new Error('Password must be at least 6 characters');

      const response = await trpcClient.auth.signup.mutate({ email, password, name });

      if (!response?.success || !response.user || !response.token) {
        throw new Error('Invalid response from server');
      }

      const user = sanitizeUser(response.user);
      if (!user) throw new Error('Malformed user profile returned');

      setAuthState({
        user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
      });

      persistAuth(user, response.token);
      requestCache.clear();
      logger.info('[AuthContext] Signup successful (token:', mask(response.token), ')');
      return { success: true, user };
    } catch (error) {
      logger.error('[AuthContext] Signup failed:', error);
      const message = error instanceof Error ? error.message : 'Signup failed. Please try again.';
      throw new Error(message);
    } finally {
      busyRef.current = false;
    }
  }, [persistAuth]);

  /** ───────── OAuth (GitHub / Google) ───────── **/
  const loginWithOAuth = useCallback(async (provider: OAuthProvider) => {
    if (busyRef.current) return Promise.reject(new Error('Please wait…'));
    busyRef.current = true;

    try {
      logger.info(`[AuthContext] Initiating OAuth login with ${provider}`);

      if (provider === 'github') {
        const { authenticateWithGitHub } = await import('@/lib/github-oauth');
        const result = await authenticateWithGitHub();

        const user: User = sanitizeUser({
          id: result.user.id?.toString?.(),
          email: result.user.email,
          name: result.user.name || result.user.login,
          avatar: result.user.avatar_url,
          provider: 'github',
          createdAt: new Date().toISOString(),
          subscription: 'free',
          credits: 100,
        })!;

        const accessToken = String(result.accessToken || '');
        if (!accessToken) throw new Error('GitHub did not return an access token');

        await batchSetItems({
          [STORAGE_KEYS.USER]: JSON.stringify(user),
          [STORAGE_KEYS.TOKEN]: accessToken,
          [STORAGE_KEYS.GH_TOKEN]: accessToken,
        });

        setAuthState({
          user,
          token: accessToken,
          isAuthenticated: true,
          isLoading: false,
        });

        requestCache.clear();
        logger.info(`[AuthContext] GitHub OAuth successful for ${user.name} (token: ${mask(accessToken)})`);
        return { success: true, user };
      }

      // Google (mock/demo path)
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

      requestCache.clear();
      logger.info(`[AuthContext] OAuth login successful with ${provider} (token: ${mask(mockToken)})`);
      return { success: true, user: mockUser };
    } catch (error) {
      logger.error(`[AuthContext] OAuth login failed with ${provider}:`, error);
      const message = error instanceof Error ? error.message : `${provider} authentication failed. Please try again.`;
      throw new Error(message);
    } finally {
      busyRef.current = false;
    }
  }, []);

  /** ───────── Logout ───────── **/
  const logout = useCallback(async () => {
    try {
      logger.info('[AuthContext] Logging out user');

      await AsyncStorage.multiRemove([STORAGE_KEYS.USER, STORAGE_KEYS.TOKEN, STORAGE_KEYS.GH_TOKEN]);

      setAuthState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });

      requestCache.clear();
      logger.info('[AuthContext] Logout successful');
    } catch (error) {
      logger.error('[AuthContext] Logout failed:', error);
      throw new Error('Logout failed. Please try again.');
    }
  }, []);

  /** ───────── Update Profile ───────── **/
  const updateProfile = useCallback(async (updates: Partial<User>) => {
    try {
      if (!authState.user || !authState.token) {
        throw new Error('No user logged in');
      }

      // Client-side merge; optionally call server here via trpcClient.user.update.mutate(...)
      const merged = sanitizeUser({ ...authState.user, ...updates });
      if (!merged) throw new Error('Invalid profile update');

      setAuthState(prev => ({ ...prev, user: merged }));
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(merged));

      requestCache.clear();
      logger.info('[AuthContext] Profile updated for', merged.email);
      return { success: true, user: merged };
    } catch (error) {
      logger.error('[AuthContext] Profile update failed:', error);
      // Rollback is implicit since we set from prev state before
      throw new Error('Failed to update profile. Please try again.');
    }
  }, [authState.user, authState.token]);

  /** ───────── Credits ───────── **/
  const updateCredits = useCallback(async (amount: number) => {
    try {
      if (!authState.user) throw new Error('No user logged in');

      const nextCredits = Math.max(0, (authState.user.credits || 0) + amount);
      const updatedUser: User = { ...authState.user, credits: nextCredits };

      setAuthState(prev => ({ ...prev, user: updatedUser }));
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));

      logger.info('[AuthContext] Credits updated by', amount, '→', nextCredits);
      return { success: true, credits: nextCredits };
    } catch (error) {
      logger.error('[AuthContext] Credits update failed:', error);
      throw new Error('Failed to update credits. Please try again.');
    }
  }, [authState.user]);

  /** ───────── Subscription ───────── **/
  const upgradeSubscription = useCallback(async (tier: 'basic' | 'pro' | 'enterprise') => {
    try {
      if (!authState.user) throw new Error('No user logged in');

      const updatedUser: User = { ...authState.user, subscription: tier };

      setAuthState(prev => ({ ...prev, user: updatedUser }));
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));

      logger.info('[AuthContext] Subscription upgraded to:', tier);
      return { success: true, subscription: tier };
    } catch (error) {
      logger.error('[AuthContext] Subscription upgrade failed:', error);
      throw new Error('Failed to upgrade subscription. Please try again.');
    }
  }, [authState.user]);

  /** ───────── Optional: propagate token to tRPC headers when it changes ───────── **/
  useEffect(() => {
    // If your trpc client supports dynamic headers, set them here.
    // Example (adjust to your trpc client implementation):
    try {
      const token = authState.token;
      // @ts-ignore – only if your trpc client exposes this
      if (trpcClient?.setAuthToken) trpcClient.setAuthToken(token);
      logger.info('[AuthContext] tRPC auth header updated:', mask(token));
    } catch {
      // no-op if not supported
    }
  }, [authState.token]);

  /** ───────── Exposed API ───────── **/

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
