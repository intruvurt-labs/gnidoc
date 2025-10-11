import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type PersonaType = 'pragmatic' | 'ux-purist' | 'security-auditor' | 'creative-artist';
export type DisciplineType = 'strict-typescript' | 'fast-js' | 'secure-rust' | 'cross-platform-flutter';

export interface BuilderPreferences {
  persona: PersonaType;
  discipline: DisciplineType;
  speedVsAccuracy: number;
  enablePromptMemory: boolean;
  enableContextReplay: boolean;
  autoSaveInterval: number;
  maxContextHistory: number;
}

export interface SavedContext {
  id: string;
  title: string;
  prompt: string;
  reasoning: string[];
  models: string[];
  timestamp: Date;
  version: number;
}

const STORAGE_KEY = 'user-preferences';
const CONTEXTS_KEY = 'saved-contexts';

const DEFAULT_PREFERENCES: BuilderPreferences = {
  persona: 'pragmatic',
  discipline: 'strict-typescript',
  speedVsAccuracy: 50,
  enablePromptMemory: true,
  enableContextReplay: true,
  autoSaveInterval: 30,
  maxContextHistory: 100,
};

export const [PreferencesProvider, usePreferences] = createContextHook(() => {
  const [preferences, setPreferences] = useState<BuilderPreferences>(DEFAULT_PREFERENCES);
  const [savedContexts, setSavedContexts] = useState<SavedContext[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadPreferences = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPreferences(parsed);
        console.log('[Preferences] Loaded preferences:', parsed);
      }
    } catch (error) {
      console.error('[Preferences] Failed to load preferences:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadContexts = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(CONTEXTS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored).map((ctx: any) => ({
          ...ctx,
          timestamp: new Date(ctx.timestamp),
        }));
        setSavedContexts(parsed);
        console.log(`[Preferences] Loaded ${parsed.length} saved contexts`);
      }
    } catch (error) {
      console.error('[Preferences] Failed to load contexts:', error);
    }
  }, []);

  useEffect(() => {
    loadPreferences();
    loadContexts();
  }, [loadPreferences, loadContexts]);

  const updatePreferences = useCallback(async (updates: Partial<BuilderPreferences>) => {
    try {
      const updated = { ...preferences, ...updates };
      setPreferences(updated);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      console.log('[Preferences] Updated preferences:', updates);
    } catch (error) {
      console.error('[Preferences] Failed to update preferences:', error);
    }
  }, [preferences]);

  const resetPreferences = useCallback(async () => {
    try {
      setPreferences(DEFAULT_PREFERENCES);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PREFERENCES));
      console.log('[Preferences] Reset to defaults');
    } catch (error) {
      console.error('[Preferences] Failed to reset preferences:', error);
    }
  }, []);

  const saveContext = useCallback(async (context: Omit<SavedContext, 'id' | 'timestamp' | 'version'>) => {
    try {
      const newContext: SavedContext = {
        ...context,
        id: `ctx-${Date.now()}`,
        timestamp: new Date(),
        version: 1,
      };

      const updated = [newContext, ...savedContexts].slice(0, preferences.maxContextHistory);
      setSavedContexts(updated);
      await AsyncStorage.setItem(CONTEXTS_KEY, JSON.stringify(updated));
      console.log('[Preferences] Saved context:', newContext.title);
      
      return newContext;
    } catch (error) {
      console.error('[Preferences] Failed to save context:', error);
      throw error;
    }
  }, [savedContexts, preferences.maxContextHistory]);

  const loadContext = useCallback((contextId: string): SavedContext | undefined => {
    const context = savedContexts.find(ctx => ctx.id === contextId);
    if (context) {
      console.log('[Preferences] Loaded context:', context.title);
    }
    return context;
  }, [savedContexts]);

  const deleteContext = useCallback(async (contextId: string) => {
    try {
      const updated = savedContexts.filter(ctx => ctx.id !== contextId);
      setSavedContexts(updated);
      await AsyncStorage.setItem(CONTEXTS_KEY, JSON.stringify(updated));
      console.log('[Preferences] Deleted context:', contextId);
    } catch (error) {
      console.error('[Preferences] Failed to delete context:', error);
    }
  }, [savedContexts]);

  const getPersonaSystemPrompt = useCallback((): string => {
    switch (preferences.persona) {
      case 'pragmatic':
        return 'You are a pragmatic coder who focuses on practical, working solutions with clean, maintainable code. Prioritize functionality and code quality over perfection.';
      
      case 'ux-purist':
        return 'You are a UX purist who prioritizes user experience and beautiful interfaces. Focus on intuitive design, smooth animations, and delightful interactions.';
      
      case 'security-auditor':
        return 'You are a security auditor who emphasizes security, validation, and best practices. Always consider potential vulnerabilities and implement proper error handling.';
      
      case 'creative-artist':
        return 'You are a creative artist who brings innovative designs and cutting-edge features. Think outside the box and create unique, memorable experiences.';
      
      default:
        return 'You are an expert AI assistant helping build high-quality applications.';
    }
  }, [preferences.persona]);

  const getDisciplineSystemPrompt = useCallback((): string => {
    switch (preferences.discipline) {
      case 'strict-typescript':
        return 'Use strict TypeScript with comprehensive type definitions, interfaces, and proper type safety. Avoid any types and ensure full type coverage.';
      
      case 'fast-js':
        return 'Use JavaScript with flexible typing for rapid prototyping. Focus on speed and iteration over strict type safety.';
      
      case 'secure-rust':
        return 'Write memory-safe, high-performance code with Rust principles. Focus on zero-cost abstractions and compile-time guarantees.';
      
      case 'cross-platform-flutter':
        return 'Build beautiful native apps using Flutter and Dart. Ensure consistent experience across iOS, Android, and web platforms.';
      
      default:
        return 'Follow best practices for the chosen technology stack.';
    }
  }, [preferences.discipline]);

  const getSpeedVsAccuracyPrompt = useCallback((): string => {
    const speed = preferences.speedVsAccuracy;
    
    if (speed <= 25) {
      return 'Prioritize speed and rapid prototyping. Generate working code quickly, optimization can come later.';
    } else if (speed <= 50) {
      return 'Balance speed and quality. Generate functional code with reasonable optimization.';
    } else if (speed <= 75) {
      return 'Focus on code quality and optimization. Take time to ensure best practices and performance.';
    } else {
      return 'Maximize code quality, optimization, and deep analysis. Generate production-ready, highly optimized code.';
    }
  }, [preferences.speedVsAccuracy]);

  const getFullSystemPrompt = useCallback((): string => {
    return `${getPersonaSystemPrompt()}

${getDisciplineSystemPrompt()}

${getSpeedVsAccuracyPrompt()}

CRITICAL REQUIREMENTS:
- Follow React Native and Expo best practices
- Ensure web compatibility
- Use StyleSheet for styling
- Include proper error handling
- Add comprehensive logging for debugging
- Follow the cyan (#00FFFF), lime (#CCFF00), and yellow-lime (#BFFF00) color scheme with black outlines`;
  }, [getPersonaSystemPrompt, getDisciplineSystemPrompt, getSpeedVsAccuracyPrompt]);

  return useMemo(() => ({
    preferences,
    savedContexts,
    isLoading,
    updatePreferences,
    resetPreferences,
    saveContext,
    loadContext,
    deleteContext,
    getPersonaSystemPrompt,
    getDisciplineSystemPrompt,
    getSpeedVsAccuracyPrompt,
    getFullSystemPrompt,
  }), [
    preferences,
    savedContexts,
    isLoading,
    updatePreferences,
    resetPreferences,
    saveContext,
    loadContext,
    deleteContext,
    getPersonaSystemPrompt,
    getDisciplineSystemPrompt,
    getSpeedVsAccuracyPrompt,
    getFullSystemPrompt,
  ]);
});
