import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { debounce } from '@/lib/performance';
import { batchSetItems, batchGetItems } from '@/lib/storage';
import { z } from 'zod';

/** ───────────────────────── Types & Schemas ───────────────────────── */

interface UserProfile {
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  company?: string;
  location?: string;
}

interface AppSettings {
  notifications: boolean;
  darkMode: boolean;
  autoSave: boolean;
  analytics: boolean;
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  lineNumbers: boolean;
  minimap: boolean;
  autoComplete: boolean;
}

type ExportPackage = {
  version: string; // semantic app schema version
  exportedAt: string;
  settings: AppSettings;
  profile: UserProfile;
};

const SETTINGS_KEY = 'app-settings';
const PROFILE_KEY = 'user-profile';
const EXPORT_VERSION = '1.1.0'; // bump when fields change

// Schemas (tighten constraints as needed)
const SettingsSchema = z.object({
  notifications: z.boolean(),
  darkMode: z.boolean(),
  autoSave: z.boolean(),
  analytics: z.boolean(),
  fontSize: z.number().min(8).max(32),
  tabSize: z.number().min(2).max(8),
  wordWrap: z.boolean(),
  lineNumbers: z.boolean(),
  minimap: z.boolean(),
  autoComplete: z.boolean(),
});

const ProfileSchema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email(),
  avatar: z.string().url().optional(),
  bio: z.string().max(280).optional(),
  company: z.string().max(120).optional(),
  location: z.string().max(120).optional(),
});

/** ───────────────────────── Defaults ───────────────────────── */

const DEFAULT_SETTINGS: AppSettings = {
  notifications: true,
  darkMode: true,
  autoSave: true,
  analytics: false,
  fontSize: 14,
  tabSize: 2,
  wordWrap: true,
  lineNumbers: true,
  minimap: false,
  autoComplete: true,
};

const DEFAULT_PROFILE: UserProfile = {
  name: 'Developer',
  email: 'support@intruvurt.space',
};

/** ───────────────────────── Utils ───────────────────────── */

