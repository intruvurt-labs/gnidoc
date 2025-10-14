import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '@/constants/colors';

export interface Theme {
  id: string;
  name: string;
  preview: string[];
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    card: string;
    text: string;
    border: string;
  };
}

export interface ThemeSettings {
  themeId: string;
  glowIntensity: number;
  pulseSpeed: number;
}

const STORAGE_KEY = 'app-theme';

export const THEMES: Theme[] = [
  {
    id: 'cyan_red_power',
    name: 'Cyan-Red Power',
    preview: [Colors.Colors.cyan.primary, Colors.Colors.red.primary],
    colors: {
      primary: Colors.Colors.cyan.primary,
      secondary: Colors.Colors.red.primary,
      accent: Colors.Colors.cyan.primary,
      background: Colors.Colors.black.primary,
      card: Colors.Colors.background.card,
      text: Colors.Colors.text.primary,
      border: Colors.Colors.border.muted,
    },
  },
  {
    id: 'lime_purple_elite',
    name: 'Lime-Purple Elite',
    preview: [Colors.Colors.lime.primary, Colors.Colors.purple.primary],
    colors: {
      primary: Colors.Colors.lime.primary,
      secondary: Colors.Colors.purple.primary,
      accent: Colors.Colors.lime.primary,
      background: Colors.Colors.black.primary,
      card: Colors.Colors.background.card,
      text: Colors.Colors.text.primary,
      border: Colors.Colors.border.muted,
    },
  },
  {
    id: 'matrix_noir',
    name: 'Matrix Noir',
    preview: [Colors.Colors.black.ink, Colors.Colors.cyan.primary],
    colors: {
      primary: Colors.Colors.cyan.primary,
      secondary: Colors.Colors.black.ink,
      accent: Colors.Colors.cyan.primary,
      background: Colors.Colors.black.primary,
      card: Colors.Colors.background.card,
      text: Colors.Colors.text.primary,
      border: Colors.Colors.border.muted,
    },
  },
  {
    id: 'neon_magenta',
    name: 'Neon Magenta',
    preview: [Colors.Colors.magenta.primary, Colors.Colors.yellow.primary],
    colors: {
      primary: Colors.Colors.magenta.primary,
      secondary: Colors.Colors.yellow.primary,
      accent: Colors.Colors.magenta.primary,
      background: Colors.Colors.black.primary,
      card: Colors.Colors.background.card,
      text: Colors.Colors.text.primary,
      border: Colors.Colors.border.muted,
    },
  },
];

const DEFAULT_SETTINGS: ThemeSettings = {
  themeId: 'cyan_red_power',
  glowIntensity: 60,
  pulseSpeed: 50,
};

export const [ThemeProvider, useTheme] = createContextHook(() => {
  const [settings, setSettingsState] = useState<ThemeSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const saved: ThemeSettings = JSON.parse(raw);
          setSettingsState(saved);
          console.log('[ThemeContext] Theme loaded:', saved.themeId);
        }
      } catch (error) {
        console.error('[ThemeContext] Failed to load theme:', error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const setSettings = useCallback(async (updates: Partial<ThemeSettings>) => {
    setSettingsState(prev => {
      const next = { ...prev, ...updates };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(err => {
        console.error('[ThemeContext] Failed to persist theme:', err);
      });
      console.log('[ThemeContext] Theme updated:', updates);
      return next;
    });
  }, []);

  const currentTheme = useMemo(() => {
    return THEMES.find(t => t.id === settings.themeId) ?? THEMES[0];
  }, [settings.themeId]);

  const resetTheme = useCallback(async () => {
    try {
      setSettingsState(DEFAULT_SETTINGS);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
      console.log('[ThemeContext] Theme reset to default');
    } catch (error) {
      console.error('[ThemeContext] Failed to reset theme:', error);
    }
  }, []);

  return useMemo(
    () => ({
      settings,
      setSettings,
      currentTheme,
      isLoading,
      resetTheme,
    }),
    [settings, setSettings, currentTheme, isLoading, resetTheme]
  );
});
