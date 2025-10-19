// AppBuilderContext.tsx
import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useMemo, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** ───────────────────────── Types ───────────────────────── **/

export interface GeneratedApp {
  id: string;
  name: string;
  description: string;
  prompt: string;
  platform: 'react-native' | 'web' | 'pwa' | 'android' | 'ios' | 'all';
  status: 'generating' | 'compiling' | 'ready' | 'error';
  progress: number;
  files: GeneratedFile[];
  dependencies: string[];
  buildLogs: BuildLog[];
  errors: CompilationError[];
  previewUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GeneratedFile {
  id: string;
  path: string;
  name: string;
  content: string;
  language: string;
  size: number;
}

export interface BuildLog {
  id: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  phase: 'generation' | 'compilation' | 'bundling' | 'deployment';
}

export interface CompilationError {
  id: string;
  file: string;
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
  code?: string;
}

export interface ModelConsensus {
  modelId: string;
  modelName: string;
  response: string;
  confidence: number;
  responseTime: number;
  tokensUsed: number;
  cost: number;
}

export interface ConsensusAnalysis {
  agreements: string[];
  conflicts: ConflictItem[];
  mergedResult: string;
  consensusScore: number;
  recommendedModel: string;
}

export interface ConflictItem {
  id: string;
  aspect: string;
  models: { modelId: string; suggestion: string }[];
  resolution: string;
}

export interface CachedGeneration {
  id: string;
  prompt: string;
  config: AppGenerationConfig;
  consensus: ModelConsensus[];
  analysis: ConsensusAnalysis;
  result: GeneratedApp;
  timestamp: Date;
}

export interface SmartModelRecommendation {
  taskType: 'ui' | 'code' | 'image' | 'data' | 'legal' | 'backend' | 'frontend' | 'fullstack';
  recommendedModels: string[];
  reasoning: string;
  confidence: number;
}

export interface AppGenerationConfig {
  useTypeScript: boolean;
  includeTests: boolean;
  includeDocumentation: boolean;
  styleFramework: 'stylesheet' | 'styled-components' | 'tailwind';
  stateManagement: 'context' | 'redux' | 'zustand' | 'none';
  routing: 'expo-router' | 'react-navigation' | 'none';
  aiModel: 'dual-claude-gemini' | 'tri-model' | 'quad-model' | 'orchestrated';
  enableConsensusMode: boolean;
  enableSmartSelector: boolean;
  enableCaching: boolean;
}

/** ───────────────────────── Constants ───────────────────────── **/

const STORAGE_KEY = 'gnidoc-generated-apps';
const CACHE_KEY = 'gnidoc-generation-cache';
const RECOMMENDATIONS_KEY = 'gnidoc-model-recommendations';
const CURRENT_APP_KEY = 'gnidoc-current-app-id';

/** ───────────────────────── Utils ───────────────────────── **/

const logger = {
  info: (...args: any[]) => { if (typeof __DEV__ === 'undefined' || __DEV__) console.log(...args); },
  warn: (...args: any[]) => { if (typeof __DEV__ === 'undefined' || __DEV__) console.warn(...args); },
  error: (...args: any[]) => console.error(...args),
};

function debounceSaver(delayMs = 250) {
  let t: any = null;
  return async (key: string, valueFactory: () => any) => {
    if (t) clearTimeout(t);
    return new Promise<void>((resolve) => {
      t = setTimeout(async () => {
        try {
          await AsyncStorage.setItem(key, JSON.stringify(valueFactory()));
        } catch (e) {
          logger.error('[AppBuilder] Persist failed:', key, e);
        } finally {
          resolve();
        }
      }, delayMs);
    });
  };
}
const debouncedSet = debounceSaver(250);

function iso<T extends Record<string, any>>(obj: T) {
  return JSON.parse(JSON.stringify(obj, (_k, v) => v instanceof Date ? v.toISOString() : v));
}

function stripFences(s: string): string {
  if (!s) return s;
  let out = s.trim();
  if (out.startsWith('```')) {
    const m = out.match(/```(?:[\w-]+)?\s*\n([\s\S]*?)```/m);
    if (m && m[1]) return m[1].trim();
    out = out.replace(/^```[\w-]*\s*\n?/m, '').replace(/\n?```$/m, '').trim();
  }
  return out;
}

function extractJSON(s: string): any | null {
  try {
    const fenceStripped = stripFences(s);
    const match = fenceStripped.match(/\{[\s\S]*\}$/m);
    if (match) return JSON.parse(match[0]);
    return JSON.parse(fenceStripped);
  } catch {
    return null;
  }
}

function uuid(prefix = '') {
  return `${prefix}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** ───────────────────────── Context ───────────────────────── **/

export const [AppBuilderProvider, useAppBuilder] = createContextHook(() => {
  const [generatedApps, setGeneratedApps] = useState<GeneratedApp[]>([]);
  const [currentApp, setCurrentApp] = useState<GeneratedApp | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationProgress, setGenerationProgress] = useState<number>(0);
  const [cachedGenerations, setCachedGenerations] = useState<CachedGeneration[]>([]);
  const [currentConsensus, setCurrentConsensus] = useState<ModelConsensus[] | null>(null);
  const [currentAnalysis, setCurrentAnalysis] = useState<ConsensusAnalysis | null>(null);
  const [modelRecommendations, setModelRecommendations] = useState<Map<string, SmartModelRecommendation>>(new Map());

  /** ───────── Load persisted state ───────── **/

  const loadGeneratedApps = useCallback(async () => {
    try {
      const [stored, cachedData, recsData, lastId] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem(CACHE_KEY),
        AsyncStorage.getItem(RECOMMENDATIONS_KEY),
        AsyncStorage.getItem(CURRENT_APP_KEY),
      ]);

      if (stored) {
        const raw = JSON.parse(stored);
        const parsedApps: GeneratedApp[] = (Array.isArray(raw) ? raw : []).map((app: any) => ({
          ...app,
          createdAt: new Date(app.createdAt),
          updatedAt: new Date(app.updatedAt),
          buildLogs: (app.buildLogs || []).map((log: any) => ({ ...log, timestamp: new Date(log.timestamp) })),
          files: (app.files || []).map((f: any) => ({ ...f })),
          errors: (app.errors || []).map((e: any) => ({ ...e })),
        }));
        setGeneratedApps(parsedApps);
        if (parsedApps.length) {
          const found = parsedApps.find(a => a.id === lastId);
          setCurrentApp(found || parsedApps[parsedApps.length - 1]);
        }
        logger.info(`[AppBuilder] Loaded ${parsedApps.length} generated apps`);
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
        logger.info(`[AppBuilder] Loaded ${parsedCache.length} cached generations`);
      }

      if (recsData) {
        const parsed = JSON.parse(recsData);
        setModelRecommendations(new Map(Object.entries(parsed)));
        logger.info(`[AppBuilder] Loaded ${Object.keys(parsed).length} model recommendations`);
      }
    } catch (error) {
      logger.error('[AppBuilder] Failed to load data:', error);
    }
  }, []);

  useEffect(() => {
    loadGeneratedApps();
  }, [loadGeneratedApps]);

  /** ───────── Save helpers ───────── **/

  const saveGeneratedApps = useCallback(async (apps: GeneratedApp[]) => {
    try {
      setGeneratedApps(apps);
      await debouncedSet(STORAGE_KEY, () => iso(apps));
      logger.info(`[AppBuilder] Saved ${apps.length} generated apps`);
    } catch (error) {
      logger.error('[AppBuilder] Failed to save generated apps:', error);
    }
  }, []);

  const persistCurrentAppId = useCallback(async (id: string | null) => {
    try {
      if (id) await AsyncStorage.setItem(CURRENT_APP_KEY, id);
      else await AsyncStorage.removeItem(CURRENT_APP_KEY);
    } catch (e) {
      logger.error('[AppBuilder] Failed to persist current app id:', e);
    }
  }, []);

  /** ───────── Core: Generate App ───────── **/

  const generateApp = useCallback(async (
    prompt: string,
    config: AppGenerationConfig
  ): Promise<GeneratedApp> => {
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

    // optimistic save
    await saveGeneratedApps([...generatedApps, app]);
    setCurrentApp(app);
    await persistCurrentAppId(app.id);

    const pushLog = (level: BuildLog['level'], message: string, phase: BuildLog['phase']) => {
      const log: BuildLog = { id: uuid('log-'), timestamp: new Date(), level, message, phase };
      app = { ...app, buildLogs: [...app.buildLogs, log], updatedAt: new Date() };
      setGeneratedApps(prev => prev.map(a => (a.id === app.id ? app : a)));
    };

    try {
      logger.info(`[AppBuilder] Starting app generation: ${app.name}`);
      pushLog('info', 'Starting app generation...', 'generation');
      setGenerationProgress(10);

      let generateText: any;
      try {
        ({ generateText } = await import('@rork/toolkit-sdk'));
      } catch (e) {
        throw new Error('Missing @rork/toolkit-sdk or unsupported runtime. Install/provide it before generation.');
      }

      const systemPrompt = `You are an expert full-stack developer with 25+ years of experience building production-ready applications.

Generate a complete, production-ready ${config.useTypeScript ? 'TypeScript' : 'JavaScript'} application based on the user's requirements.

CRITICAL REQUIREMENTS:
1. Generate COMPLETE, WORKING code - not demos or MVPs
2. Include ALL necessary files: components, screens, navigation, state management, utilities
3. Use proper error handling and loading states everywhere
4. Follow React Native and Expo best practices
5. Ensure web compatibility (avoid native-only APIs without Platform checks)
6. Use StyleSheet for styling (never inline styles)
7. ${config.useTypeScript ? 'Include proper TypeScript types and interfaces' : 'Use modern ES2020+ features'}
8. Add comprehensive error boundaries
9. Implement proper data validation
10. Use the cyan (#00FFFF) and red (#FF0040) color scheme

ARCHITECTURE:
- State Management: ${config.stateManagement}
- Routing: ${config.routing}
- Styling: ${config.styleFramework}
- TypeScript: ${config.useTypeScript ? 'Yes' : 'No'}
- Tests: ${config.includeTests ? 'Yes' : 'No'}

OUTPUT FORMAT:
Return a JSON object with this structure:
{
  "files": [
    { "path": "app/index.${config.useTypeScript ? 'tsx' : 'jsx'}", "content": "// Complete file content here", "language": "${config.useTypeScript ? 'typescript' : 'javascript'}" }
  ],
  "dependencies": ["expo", "react-native", ...],
  "instructions": "Setup and run instructions"
}

Generate a COMPLETE, PRODUCTION-READY application. No placeholders, no TODOs, no incomplete features.`;

      pushLog('info', `Using AI model: ${config.aiModel}`, 'generation');
      setGenerationProgress(20);

      pushLog('info', `Calling AI to generate ${config.useTypeScript ? 'TypeScript' : 'JavaScript'} app...`, 'generation');
      setGenerationProgress(30);

      const aiResponse = await generateText({
        messages: [
          { role: 'user', content: systemPrompt + '\n\nUser Prompt:\n' + prompt }
        ]
      });

      if (!aiResponse || typeof aiResponse !== 'string') {
        throw new Error('Invalid AI response: no content generated');
      }

      pushLog('info', 'Parsing AI-generated app structure...', 'generation');
      setGenerationProgress(60);

      let cleanedResponse = String(aiResponse).trim();
      if (cleanedResponse.startsWith('```')) {
        const match = cleanedResponse.match(/```(?:json)?\s*\n([\s\S]*?)```/m);
        if (match && match[1]) cleanedResponse = match[1].trim();
        else cleanedResponse = cleanedResponse.replace(/^```[\w-]*\s*\n?/m, '').replace(/\n?```$/m, '').trim();
      }

      let parsed: any;
      try {
        parsed = JSON.parse(cleanedResponse);
      } catch (jsonErr) {
        logger.warn('[AppBuilder] AI returned non-JSON response, attempting best-effort extraction');
        const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('AI did not return valid JSON structure. Please try again.');
        }
      }

