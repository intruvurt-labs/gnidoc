// PreferencesContext.tsx
import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';

/** ───────────────────────── Types (yours) ───────────────────────── **/
export type PersonaType = 'pragmatic' | 'ux-purist' | 'security-auditor' | 'creative-artist';
export type DisciplineType = 'strict-typescript' | 'fast-js' | 'secure-rust' | 'cross-platform-flutter';

export interface BuilderPreferences {
  persona: PersonaType;
  discipline: DisciplineType;
  speedVsAccuracy: number;         // 0..100
  enablePromptMemory: boolean;
  enableContextReplay: boolean;
  autoSaveInterval: number;        // seconds
  maxContextHistory: number;       // max items kept
}

export interface SavedContext {
  id: string;
  title: string;
  prompt: string;
  reasoning: string[];
  models: string[];
  timestamp: Date;
  version: number;
  tags?: string[];
  pinned?: boolean;
}

/** ───────────────────────── Constants ───────────────────────── **/
const STORAGE_KEY = 'user-preferences';
const CONTEXTS_KEY = 'saved-contexts';
const SAVE_DEBOUNCE_MS = 150;

const DEFAULT_PREFERENCES: BuilderPreferences = {
  persona: 'pragmatic',
  discipline: 'strict-typescript',
  speedVsAccuracy: 50,
  enablePromptMemory: true,
  enableContextReplay: true,
  autoSaveInterval: 30,
  maxContextHistory: 100,
};

/** ───────────────────────── Schemas & Migration ───────────────────────── **/
const PreferencesSchema = z.object({
  persona: z.enum(['pragmatic', 'ux-purist', 'security-auditor', 'creative-artist']),
  discipline: z.enum(['strict-typescript', 'fast-js', 'secure-rust', 'cross-platform-flutter']),
  speedVsAccuracy: z.number().min(0).max(100),
  enablePromptMemory: z.boolean(),
  enableContextReplay: z.boolean(),
  autoSaveInterval: z.number().min(5).max(600),
  maxContextHistory: z.number().min(1).max(1000),
});

const SavedContextSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  prompt: z.string().min(1),
  reasoning: z.array(z.string()).default([]),
  models: z.array(z.string()).default([]),
  timestamp: z.preprocess((v) => new Date(v as any), z.date()),
  version: z.number().min(1).default(1),
  tags: z.array(z.string()).optional(),
  pinned: z.boolean().optional(),
});

function migratePreferences(raw: any): BuilderPreferences {
  const candidate = {
    ...DEFAULT_PREFERENCES,
    ...(raw ?? {}),
    // clamp/bounds
    speedVsAccuracy: clampNumber(raw?.speedVsAccuracy, 0, 100, DEFAULT_PREFERENCES.speedVsAccuracy),
    autoSaveInterval: clampNumber(raw?.autoSaveInterval, 5, 600, DEFAULT_PREFERENCES.autoSaveInterval),
    maxContextHistory: clampNumber(raw?.maxContextHistory, 1, 1000, DEFAULT_PREFERENCES.maxContextHistory),
  };
  const parsed = PreferencesSchema.safeParse(candidate);
  return parsed.success ? parsed.data : DEFAULT_PREFERENCES;
}

function migrateContexts(rawArr: any[]): SavedContext[] {
  if (!Array.isArray(rawArr)) return [];
  return rawArr
    .map((r) => {
      const base = {
        ...r,
        reasoning: Array.isArray(r?.reasoning) ? r.reasoning : [],
        models: Array.isArray(r?.models) ? r.models : [],
        version: r?.version ?? 1,
        tags: Array.isArray(r?.tags) ? r.tags : [],
        pinned: !!r?.pinned,
      };
      const parsed = SavedContextSchema.safeParse(base);
      if (!parsed.success) return null;
      return parsed.data;
    })
    .filter(Boolean) as SavedContext[];
}

/** ───────────────────────── Utils ───────────────────────── **/
const log = {
  info: (...a: any[]) => { if (typeof __DEV__ === 'undefined' || __DEV__) console.log('[Preferences]', ...a); },
  warn: (...a: any[]) => { if (typeof __DEV__ === 'undefined' || __DEV__) console.warn('[Preferences]', ...a); },
  error: (...a: any[]) => console.error('[Preferences]', ...a),
};

function clampNumber(v: any, min: number, max: number, fallback: number) {
  const n = Number(v);
  if (Number.isFinite(n)) return Math.max(min, Math.min(max, n));
  return fallback;
}

