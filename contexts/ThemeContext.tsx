import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Animated } from 'react-native';
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

export const ROUTE_PALETTES: Record<string, string[]> = {
  '/': ['#00D9FF', '#9D4EDD'],
  '/agent': ['#00D9FF', '#E933FF'],
  '/orchestration': ['#00D9FF', '#9D4EDD'],
  '/deploy': ['#E933FF', '#00D9FF'],
  '/themes': ['#9D4EDD', '#00D9FF'],
  '/hub': ['#00D9FF', '#E933FF'],
  '/dashboard': ['#00D9FF', '#9D4EDD'],
  '/code': ['#E933FF', '#00D9FF'],
  '/database': ['#00D9FF', '#9D4EDD'],
  '/terminal': ['#00D9FF', '#E933FF'],
  '/security': ['#9D4EDD', '#00D9FF'],
  '/preferences': ['#00D9FF', '#9D4EDD'],
};

export const THEMES: Theme[] = [
  {
    id: 'cyber_purple',
    name: 'Cyber Purple',
    preview: [Colors.Colors.cyan.primary, Colors.Colors.purple.primary],
    colors: {
      primary: Colors.Colors.cyan.primary,
      secondary: Colors.Colors.purple.primary,
      accent: Colors.Colors.magenta.primary,
      background: Colors.Colors.background.primary,
      card: Colors.Colors.background.card,
      text: Colors.Colors.text.primary,
      border: Colors.Colors.border.muted,
    },
  },
  {
    id: 'neon_magenta',
    name: 'Neon Magenta',
    preview: [Colors.Colors.magenta.primary, Colors.Colors.cyan.primary],
    colors: {
      primary: Colors.Colors.magenta.primary,
      secondary: Colors.Colors.cyan.primary,
      accent: Colors.Colors.magenta.primary,
      background: Colors.Colors.background.primary,
      card: Colors.Colors.background.card,
      text: Colors.Colors.text.primary,
      border: Colors.Colors.border.muted,
    },
  },
  {
    id: 'purple_haze',
    name: 'Purple Haze',
    preview: [Colors.Colors.purple.primary, Colors.Colors.purple.secondary],
    colors: {
      primary: Colors.Colors.purple.primary,
      secondary: Colors.Colors.purple.secondary,
      accent: Colors.Colors.magenta.primary,
      background: Colors.Colors.background.primary,
      card: Colors.Colors.background.card,
      text: Colors.Colors.text.primary,
      border: Colors.Colors.border.muted,
    },
  },
  {
    id: 'electric_dream',
    name: 'Electric Dream',
    preview: [Colors.Colors.cyan.primary, Colors.Colors.magenta.primary],
    colors: {
      primary: Colors.Colors.cyan.primary,
      secondary: Colors.Colors.magenta.primary,
      accent: Colors.Colors.purple.primary,
      background: Colors.Colors.background.primary,
      card: Colors.Colors.background.card,
      text: Colors.Colors.text.primary,
      border: Colors.Colors.border.muted,
    },
  },
];

const DEFAULT_SETTINGS: ThemeSettings = {
  themeId: 'cyber_purple',
  glowIntensity: 60,
  pulseSpeed: 50,
};

export const [ThemeProvider, useTheme] = createContextHook(() => {
  const [settings, setSettingsState] = useState<ThemeSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

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
      console.log('[ThemeContext] Theme updated:', updates);
      return next;
    });
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settingsRef.current)).catch(err => {
      console.error('[ThemeContext] Failed to persist theme:', err);
    });
  }, [settings]);

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

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const speed = settings.pulseSpeed / 50;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1000 / speed,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000 / speed,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [settings.pulseSpeed, pulseAnim]);

  return useMemo(
    () => ({
      settings,
      setSettings,
      currentTheme,
      isLoading,
      resetTheme,
      pulse: pulseAnim,
      primary: currentTheme.colors.primary,
      secondary: currentTheme.colors.secondary,
      accent: currentTheme.colors.accent,
      background: currentTheme.colors.background,
      card: currentTheme.colors.card,
      text: currentTheme.colors.text,
      border: currentTheme.colors.border,
      ROUTE_PALETTES,
    }),
    [settings, setSettings, currentTheme, isLoading, resetTheme, pulseAnim]
  );
});

export function useGlowStyle() {
  const { settings, currentTheme } = useTheme();
  return useMemo(() => {
    const intensity = settings.glowIntensity / 100;
    return {
      shadowColor: currentTheme.colors.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5 * intensity,
      shadowRadius: 18 * intensity,
      elevation: 8 * intensity,
    };
  }, [settings.glowIntensity, currentTheme.colors.primary]);
}
