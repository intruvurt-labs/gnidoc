// contexts/AppBuilderContext.tsx

import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useMemo, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { orchestrateModels, pickBest } from '@/lib/multi-model';
import Orchestrator from './Orchestrator'; // Ensure file exists: contexts/Orchestrator.tsx

// ───────────────────────── Types ─────────────────────────
export interface GeneratedApp { /* ... unchanged ... */ }
export interface GeneratedFile { /* ... unchanged ... */ }
export interface BuildLog { /* ... unchanged ... */ }
export interface CompilationError { /* ... unchanged ... */ }
export interface ModelConsensus { /* ... unchanged ... */ }
export interface ConsensusAnalysis { /* ... unchanged ... */ }
export interface ConflictItem { /* ... unchanged ... */ }
export interface CachedGeneration { /* ... unchanged ... */ }
export interface SmartModelRecommendation { /* ... unchanged ... */ }
export interface AppGenerationConfig { /* ... unchanged ... */ }

// ───────────────────────── Constants ─────────────────────────
const STORAGE_KEY = 'gnidoc-generated-apps';
const CACHE_KEY = 'gnidoc-generation-cache';
const RECOMMENDATIONS_KEY = 'gnidoc-model-recommendations';
const CURRENT_APP_KEY = 'gnidoc-current-app-id';

// ───────────────────────── Utils ─────────────────────────
const logger = { /* unchanged */ };

function debounceSaver(delayMs = 250) {
  let t: ReturnType<typeof setTimeout> | null = null;
  return async (key: string, valueFactory: () => any) => {
    if (t) clearTimeout(t);
    return new Promise<void>((resolve) => {
      t = setTimeout(async () => {
        try {
          const val = valueFactory();
          await AsyncStorage.setItem(key, JSON.stringify(val));
        } catch (e) {
          logger.error('[AppBuilder] Persist failed:', key, e);
        } finally {
          resolve();
        }
      }, delayMs);
    });
  };
}
const debouncedSet = debounceSaver();

function iso<T extends Record<string, any>>(obj: T) {
  return JSON.parse(JSON.stringify(obj, (_k, v) => v instanceof Date ? v.toISOString() : v));
}