function debounce<T extends (...args: any[]) => void>(fn: T, ms = 200) {
  let t: any;
  return (...args: Parameters<T>) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

const generateId = (p = 'ctx') => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function normalizeTags(tags?: string[]) {
  return (tags || [])
    .map((t) => t.trim().toLowerCase())
    .filter((t, i, arr) => t && arr.indexOf(t) === i);
}

/** ───────────────────────── Hook ───────────────────────── **/
export const [PreferencesProvider, usePreferences] = createContextHook(() => {
  const [preferences, setPreferences] = useState<BuilderPreferences>(DEFAULT_PREFERENCES);
  const [savedContexts, setSavedContexts] = useState<SavedContext[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // In-memory fallback if AsyncStorage writes fail (rare)
  const memoryBackup = useRef<{ prefs: BuilderPreferences; contexts: SavedContext[] }>({
    prefs: DEFAULT_PREFERENCES,
    contexts: [],
  });

  /** Debounced persistence **/
  const persistPrefs = useMemo(
    () =>
      debounce(async (p: BuilderPreferences) => {
        try {
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(p));
          memoryBackup.current.prefs = p;
        } catch (e) {
          log.error('Persist preferences failed; keeping in-memory fallback.', e);
          memoryBackup.current.prefs = p;
        }
      }, SAVE_DEBOUNCE_MS),
    []
  );

  const persistContexts = useMemo(
    () =>
      debounce(async (list: SavedContext[]) => {
        try {
          const serializable = list.map((c) => ({ ...c, timestamp: c.timestamp.toISOString() }));
        await AsyncStorage.setItem(CONTEXTS_KEY, JSON.stringify(serializable));
          memoryBackup.current.contexts = list;
        } catch (e) {
          log.error('Persist contexts failed; keeping in-memory fallback.', e);
          memoryBackup.current.contexts = list;
        }
      }, SAVE_DEBOUNCE_MS),
    []
  );

  /** Load **/
  const loadPreferences = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = migratePreferences(JSON.parse(raw));
        setPreferences(parsed);
        memoryBackup.current.prefs = parsed;
        log.info('Loaded preferences:', parsed);
      } else {
        // write defaults on first run (helps future migrations)
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PREFERENCES));
      }
    } catch (error) {
      log.error('Failed to load preferences:', error);
      // fall back to memory backup
      setPreferences(memoryBackup.current.prefs);
    }
  }, []);

  const loadContexts = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(CONTEXTS_KEY);
      if (raw) {
        const parsed = migrateContexts(JSON.parse(raw));
        setSavedContexts(parsed);
        memoryBackup.current.contexts = parsed;
        log.info(`Loaded ${parsed.length} saved contexts`);
      }
    } catch (error) {
      log.error('Failed to load contexts:', error);
      setSavedContexts(memoryBackup.current.contexts);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      await Promise.all([loadPreferences(), loadContexts()]);
      setIsLoading(false);
    })();
  }, [loadPreferences, loadContexts]);

  /** Updates **/
  const updatePreferences = useCallback(
    async (updates: Partial<BuilderPreferences>) => {
      const next: BuilderPreferences = migratePreferences({ ...preferences, ...updates });
      setPreferences(next);
      persistPrefs(next);
      log.info('Updated preferences:', updates);
    },
    [preferences, persistPrefs]
  );

  const resetPreferences = useCallback(async () => {
    setPreferences(DEFAULT_PREFERENCES);
    persistPrefs(DEFAULT_PREFERENCES);
    log.info('Reset to defaults');
  }, [persistPrefs]);

  /** Contexts CRUD & helpers **/
  const saveContext = useCallback(
    async (context: Omit<SavedContext, 'id' | 'timestamp' | 'version'>) => {
      const newContext: SavedContext = {
        ...context,
        id: generateId('ctx'),
        timestamp: new Date(),
        version: 1,
        tags: normalizeTags(context.tags),
        pinned: !!context.pinned,
      };
      // enforce cap
      const capped = [newContext, ...savedContexts].slice(0, preferences.maxContextHistory);
      setSavedContexts(capped);
      persistContexts(capped);
      log.info('Saved context:', newContext.title);
      return newContext;
    },
    [savedContexts, preferences.maxContextHistory, persistContexts]
  );

  const loadContext = useCallback(
    (contextId: string): SavedContext | undefined => {
      const ctx = savedContexts.find((c) => c.id === contextId);
      if (ctx) log.info('Loaded context:', ctx.title);
      return ctx;
    },
    [savedContexts]
  );

  const deleteContext = useCallback(
    async (contextId: string) => {
      const updated = savedContexts.filter((c) => c.id !== contextId);
      setSavedContexts(updated);
      persistContexts(updated);
      log.info('Deleted context:', contextId);
    },
    [savedContexts, persistContexts]
  );

  // New: edit/duplicate/toggle pin/add tags/search/export/import
  const editContext = useCallback(
    async (contextId: string, updates: Partial<SavedContext>) => {
      const updated = savedContexts.map((c) =>
        c.id === contextId
          ? {
              ...c,
              ...updates,
              tags: updates.tags ? normalizeTags(updates.tags) : c.tags,
              version: (c.version || 1) + 1,
              timestamp: updates.timestamp ? updates.timestamp : c.timestamp, // keep original unless explicitly changed
            }
          : c
      );
      setSavedContexts(updated);
      persistContexts(updated);
    },
    [savedContexts, persistContexts]
  );

  const duplicateContext = useCallback(
    async (contextId: string) => {
      const src = savedContexts.find((c) => c.id === contextId);
      if (!src) return;
      const dupe: SavedContext = {
        ...src,
        id: generateId('ctx'),
        title: `${src.title} (copy)`,
        timestamp: new Date(),
        version: 1,
      };
      const capped = [dupe, ...savedContexts].slice(0, preferences.maxContextHistory);
      setSavedContexts(capped);
      persistContexts(capped);
      return dupe;
    },
    [savedContexts, preferences.maxContextHistory, persistContexts]
  );

  const togglePin = useCallback(
    async (contextId: string) => {
      const updated = savedContexts.map((c) => (c.id === contextId ? { ...c, pinned: !c.pinned } : c));
      setSavedContexts(updated);
      persistContexts(updated);
    },
    [savedContexts, persistContexts]
  );

  const addTags = useCallback(
    async (contextId: string, tags: string[]) => {
      const norm = normalizeTags(tags);
      const updated = savedContexts.map((c) =>
        c.id === contextId ? { ...c, tags: normalizeTags([...(c.tags || []), ...norm]) } : c
      );
      setSavedContexts(updated);
      persistContexts(updated);
    },
    [savedContexts, persistContexts]
  );

  const searchContexts = useCallback(
    (query: string, tags?: string[]) => {
      const q = query.trim().toLowerCase();
      const tset = new Set(normalizeTags(tags));
      return savedContexts
        .filter((c) => {
          const textHit =
            !q ||
            c.title.toLowerCase().includes(q) ||
            c.prompt.toLowerCase().includes(q) ||
            c.reasoning.join(' ').toLowerCase().includes(q) ||
            c.models.join(' ').toLowerCase().includes(q);
          const tagHit = !tset.size || (c.tags || []).some((t) => tset.has(t));
          return textHit && tagHit;
        })
        .sort((a, b) => {
          // pinned first, then recent
          if (!!b.pinned - !!a.pinned !== 0) return Number(b.pinned) - Number(a.pinned);
          return b.timestamp.getTime() - a.timestamp.getTime();
        });
    },
    [savedContexts]
  );

  const exportContexts = useCallback(() => {
    const payload = savedContexts.map((c) => ({ ...c, timestamp: c.timestamp.toISOString() }));
    return JSON.stringify({ version: 1, items: payload }, null, 2);
  }, [savedContexts]);

  const importContexts = useCallback(
    async (json: string, merge = true) => {
      try {
        const data = JSON.parse(json);
        const items = migrateContexts(data?.items || data || []);
        const combined = merge ? [...items, ...savedContexts] : items;
        // de-duplicate by id; keep newest timestamp
        const byId = new Map<string, SavedContext>();
        [...combined]
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .forEach((c) => { if (!byId.has(c.id)) byId.set(c.id, c); });
        const final = Array.from(byId.values()).slice(0, preferences.maxContextHistory);
        setSavedContexts(final);
        persistContexts(final);
        return final.length;
      } catch (e) {
        log.error('Import contexts failed:', e);
        throw new Error('Invalid import file');
      }
    },
    [savedContexts, preferences.maxContextHistory, persistContexts]
  );

  /** Persona/Discipline/SVA system prompts (kept from your design) **/
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
    const speed = clampNumber(preferences.speedVsAccuracy, 0, 100, 50);
    if (speed <= 25) return 'Prioritize speed and rapid prototyping. Generate working code quickly, optimization can come later.';
    if (speed <= 50) return 'Balance speed and quality. Generate functional code with reasonable optimization.';
    if (speed <= 75) return 'Focus on code quality and optimization. Take time to ensure best practices and performance.';
    return 'Maximize code quality, optimization, and deep analysis. Generate production-ready, highly optimized code.';
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

  /** Derived helpers **/
  const pinnedContexts = useMemo(() => savedContexts.filter((c) => c.pinned).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()), [savedContexts]);
  const recentContexts = useMemo(() => [...savedContexts].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 10), [savedContexts]);

  /** Public API (existing + new) **/
  return useMemo(() => ({
    // state
    preferences,
    savedContexts,
    isLoading,

    // existing API
    updatePreferences,
    resetPreferences,
    saveContext,
    loadContext,
    deleteContext,
    getPersonaSystemPrompt,
    getDisciplineSystemPrompt,
    getSpeedVsAccuracyPrompt,
    getFullSystemPrompt,

    // new helpers (non-breaking additions)
    editContext,
    duplicateContext,
    togglePin,
    addTags,
    searchContexts,
    exportContexts,
    importContexts,
    pinnedContexts,
    recentContexts,
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
    editContext,
    duplicateContext,
    togglePin,
    addTags,
    searchContexts,
    exportContexts,
    importContexts,
    pinnedContexts,
    recentContexts,
  ]);
});