function deepEqual(a: unknown, b: unknown) {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

/** ───────────────────────── Context ───────────────────────── */

export const [SettingsProvider, useSettings] = createContextHook(() => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Debounced persistors
  const debouncedSaveSettings = useRef(
    debounce(async (next: AppSettings) => {
      try {
        // validate before persisting
        const parsed = SettingsSchema.parse(next);
        await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(parsed));
        // console.log('[SettingsContext] Settings persisted');
      } catch (err) {
        console.error('[SettingsContext] Persist settings failed:', err);
      }
    }, 400)
  ).current;

  const debouncedSaveProfile = useRef(
    debounce(async (next: UserProfile) => {
      try {
        const parsed = ProfileSchema.parse(next);
        await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(parsed));
        // console.log('[SettingsContext] Profile persisted');
      } catch (err) {
        console.error('[SettingsContext] Persist profile failed:', err);
      }
    }, 400)
  ).current;

  // Cleanup debouncers on unmount to avoid post-unmount state updates
  useEffect(() => {
    return () => {
      // if your debounce util exposes cancel/flush, call it here:
      // @ts-ignore
      debouncedSaveSettings.cancel?.();
      // @ts-ignore
      debouncedSaveProfile.cancel?.();
    };
  }, [debouncedSaveSettings, debouncedSaveProfile]);

  /** Load once */
  const loadSettings = useCallback(async () => {
    try {
      const data = await batchGetItems([SETTINGS_KEY, PROFILE_KEY]);

      const storedSettings = await (async () => {
        if (!data || data === null) return DEFAULT_SETTINGS;
        const v = data?.[SETTINGS_KEY];
        if (!v) return DEFAULT_SETTINGS;
        try {
          const parsed = typeof v === 'string' ? JSON.parse(v) : v;
          const migrated = migrateSettings(parsed);
          const res = SettingsSchema.safeParse(migrated);
          return res.success ? res.data : DEFAULT_SETTINGS;
        } catch {
          return DEFAULT_SETTINGS;
        }
      })();

      const storedProfile = await (async () => {
        if (!data || data === null) return DEFAULT_PROFILE;
        const v = data?.[PROFILE_KEY];
        if (!v) return DEFAULT_PROFILE;
        try {
          const parsed = typeof v === 'string' ? JSON.parse(v) : v;
          const migrated = migrateProfile(parsed);
          const res = ProfileSchema.safeParse(migrated);
          return res.success ? res.data : DEFAULT_PROFILE;
        } catch {
          return DEFAULT_PROFILE;
        }
      })();

      setSettings(storedSettings);
      setProfile(storedProfile);
      console.log('[SettingsContext] Settings & profile loaded successfully');
    } catch (error) {
      console.error('[SettingsContext] Failed to load settings:', error);
      setSettings(DEFAULT_SETTINGS);
      setProfile(DEFAULT_PROFILE);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  /** Public updaters */
  const updateSettings = useCallback(
    async (updates: Partial<AppSettings>) => {
      setSettings(prev => {
        const next = { ...prev, ...updates };
        if (!deepEqual(prev, next)) debouncedSaveSettings(next);
        return next;
      });
      // console.log('[SettingsContext] Settings updated:', updates);
    },
    [debouncedSaveSettings]
  );

  const updateProfile = useCallback(
    async (updates: Partial<UserProfile>) => {
      setProfile(prev => {
        const next = { ...prev, ...updates };
        if (!deepEqual(prev, next)) debouncedSaveProfile(next);
        return next;
      });
      // console.log('[SettingsContext] Profile updated:', updates);
    },
    [debouncedSaveProfile]
  );

  const resetSettings = useCallback(async () => {
    try {
      setSettings(DEFAULT_SETTINGS);
      await batchSetItems({ [SETTINGS_KEY]: JSON.stringify(DEFAULT_SETTINGS) });
      // console.log('[SettingsContext] Settings reset');
    } catch (error) {
      console.error('[SettingsContext] Failed to reset settings:', error);
      throw error;
    }
  }, []);

  const resetProfile = useCallback(async () => {
    try {
      setProfile(DEFAULT_PROFILE);
      await batchSetItems({ [PROFILE_KEY]: JSON.stringify(DEFAULT_PROFILE) });
      // console.log('[SettingsContext] Profile reset');
    } catch (error) {
      console.error('[SettingsContext] Failed to reset profile:', error);
      throw error;
    }
  }, []);

  /** Export / Import with validation + version handling */
  const exportSettings = useCallback((): ExportPackage => {
    return {
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      settings,
      profile,
    };
  }, [settings, profile]);

  const importSettings = useCallback(async (data: unknown) => {
    try {
      // shape guard
      const pkg = z
        .object({
          version: z.string(),
          exportedAt: z.string(),
          settings: SettingsSchema,
          profile: ProfileSchema,
        })
        .parse(data);

      // migrations if needed (based on pkg.version)
      const nextSettings = migrateSettings(pkg.settings);
      const nextProfile = migrateProfile(pkg.profile);

      const updates: Record<string, string> = {
        [SETTINGS_KEY]: JSON.stringify(nextSettings),
        [PROFILE_KEY]: JSON.stringify(nextProfile),
      };

      setSettings(nextSettings);
      setProfile(nextProfile);
      await batchSetItems(updates);

      // console.log('[SettingsContext] Settings imported successfully');
    } catch (error) {
      console.error('[SettingsContext] Failed to import settings:', error);
      throw error;
    }
  }, []);

  /** Migrations (no-ops for now; extend when you add fields) */
  function migrateSettings(input: any): AppSettings {
    // Example: supply defaults for newly added fields
    const merged: AppSettings = {
      ...DEFAULT_SETTINGS,
      ...input,
    };
    // clamp numerics just in case
    merged.fontSize = Math.min(32, Math.max(8, merged.fontSize));
    merged.tabSize = Math.min(8, Math.max(2, merged.tabSize));
    return merged;
    // Add per-version transforms here using `input.__version` if you store one.
  }

  function migrateProfile(input: any): UserProfile {
    return {
      ...DEFAULT_PROFILE,
      ...input,
    };
  }

  return useMemo(
    () => ({
      settings,
      profile,
      isLoading,
      updateSettings,
      updateProfile,
      resetSettings,
      resetProfile,
      exportSettings,
      importSettings,
    }),
    [
      settings,
      profile,
      isLoading,
      updateSettings,
      updateProfile,
      resetSettings,
      resetProfile,
      exportSettings,
      importSettings,
    ]
  );
});