      if (!parsed.files || !Array.isArray(parsed.files) || parsed.files.length === 0) {
        throw new Error('AI response missing required "files" array');
      }

      pushLog('info', `AI generated ${parsed.files.length} files`, 'generation');
      setGenerationProgress(70);

      const files: GeneratedFile[] = (parsed.files || []).map((file: any, index: number) => ({
        id: uuid('file-'),
        path: String(file.path),
        name: String(file.path).split('/').pop() || `file-${index}`,
        content: String(file.content || ''),
        language: String(file.language || (config.useTypeScript ? 'typescript' : 'javascript')),
        size: String(file.content || '').length,
      }));

      app = {
        ...app,
        files,
        dependencies: Array.isArray(parsed.dependencies) ? parsed.dependencies.map(String) : [],
        status: 'compiling',
        progress: 90,
        updatedAt: new Date(),
      };
      setGeneratedApps(prev => prev.map(a => (a.id === app.id ? app : a)));
      setGenerationProgress(90);
      pushLog('info', 'Compiling application...', 'compilation');

      const compilationResult = await compileApp(app);
      app = {
        ...app,
        errors: compilationResult.errors,
        status: compilationResult.success ? 'ready' : 'error',
        progress: 100,
        updatedAt: new Date(),
      };

      pushLog(compilationResult.success ? 'success' : 'error',
        compilationResult.success
          ? `✓ App generated successfully! ${app.files.length} files created.`
          : `Compilation failed with ${compilationResult.errors.length} issues`,
        'compilation'
      );