function stripFences(s: string): string { /* unchanged */ }
function extractJSON(s: string): any | null { /* unchanged */ }
function uuid(prefix = ''): string { return `${prefix}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }

// ───────────────────────── Context ─────────────────────────
export const [AppBuilderProvider, useAppBuilder] = createContextHook(() => {
  const [generatedApps, setGeneratedApps] = useState<GeneratedApp[]>([]);
  const [currentApp, setCurrentApp] = useState<GeneratedApp | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [cachedGenerations, setCachedGenerations] = useState<CachedGeneration[]>([]);
  const [currentConsensus, setCurrentConsensus] = useState<ModelConsensus[] | null>(null);
  const [currentAnalysis, setCurrentAnalysis] = useState<ConsensusAnalysis | null>(null);
  const [modelRecommendations, setModelRecommendations] = useState<Map<string, SmartModelRecommendation>>(new Map());

  const loadGeneratedApps = useCallback(async () => {
    try {
      const [stored, cachedData, recsData, lastAppId] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem(CACHE_KEY),
        AsyncStorage.getItem(RECOMMENDATIONS_KEY),
        AsyncStorage.getItem(CURRENT_APP_KEY),
      ]);

      if (stored) {
        const raw = JSON.parse(stored);
        const parsedApps = (Array.isArray(raw) ? raw : []).map((app: any) => ({
          ...app,
          createdAt: new Date(app.createdAt),
          updatedAt: new Date(app.updatedAt),
          buildLogs: (app.buildLogs || []).map((log: any) => ({ ...log, timestamp: new Date(log.timestamp) })),
          files: (app.files || []).map((f: any) => ({ ...f })),
          errors: (app.errors || []).map((e: any) => ({ ...e })),
        }));
        setGeneratedApps(parsedApps);
        if (parsedApps.length) {
          const found = lastAppId ? parsedApps.find(a => a.id === lastAppId) : null;
          setCurrentApp(found || parsedApps[parsedApps.length - 1]);
        }
        logger.info(`[AppBuilder] Loaded ${parsedApps.length} apps`);
      }

      if (cachedData) {
        const rawCache = JSON.parse(cachedData);
        const parsedCache: CachedGeneration[] = (Array.isArray(rawCache) ? rawCache : []).map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp),
          result: {
            ...item.result,
            createdAt: new Date(item.result.createdAt),
            updatedAt: new Date(item.result.updatedAt),
          },
        }));
        setCachedGenerations(parsedCache);
        logger.info(`[AppBuilder] Loaded ${parsedCache.length} cached items`);
      }

      if (recsData) {
        const parsed = JSON.parse(recsData);
        setModelRecommendations(new Map(Object.entries(parsed)));
        logger.info(`[AppBuilder] Loaded ${Object.keys(parsed).length} recommendations`);
      }
    } catch (e) {
      logger.error('[AppBuilder] Failed to load data:', e);
    }
  }, []);

  useEffect(() => {
    loadGeneratedApps();
  }, [loadGeneratedApps]);

  const saveGeneratedApps = useCallback(async (apps: GeneratedApp[]) => {
    try {
      setGeneratedApps(apps);
      await debouncedSet(STORAGE_KEY, () => iso(apps));
      logger.info(`[AppBuilder] Saved ${apps.length} apps`);
    } catch (e) {
      logger.error('[AppBuilder] Persist failed:', e);
    }
  }, []);

  const persistCurrentAppId = useCallback(async (id: string | null) => {
    try {
      if (id) await AsyncStorage.setItem(CURRENT_APP_KEY, id);
      else await AsyncStorage.removeItem(CURRENT_APP_KEY);
    } catch (e) {
      logger.error('[AppBuilder] Persist currentAppId failed:', e);
    }
  }, []);

  const generateApp = useCallback(async (prompt: string, config: AppGenerationConfig): Promise<GeneratedApp> => {
    const wc = prompt.trim().split(/\s+/).filter(Boolean).length;
    if (wc < 3) {
      throw new Error('Enter at least 3 meaningful words.');
    }

    setIsGenerating(true);
    setGenerationProgress(0);

    const appId = `app-${Date.now()}`;
    let app: GeneratedApp = {
      id: appId,
      name: extractAppName(prompt),
      description: prompt,
      prompt,
      platform: 'all',
      status: 'generating',
      progress: 0,
      files: [],
      dependencies: [],
      buildLogs: [],
      errors: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await saveGeneratedApps([...generatedApps, app]);
    setCurrentApp(app);
    await persistCurrentAppId(app.id);

    const pushLog = (level: BuildLog['level'], message: string, phase: BuildLog['phase']) => {
      const log: BuildLog = { id: uuid('log-'), timestamp: new Date(), level, message, phase };
      app = { ...app, buildLogs: [...app.buildLogs, log], updatedAt: new Date() };
      setGeneratedApps(prev => prev.map(a => (a.id === app.id ? app : a)));
    };

    try {
      logger.info(`[AppBuilder] Generating: ${app.name}`);
      pushLog('info', 'Starting generation...', 'generation');
      setGenerationProgress(10);

      const systemPrompt = `...`;  // trimmed for brevity

      pushLog('info', `AI mode: ${config.aiModel}`, 'generation');
      setGenerationProgress(20);

      const modelPlan = (() => {
        switch (config.aiModel) {
          case 'dual-claude-gemini': return ['claude-3-5-sonnet-20240620','gemini-pro'];
          case 'tri-model': return ['gpt-4o-mini','claude-3-5-sonnet-20240620','llama3-70b-8192'];
          case 'quad-model': return ['gpt-4o-mini','gpt-4o','claude-3-5-sonnet-20240620','llama3-70b-8192'];
          case 'orchestrated':
          default: return ['gpt-4o-mini','claude-3-5-sonnet-20240620','llama3-70b-8192'];
        }
      })();

      pushLog('info', `Running ${modelPlan.length} models…`, 'generation');
      setGenerationProgress(30);

      const ranked = await orchestrateModels({
        models: modelPlan,
        prompt: `PROJECT: gnidoc terces\n${prompt}\n\nOutput ONLY the JSON object described.`,
        system: systemPrompt,
        maxParallel: 2,
        timeout: 45000,
        perModelTimeoutMs: { 'llama3-70b-8192':30000 },
      });

      const best = pickBest(ranked);
      if (!best || !best.output) throw new Error('All models failed or returned no output');

      pushLog('info', `Best model: ${best.model}`, 'generation');
      setGenerationProgress(50);

      pushLog('info','Parsing JSON…','generation');
      setGenerationProgress(60);

      let parsed = extractJSON(best.output);
      if (!parsed) {
        const cleaned = stripFences(best.output);
        parsed = extractJSON(cleaned);
      }
      if (!parsed) throw new Error('AI did not return valid JSON');

      if (!Array.isArray(parsed.files) || parsed.files.length === 0) {
        logger.warn('[AppBuilder] AI returned no files', JSON.stringify(parsed).slice(0,500));
        throw new Error('Missing required "files" array');
      }

      pushLog('info', `Files generated: ${parsed.files.length}`, 'generation');
      setGenerationProgress(70);

      const files: GeneratedFile[] = parsed.files.map((file: any, i: number) => ({
        id: uuid('file-'),
        path: String(file.path),
        name: String(file.path).split('/').pop() || `file-${i}`,
        content: String(file.content || ''),
        language: String(file.language || (config.useTypeScript ? 'typescript' : 'javascript')),
        size: String(file.content || '').length,
      }));

      app = { ...app, files, dependencies: Array.isArray(parsed.dependencies) ? parsed.dependencies.map(String) : [], status: 'compiling', progress: 90, updatedAt: new Date() };
      setGeneratedApps(prev => prev.map(a => (a.id === app.id ? app : a)));
      setGenerationProgress(90);
      pushLog('info','Compiling…','compilation');

      const compilationResult = await compileApp(app);
      app = { ...app, errors: compilationResult.errors, status: compilationResult.success ? 'ready' : 'error', progress: 100, updatedAt: new Date() };

      pushLog(compilationResult.success ? 'success' : 'error', compilationResult.success ? `✓ Success with ${app.files.length} files` : `Failed with ${compilationResult.errors.length} issues`, 'compilation');
      setGenerationProgress(100);

      await saveGeneratedApps(prevMerge(generatedApps, app));
      logger.info(`[AppBuilder] Generation complete: ${app.name}`);
      return app;

    } catch (err) {
      logger.error('[AppBuilder] Generation failed:', err);
      app = { ...app, status: 'error', updatedAt: new Date(), buildLogs: [...app.buildLogs, { id: uuid('log-'), timestamp: new Date(), level:'error', message:`Generation failed: ${err instanceof Error? err.message : 'Unknown error'}`, phase:'generation' }] };
      await saveGeneratedApps(prevMerge(generatedApps, app));
      throw err;
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
      setCurrentApp(app);
      await persistCurrentAppId(app.id);
    }
  }, [generatedApps, saveGeneratedApps, persistCurrentAppId]);

  const deleteApp = useCallback(async (appId: string) => {
    const updated = generatedApps.filter(a => a.id !== appId);
    await saveGeneratedApps(updated);
    if (currentApp?.id === appId) {
      const newCurrent = updated[updated.length-1] || null;
      setCurrentApp(newCurrent);
      await persistCurrentAppId(newCurrent?.id || null);
    }
    logger.info(`[AppBuilder] Deleted app: ${appId}`);
  }, [generatedApps, currentApp, saveGeneratedApps, persistCurrentAppId]);

  const updateApp = useCallback(async (appId: string, updates: Partial<GeneratedApp>) => {
    const updated = generatedApps.map(a => a.id === appId ? { ...a, ...updates, updatedAt: new Date() } : a);
    await saveGeneratedApps(updated);
    if (currentApp?.id === appId) {
      const newApp = updated.find(a => a.id === appId) || null;
      setCurrentApp(newApp);
      await persistCurrentAppId(newApp?.id || null);
    }
    logger.info(`[AppBuilder] Updated app: ${appId}`);
  }, [generatedApps, currentApp, saveGeneratedApps, persistCurrentAppId]);

  // ... (rest of your consensus and cache logic unchanged) ...

  return useMemo(() => ({
    generatedApps,
    currentApp,
    isGenerating,
    generationProgress,
    cachedGenerations,
    currentConsensus,
    currentAnalysis,
    loadGeneratedApps,
    generateApp,
    deleteApp,
    updateApp,
    setCurrentApp: async (app: GeneratedApp | null) => { setCurrentApp(app); await persistCurrentAppId(app?.id || null); },
    runConsensusMode,
    getSmartModelRecommendation,
    getCachedGeneration,
    replayGeneration,
  }), [
    generatedApps,
    currentApp,
    isGenerating,
    generationProgress,
    cachedGenerations,
    currentConsensus,
    currentAnalysis,
    loadGeneratedApps,
    generateApp,
    deleteApp,
    updateApp,
    runConsensusMode,
    getSmartModelRecommendation,
    getCachedGeneration,
    replayGeneration,
    persistCurrentAppId
  ]);
});

// ───────────────────────── Helpers ─────────────────────────
function extractAppName(prompt: string): string { /* unchanged */ }
function calculateConfidence(response: string): number { /* unchanged */ }
function detectTaskType(description: string): SmartModelRecommendation['taskType'] { /* unchanged */ }
function prevMerge(list: GeneratedApp[], updated: GeneratedApp): GeneratedApp[] { /* unchanged */ }
async function compileApp(app: GeneratedApp): Promise<{ success: boolean; errors: CompilationError[] }> { /* unchanged */ }
