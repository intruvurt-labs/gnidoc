import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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

function makeDebounce<T extends (...args: any[]) => any>(fn: T, ms = 300) {
  let t: any = null;
  let lastArgs: Parameters<T> | null = null;
  const debounced = (...args: Parameters<T>) => {
    lastArgs = args;
    clearTimeout(t);
    t = setTimeout(() => {
      const a = lastArgs as Parameters<T>;
      lastArgs = null;
      fn(...a);
    }, ms);
  };
  debounced.cancel = () => { clearTimeout(t); t = null; lastArgs = null; };
  debounced.flush = () => { if (t && lastArgs) { clearTimeout(t); const a = lastArgs as Parameters<T>; lastArgs = null; fn(...a); } };
  return debounced as T & { cancel: () => void; flush: () => void };
}

/** ───────────────────────── Context ───────────────────────── */

export const [SettingsProvider, useSettings] = createContextHook(() => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Keep freshest snapshots
  const settingsRef = useRef(settings);
  const profileRef = useRef(profile);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { profileRef.current = profile; }, [profile]);

  // Unified persisters (batched)
  const persistSettings = useMemo(() => makeDebounce(async () => {
    try {
      const parsed = SettingsSchema.parse(settingsRef.current);
      await batchSetItems({ [SETTINGS_KEY]: JSON.stringify(parsed) });
    } catch (err) {
      console.error('[SettingsContext] Persist settings failed:', err);
    }
  }, 400), []);

  const persistProfile = useMemo(() => makeDebounce(async () => {
    try {
      const parsed = ProfileSchema.parse(profileRef.current);
      await batchSetItems({ [PROFILE_KEY]: JSON.stringify(parsed) });
    } catch (err) {
      console.error('[SettingsContext] Persist profile failed:', err);
    }
  }, 400), []);

  // Call them whenever state changes (they read from refs at flush time)
  useEffect(() => { persistSettings(); }, [settings, persistSettings]);
  useEffect(() => { persistProfile(); }, [profile, persistProfile]);

  // Cleanup
  useEffect(() => () => {
    persistSettings.flush?.();
    persistProfile.flush?.();
    persistSettings.cancel?.();
    persistProfile.cancel?.();
  }, [persistSettings, persistProfile]);

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
        return next;
      });
    },
    []
  );

  const updateProfile = useCallback(
    async (updates: Partial<UserProfile>) => {
      setProfile(prev => {
        const next = { ...prev, ...updates };
        return next;
      });
    },
    []
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

  /** Migrations with version-aware upgrades */
  function migrateSettings(input: any, fromVersion?: string): AppSettings {
    const merged: AppSettings = { ...DEFAULT_SETTINGS, ...input };
    merged.fontSize = Math.min(32, Math.max(8, Number(merged.fontSize) || DEFAULT_SETTINGS.fontSize));
    merged.tabSize = Math.min(8, Math.max(2, Number(merged.tabSize) || DEFAULT_SETTINGS.tabSize));
    
    if (fromVersion && fromVersion < '1.1.0' && typeof merged.minimap !== 'boolean') {
      merged.minimap = DEFAULT_SETTINGS.minimap;
    }
    
    return merged;
  }

  function migrateProfile(input: any, _fromVersion?: string): UserProfile {
    return { ...DEFAULT_PROFILE, ...input };
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
