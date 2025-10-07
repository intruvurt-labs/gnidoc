import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { debounce } from '@/lib/performance';
import { batchSetItems, batchGetItems } from '@/lib/storage';

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

export const [SettingsProvider, useSettings] = createContextHook(() => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadSettings = useCallback(async () => {
    try {
      const data = await batchGetItems(['app-settings', 'user-profile']);

      const storedSettings = data['app-settings'];
      const storedProfile = data['user-profile'];

      if (storedSettings) {
        const parsed = typeof storedSettings === 'string' ? JSON.parse(storedSettings) : storedSettings;
        setSettings(parsed);
      }

      if (storedProfile) {
        const parsed = typeof storedProfile === 'string' ? JSON.parse(storedProfile) : storedProfile;
        setProfile(parsed);
      }

      console.log('[SettingsContext] Settings and profile loaded');
    } catch (error) {
      console.error('[SettingsContext] Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const debouncedSaveSettings = useRef(
    debounce(async (newSettings: AppSettings) => {
      try {
        await AsyncStorage.setItem('app-settings', JSON.stringify(newSettings));
        console.log('[SettingsContext] Settings persisted');
      } catch (err) {
        console.error('[SettingsContext] Failed to persist settings:', err);
      }
    }, 500)
  ).current;

  const updateSettings = useCallback(async (updates: Partial<AppSettings>) => {
    try {
      setSettings(prev => {
        const newSettings = { ...prev, ...updates };
        debouncedSaveSettings(newSettings);
        return newSettings;
      });
      console.log('[SettingsContext] Settings updated:', updates);
    } catch (error) {
      console.error('[SettingsContext] Failed to update settings:', error);
      throw error;
    }
  }, [debouncedSaveSettings]);

  const debouncedSaveProfile = useRef(
    debounce(async (newProfile: UserProfile) => {
      try {
        await AsyncStorage.setItem('user-profile', JSON.stringify(newProfile));
        console.log('[SettingsContext] Profile persisted');
      } catch (err) {
        console.error('[SettingsContext] Failed to persist profile:', err);
      }
    }, 500)
  ).current;

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    try {
      setProfile(prev => {
        const newProfile = { ...prev, ...updates };
        debouncedSaveProfile(newProfile);
        return newProfile;
      });
      console.log('[SettingsContext] Profile updated:', updates);
    } catch (error) {
      console.error('[SettingsContext] Failed to update profile:', error);
      throw error;
    }
  }, [debouncedSaveProfile]);

  const resetSettings = useCallback(async () => {
    try {
      setSettings(DEFAULT_SETTINGS);
      await batchSetItems({
        'app-settings': JSON.stringify(DEFAULT_SETTINGS),
      });
      console.log('[SettingsContext] Settings reset to defaults');
    } catch (error) {
      console.error('[SettingsContext] Failed to reset settings:', error);
      throw error;
    }
  }, []);

  const resetProfile = useCallback(async () => {
    try {
      setProfile(DEFAULT_PROFILE);
      await batchSetItems({
        'user-profile': JSON.stringify(DEFAULT_PROFILE),
      });
      console.log('[SettingsContext] Profile reset to defaults');
    } catch (error) {
      console.error('[SettingsContext] Failed to reset profile:', error);
      throw error;
    }
  }, []);

  const exportSettings = useCallback(() => {
    return {
      settings,
      profile,
      exportDate: new Date().toISOString(),
      version: '1.0.0',
    };
  }, [settings, profile]);

  const importSettings = useCallback(async (data: any) => {
    try {
      const updates: Record<string, string> = {};
      
      if (data.settings) {
        setSettings(data.settings);
        updates['app-settings'] = JSON.stringify(data.settings);
      }
      if (data.profile) {
        setProfile(data.profile);
        updates['user-profile'] = JSON.stringify(data.profile);
      }
      
      if (Object.keys(updates).length > 0) {
        await batchSetItems(updates);
      }
      
      console.log('[SettingsContext] Settings imported successfully');
    } catch (error) {
      console.error('[SettingsContext] Failed to import settings:', error);
      throw error;
    }
  }, []);

  return useMemo(() => ({
    settings,
    profile,
    isLoading,
    updateSettings,
    updateProfile,
    resetSettings,
    resetProfile,
    exportSettings,
    importSettings,
  }), [
    settings,
    profile,
    isLoading,
    updateSettings,
    updateProfile,
    resetSettings,
    resetProfile,
    exportSettings,
    importSettings,
  ]);
});
