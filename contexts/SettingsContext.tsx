import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  email: 'dev@intruvurt.space',
};

export const [SettingsProvider, useSettings] = createContextHook(() => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadSettings = useCallback(async () => {
    try {
      const [storedSettings, storedProfile] = await Promise.all([
        AsyncStorage.getItem('app-settings'),
        AsyncStorage.getItem('user-profile'),
      ]);

      if (storedSettings) {
        setSettings(JSON.parse(storedSettings));
      }

      if (storedProfile) {
        setProfile(JSON.parse(storedProfile));
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

  const updateSettings = useCallback(async (updates: Partial<AppSettings>) => {
    try {
      setSettings(prev => {
        const newSettings = { ...prev, ...updates };
        AsyncStorage.setItem('app-settings', JSON.stringify(newSettings)).catch(err => 
          console.error('[SettingsContext] Failed to persist settings:', err)
        );
        return newSettings;
      });
      console.log('[SettingsContext] Settings updated:', updates);
    } catch (error) {
      console.error('[SettingsContext] Failed to update settings:', error);
      throw error;
    }
  }, []);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    try {
      setProfile(prev => {
        const newProfile = { ...prev, ...updates };
        AsyncStorage.setItem('user-profile', JSON.stringify(newProfile)).catch(err => 
          console.error('[SettingsContext] Failed to persist profile:', err)
        );
        return newProfile;
      });
      console.log('[SettingsContext] Profile updated:', updates);
    } catch (error) {
      console.error('[SettingsContext] Failed to update profile:', error);
      throw error;
    }
  }, []);

  const resetSettings = useCallback(async () => {
    try {
      setSettings(DEFAULT_SETTINGS);
      await AsyncStorage.setItem('app-settings', JSON.stringify(DEFAULT_SETTINGS));
      console.log('[SettingsContext] Settings reset to defaults');
    } catch (error) {
      console.error('[SettingsContext] Failed to reset settings:', error);
      throw error;
    }
  }, []);

  const resetProfile = useCallback(async () => {
    try {
      setProfile(DEFAULT_PROFILE);
      await AsyncStorage.setItem('user-profile', JSON.stringify(DEFAULT_PROFILE));
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
      if (data.settings) {
        await updateSettings(data.settings);
      }
      if (data.profile) {
        await updateProfile(data.profile);
      }
      console.log('[SettingsContext] Settings imported successfully');
    } catch (error) {
      console.error('[SettingsContext] Failed to import settings:', error);
      throw error;
    }
  }, [updateSettings, updateProfile]);

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