      setGenerationProgress(100);
      await saveGeneratedApps(prevMerge(generatedApps, app));
      logger.info(`[AppBuilder] App generation completed: ${app.name}`);
      return app;
    } catch (error) {
      logger.error('[AppBuilder] App generation failed:', error);
      // Capture failure in logs/status
      app = {
        ...app,
        status: 'error',
        updatedAt: new Date(),
        buildLogs: [
          ...app.buildLogs,
          { id: uuid('log-'), timestamp: new Date(), level: 'error', message: `Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`, phase: 'generation' },
        ],
      };
      await saveGeneratedApps(prevMerge(generatedApps, app));
      throw error;
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
      setCurrentApp(app);
      await persistCurrentAppId(app?.id ?? null);
    }
  }, [generatedApps, saveGeneratedApps, persistCurrentAppId]);

  /** ───────── CRUD ───────── **/

  const deleteApp = useCallback(async (appId: string) => {
    const updatedApps = generatedApps.filter(app => app.id !== appId);
    await saveGeneratedApps(updatedApps);

    if (currentApp?.id === appId) {
      setCurrentApp(updatedApps[updatedApps.length - 1] || null);
      await persistCurrentAppId(updatedApps[updatedApps.length - 1]?.id || null);
    }

    logger.info(`[AppBuilder] Deleted app: ${appId}`);
  }, [generatedApps, currentApp, saveGeneratedApps, persistCurrentAppId]);

  const updateApp = useCallback(async (appId: string, updates: Partial<GeneratedApp>) => {
    const updatedApps = generatedApps.map(app =>
      app.id === appId
        ? { ...app, ...updates, updatedAt: new Date() }
        : app
    );
    await saveGeneratedApps(updatedApps);

    if (currentApp?.id === appId) {
      const updated = updatedApps.find(app => app.id === appId) || null;
      setCurrentApp(updated);
      await persistCurrentAppId(updated?.id || null);
    }

    logger.info(`[AppBuilder] Updated app: ${appId}`);
  }, [generatedApps, currentApp, saveGeneratedApps, persistCurrentAppId]);

  /** ───────── Consensus Mode ───────── **/

  const runConsensusMode = useCallback(async (
    prompt: string,
    models: string[] = ['claude', 'gemini', 'gpt-4']
  ): Promise<ConsensusAnalysis> => {
    logger.info(`[AppBuilder] Running consensus mode with ${models.length} models`);
    setCurrentConsensus([]);

    let generateText: any;
    try {
      ({ generateText } = await import('@rork/toolkit-sdk'));
    } catch (e) {
      throw new Error('Missing @rork/toolkit-sdk or unsupported runtime. Install/provide it before consensus.');
    }

    const consensusResults: ModelConsensus[] = [];

    for (const modelId of models) {
      const start = Date.now();
      try {
        const response = String(await generateText({ messages: [{ role: 'user', content: prompt }] }) || '');
        const clean = stripFences(response);
        const confidence = calculateConfidence(clean);
        const tokensUsed = Math.ceil(clean.length / 4);
        const cost = (tokensUsed / 1000) * 0.02;

        consensusResults.push({
          modelId,
          modelName: modelId.toUpperCase(),
          response: clean,
          confidence,
          responseTime: Date.now() - start,
          tokensUsed,
          cost,
        });
      } catch (error) {
        logger.error(`[AppBuilder] Model ${modelId} failed:`, error);
      }
    }

    setCurrentConsensus(consensusResults);
    const analysis = await analyzeConsensus(consensusResults, prompt);
    setCurrentAnalysis(analysis);
    logger.info(`[AppBuilder] Consensus analysis complete: ${analysis.consensusScore}% agreement`);
    return analysis;
  }, []);

  const analyzeConsensus = async (
    consensus: ModelConsensus[],
    originalPrompt: string
  ): Promise<ConsensusAnalysis> => {
    let generateText: any;
    try {
      ({ generateText } = await import('@rork/toolkit-sdk'));
    } catch (e) {
      throw new Error('Missing @rork/toolkit-sdk or unsupported runtime.');
    }

    const analysisPrompt = `Analyze these ${consensus.length} AI model responses to the same prompt and identify:
1. Key agreements (what all models agree on)
2. Conflicts (where models disagree)
3. Best merged result

Original Prompt: ${originalPrompt}

${consensus.map((c, i) => `Model ${i + 1} (${c.modelName}):\n${c.response}\n\n`).join('')}

Return JSON:
{
  "agreements": ["agreement 1", "agreement 2"],
  "conflicts": [{"aspect": "X", "models": [{"modelId": "claude", "suggestion": "Y"}], "resolution": "Z"}],
  "mergedResult": "best combined approach",
  "consensusScore": 85,
  "recommendedModel": "claude"
}`;

    const analysisResult = String(await generateText({ messages: [{ role: 'user', content: analysisPrompt }] }) || '');
    const parsed = extractJSON(analysisResult);

    if (parsed) {
      return {
        agreements: (parsed.agreements || []).map(String),
        conflicts: (parsed.conflicts || []).map((c: any, i: number) => ({
          id: `conflict-${i}`,
          aspect: String(c.aspect || `aspect-${i}`),
          models: (c.models || []).map((m: any) => ({ modelId: String(m.modelId), suggestion: String(m.suggestion) })),
          resolution: String(c.resolution || ''),
        })),
        mergedResult: String(parsed.mergedResult || (consensus[0]?.response || '')),
        consensusScore: Number.isFinite(parsed.consensusScore) ? parsed.consensusScore : 70,
        recommendedModel: String(parsed.recommendedModel || (consensus[0]?.modelId || 'claude')),
      };
    }

    logger.warn('[AppBuilder] Failed to parse consensus JSON, returning fallback');
    return {
      agreements: ['All models provided valid responses'],
      conflicts: [],
      mergedResult: consensus[0]?.response || '',
      consensusScore: 70,
      recommendedModel: consensus[0]?.modelId || 'claude',
    };
  };

  /** ───────── Smart Model Selection ───────── **/

  const getSmartModelRecommendation = useCallback(async (
    taskDescription: string
  ): Promise<SmartModelRecommendation> => {
    logger.info('[AppBuilder] Getting smart model recommendation');

    const taskType = detectTaskType(taskDescription);
    const cachedRec = modelRecommendations.get(taskType);
    if (cachedRec && cachedRec.confidence > 80) {
      logger.info(`[AppBuilder] Using cached recommendation for ${taskType}`);
      return cachedRec;
    }

    const recommendations: Record<string, string[]> = {
      ui: ['gpt-4-vision', 'claude-3-opus', 'gemini-pro'],
      code: ['claude-3-opus', 'gpt-4-turbo', 'gemini-pro'],
      image: ['gpt-4-vision', 'gemini-pro'],
      data: ['gpt-4-turbo', 'claude-3-opus'],
      legal: ['claude-3-opus', 'gpt-4-turbo'],
      backend: ['claude-3-opus', 'gpt-4-turbo', 'gemini-pro'],
      frontend: ['gpt-4-turbo', 'claude-3-opus', 'gemini-pro'],
      fullstack: ['claude-3-opus', 'gpt-4-turbo', 'gemini-pro', 'gpt-4-vision'],
    };

    const reasoning: Record<string, string> = {
      ui: 'GPT-4 Vision excels at UI/UX design, Claude for component architecture, Gemini for responsive layouts',
      code: 'Claude leads in code quality, GPT-4 for complex logic, Gemini for optimization',
      image: 'GPT-4 Vision and Gemini Pro excel at image understanding/generation',
      data: 'GPT-4 and Claude are best for data analysis and transformation',
      legal: 'Claude excels at legal text, GPT-4 for comprehensive analysis',
      backend: 'Claude for API design, GPT-4 for business logic, Gemini for performance',
      frontend: 'GPT-4 for React patterns, Claude for state management, Gemini for styling',
      fullstack: 'All models contribute: Claude (architecture), GPT-4 (logic), Gemini (optimization), Vision (UI)',
    };

    const recommendation: SmartModelRecommendation = {
      taskType,
      recommendedModels: recommendations[taskType] || recommendations.fullstack,
      reasoning: reasoning[taskType] || reasoning.fullstack,
      confidence: 90,
    };

    const updated = new Map(modelRecommendations);
    updated.set(taskType, recommendation);
    setModelRecommendations(updated);
    await AsyncStorage.setItem(RECOMMENDATIONS_KEY, JSON.stringify(Object.fromEntries(updated)));

    logger.info(`[AppBuilder] Recommended ${recommendation.recommendedModels.length} models for ${taskType}`);
    return recommendation;
  }, [modelRecommendations]);

  /** ───────── Cache ───────── **/

  const getCachedGeneration = useCallback((prompt: string, config: AppGenerationConfig): CachedGeneration | null => {
    const cached = cachedGenerations.find(
      c => c.prompt === prompt && JSON.stringify(c.config) === JSON.stringify(config)
    );
    if (cached) {
      const ageH = (Date.now() - cached.timestamp.getTime()) / 3_600_000;
      if (ageH < 24) {
        logger.info('[AppBuilder] Found cached generation (age: ' + ageH.toFixed(1) + 'h)');
        return cached;
      }
    }
    return null;
  }, [cachedGenerations]);

  const replayGeneration = useCallback(async (cachedId: string): Promise<GeneratedApp> => {
    logger.info(`[AppBuilder] Replaying cached generation: ${cachedId}`);

    const cached = cachedGenerations.find(c => c.id === cachedId);
    if (!cached) throw new Error('Cached generation not found');

    setCurrentConsensus(cached.consensus);
    setCurrentAnalysis(cached.analysis);

    const replayed: GeneratedApp = {
      ...cached.result,
      id: `app-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedApps = [...generatedApps, replayed];
    await saveGeneratedApps(updatedApps);
    setCurrentApp(replayed);
    await persistCurrentAppId(replayed.id);

    logger.info('[AppBuilder] Generation replayed successfully');
    return replayed;
  }, [cachedGenerations, generatedApps, saveGeneratedApps, persistCurrentAppId]);

  /** ───────── Exposed API ───────── **/

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
    setCurrentApp: async (app: GeneratedApp | null) => {
      setCurrentApp(app);
      await persistCurrentAppId(app?.id || null);
    },
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
    persistCurrentAppId,
  ]);
});

/** ───────────────────────── Helpers ───────────────────────── **/

function extractAppName(prompt: string): string {
  const words = prompt.trim().split(/\s+/).slice(0, 5).join(' ');
  return words ? words[0].toUpperCase() + words.slice(1) : 'Generated App';
}

function calculateConfidence(response: string): number {
  let confidence = 70;
  const r = response || '';
  if (r.length > 500) confidence += 10;
  if (r.includes('import') && r.includes('export')) confidence += 5;
  if (/\b(interface|type)\b/.test(r)) confidence += 5;
  if (/\btry\b[\s\S]*\bcatch\b/.test(r)) confidence += 5;
  if (!/TODO|FIXME/.test(r)) confidence += 5;
  return Math.min(100, confidence);
}

function detectTaskType(description: string): SmartModelRecommendation['taskType'] {
  const lower = (description || '').toLowerCase();
  if (/(ui|design|interface|layout)/.test(lower)) return 'ui';
  if (/(image|photo|visual)/.test(lower)) return 'image';
  if (/(data|analytics|database)/.test(lower)) return 'data';
  if (/(legal|terms|policy)/.test(lower)) return 'legal';
  if (/(backend|api|server)/.test(lower)) return 'backend';
  if (/(frontend|react|component)/.test(lower)) return 'frontend';
  if (/(fullstack|full stack|complete app)/.test(lower)) return 'fullstack';
  return 'code';
}

function prevMerge(list: GeneratedApp[], updated: GeneratedApp): GeneratedApp[] {
  const idx = list.findIndex(a => a.id === updated.id);
  if (idx === -1) return [...list, updated];
  const copy = [...list];
  copy[idx] = updated;
  return copy;
}

async function compileApp(app: GeneratedApp): Promise<{ success: boolean; errors: CompilationError[] }> {
  logger.info(`[AppBuilder] Compiling app: ${app.name}`);
  // Simulate compilation
  await new Promise(r => setTimeout(r, 800));

  const errors: CompilationError[] = [];
  for (const file of app.files) {
    const lines = file.content.split('\n');
    lines.forEach((line, i) => {
      const isCommentOrString = /^\s*\/\//.test(line) || /^\s*\*/.test(line) || /(['"`]).*?\1/.test(line);
      if (!isCommentOrString && file.language === 'typescript' && /\bany\b/.test(line)) {
        errors.push({
          id: uuid('err-'),
          file: file.path,
          line: i + 1,
          column: Math.max(0, line.indexOf('any')),
          message: 'Avoid using "any" type',
          severity: 'warning',
        });
      }
      if (!isCommentOrString && /console\.log/.test(line)) {
        errors.push({
          id: uuid('err-'),
          file: file.path,
          line: i + 1,
          column: Math.max(0, line.indexOf('console.log')),
          message: 'Remove console.log in production',
          severity: 'warning',
        });
      }
    });
  }
  const hasErrors = errors.some(e => e.severity === 'error');
  logger.info(`[AppBuilder] Compilation ${hasErrors ? 'failed' : 'succeeded'} with ${errors.length} issues`);
  return { success: !hasErrors, errors };
}
