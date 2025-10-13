import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';

/** ───────────────────────── Types ───────────────────────── */

export interface AIModel {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'google' | 'custom';
  capabilities: string[];
  costPerRequest: number;     // USD max-expected cost used for client-side budgeting
  avgResponseTime: number;    // ms (observed)
  qualityScore: number;       // 0..100 (observed)
}

export interface ModelResponse {
  modelId: string;
  content: string;
  qualityScore: number;       // 0..100
  responseTime: number;       // ms
  tokensUsed: number;
  cost: number;               // USD
  timestamp: Date;
}

export interface OrchestrationResult {
  id: string;
  prompt: string;
  models: string[];           // model ids attempted
  responses: ModelResponse[];
  selectedResponse: ModelResponse;
  totalCost: number;
  totalTime: number;
  createdAt: Date;
}

export interface OrchestrationConfig {
  models: string[];
  selectionStrategy: 'quality' | 'speed' | 'cost' | 'balanced';
  minQualityThreshold: number;    // reject below
  maxCostPerRequest: number;      // client-side budget guard
  timeout: number;                // ms
}

/** ───────────────────────── Catalog (business truth) ───────────────────────── */

const AVAILABLE_MODELS: AIModel[] = [
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    capabilities: ['code-generation', 'design', 'logic', 'deployment'],
    costPerRequest: 0.03,
    avgResponseTime: 3000,
    qualityScore: 95,
  },
  {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    capabilities: ['code-generation', 'design', 'logic', 'analysis'],
    costPerRequest: 0.025,
    avgResponseTime: 2500,
    qualityScore: 93,
  },
  {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    provider: 'google',
    capabilities: ['code-generation', 'design', 'multimodal'],
    costPerRequest: 0.02,
    avgResponseTime: 2000,
    qualityScore: 90,
  },
  {
    id: 'gpt-4-vision',
    name: 'GPT-4 Vision',
    provider: 'openai',
    capabilities: ['design', 'ui-analysis', 'multimodal'],
    costPerRequest: 0.04,
    avgResponseTime: 3500,
    qualityScore: 92,
  },
];

/** ───────────────────────── Persistence ───────────────────────── */

const STORAGE_KEY = 'tri-model-orchestration';
const HISTORY_LIMIT = 50;

/** ───────────────────────── Schemas (strict I/O validation) ───────────────────────── */

const ModelResponseWire = z.object({
  modelId: z.string(),
  content: z.string(),
  qualityScore: z.number().min(0).max(100),
  responseTime: z.number().min(0),
  tokensUsed: z.number().min(0),
  cost: z.number().min(0),
  timestamp: z.union([z.string(), z.number(), z.date()]),
});

const OrchestrationGenerateWire = z.object({
  id: z.string(),
  prompt: z.string(),
  models: z.array(z.string()),
  responses: z.array(ModelResponseWire),
  selectedResponse: ModelResponseWire,
  totalCost: z.number(),
  totalTime: z.number(),
  createdAt: z.union([z.string(), z.number(), z.date()]),
});

const CompareWire = z.object({
  results: z.array(ModelResponseWire),
});

/** ───────────────────────── Utilities ───────────────────────── */

function reviveDate(input: string | number | Date): Date {
  return input instanceof Date ? input : new Date(input);
}

function toClientModelResponse(w: z.infer<typeof ModelResponseWire>): ModelResponse {
  return {
    modelId: w.modelId,
    content: w.content,
    qualityScore: w.qualityScore,
    responseTime: w.responseTime,
    tokensUsed: w.tokensUsed,
    cost: w.cost,
    timestamp: reviveDate(w.timestamp),
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number, label = 'operation'): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timed out waiting for ${label} after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer!));
}

function selectBest(
  strategy: OrchestrationConfig['selectionStrategy'],
  minQuality: number,
  responses: ModelResponse[]
): ModelResponse {
  const candidates = responses.filter(r => r.qualityScore >= minQuality && r.content.trim().length > 0);
  if (candidates.length === 0) {
    // If nothing meets threshold, fall back to highest quality to avoid empty results
    return responses.slice().sort((a, b) => b.qualityScore - a.qualityScore)[0] ?? responses[0];
  }

  switch (strategy) {
    case 'quality':
      return candidates.slice().sort((a, b) => b.qualityScore - a.qualityScore)[0];
    case 'speed':
      return candidates.slice().sort((a, b) => a.responseTime - b.responseTime)[0];
    case 'cost':
      return candidates.slice().sort((a, b) => a.cost - b.cost)[0];
    case 'balanced':
    default: {
      // Balanced: normalized score across quality (weight 0.55), speed (0.25), cost (0.20)
      const qMax = Math.max(...candidates.map(c => c.qualityScore)) || 1;
      const tMax = Math.max(...candidates.map(c => c.responseTime)) || 1;
      const cMax = Math.max(...candidates.map(c => c.cost)) || 1;
      let best = candidates[0];
      let bestScore = -Infinity;
      for (const r of candidates) {
        const q = r.qualityScore / qMax;                 // higher is better
        const s = 1 - r.responseTime / tMax;             // lower time => higher score
        const c = 1 - r.cost / cMax;                     // lower cost => higher score
        const composite = 0.55 * q + 0.25 * s + 0.20 * c;
        if (composite > bestScore) {
          bestScore = composite;
          best = r;
        }
      }
      return best;
    }
  }
}

async function loadHistory(): Promise<OrchestrationResult[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as any[];
    return (arr || []).map((r) => ({
      id: r.id,
      prompt: r.prompt,
      models: r.models || [],
      responses: (r.responses || []).map((rr: any) => ({
        ...rr,
        timestamp: new Date(rr.timestamp),
      })),
      selectedResponse: { ...r.selectedResponse, timestamp: new Date(r.selectedResponse.timestamp) },
      totalCost: r.totalCost,
      totalTime: r.totalTime,
      createdAt: new Date(r.createdAt),
    }));
  } catch {
    return [];
  }
}

async function saveHistory(history: OrchestrationResult[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, HISTORY_LIMIT)));
}

/** ───────────────────────── Context ───────────────────────── */

export const [TriModelProvider, useTriModel] = createContextHook(() => {
  const [availableModels] = useState<AIModel[]>(AVAILABLE_MODELS);
  const [config, setConfig] = useState<OrchestrationConfig>({
    models: ['gpt-4-turbo', 'claude-3-opus', 'gemini-pro'],
    selectionStrategy: 'balanced',
    minQualityThreshold: 85,
    maxCostPerRequest: 0.1,
    timeout: 30_000,
  });
  const [orchestrationHistory, setOrchestrationHistory] = useState<OrchestrationResult[]>([]);
  const [isOrchestrating, setIsOrchestrating] = useState<boolean>(false);
  const [currentProgress, setCurrentProgress] = useState<number>(0);

  /** Load persisted history on demand */
  const loadHistoryAction = useCallback(async () => {
    try {
      const hist = await loadHistory();
      setOrchestrationHistory(hist);
      console.log(`[TriModel] Loaded ${hist.length} orchestration results`);
    } catch (error) {
      console.error('[TriModel] Failed to load history:', error);
    }
  }, []);

  /** Persist history */
  const persistHistory = useCallback(async (history: OrchestrationResult[]) => {
    try {
      await saveHistory(history);
      setOrchestrationHistory(history);
    } catch (error) {
      console.error('[TriModel] Failed to save history:', error);
    }
  }, []);

  /** Update config (partial, real time) */
  const updateConfig = useCallback(async (updates: Partial<OrchestrationConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
    console.log('[TriModel] Config updated:', updates);
  }, []);

  /** Orchestrate via backend (tRPC), with strict IO validation & timeout */
  const orchestrateGeneration = useCallback(async (
    prompt: string,
    context?: Record<string, any>
  ): Promise<OrchestrationResult> => {
    setIsOrchestrating(true);
    setCurrentProgress(0);

    try {
      const token = await AsyncStorage.getItem('auth-token');
      if (!token) {
        throw new Error('Authentication required. Please log in to use multi-model orchestration.');
      }

      // Dynamic import to avoid circulars and to respect your app’s module graph
      const { trpcClient } = await import('@/lib/trpc');

      // Budget pre-check (client-side guard)
      const plannedCostCeil = config.models.reduce((acc, id) => {
        const m = AVAILABLE_MODELS.find(mm => mm.id === id);
        return acc + (m?.costPerRequest ?? 0);
      }, 0);
      if (plannedCostCeil > config.maxCostPerRequest) {
        throw new Error(
          `Configured models exceed maxCostPerRequest ($${config.maxCostPerRequest.toFixed(3)}). Planned ≈ $${plannedCostCeil.toFixed(3)}`
        );
      }

      setCurrentProgress(10);

      // Execute backend call with client timeout
      const backendCall = trpcClient.orchestration.generate.mutate({
        prompt,
        models: config.models,
        selectionStrategy: config.selectionStrategy,
        context,
      });

      const raw = await withTimeout(backendCall, config.timeout, 'orchestration.generate');
      const parsed = OrchestrationGenerateWire.safeParse(raw);
      if (!parsed.success) {
        console.error('[TriModel] Backend validation error:', parsed.error.flatten());
        throw new Error('Invalid response from orchestration backend.');
      }

      setCurrentProgress(95);

      const wire = parsed.data;

      // Build client result with strong typing
      const responses: ModelResponse[] = wire.responses.map(toClientModelResponse);
      const selected = toClientModelResponse(wire.selectedResponse);

      // If backend did not use our threshold/strategy strictly, enforce locally.
      const selectedFinal =
        selectBest(config.selectionStrategy, config.minQualityThreshold, responses);

      const result: OrchestrationResult = {
        id: wire.id,
        prompt: wire.prompt,
        models: wire.models,
        responses,
        selectedResponse: selectedFinal,
        totalCost: wire.totalCost,
        totalTime: wire.totalTime,
        createdAt: reviveDate(wire.createdAt),
      };

      const updatedHistory = [result, ...orchestrationHistory].slice(0, HISTORY_LIMIT);
      await persistHistory(updatedHistory);

      setCurrentProgress(100);
      console.log(
        `[TriModel] Orchestration complete: Selected ${result.selectedResponse.modelId} ` +
        `(q=${result.selectedResponse.qualityScore}, t=${result.selectedResponse.responseTime}ms, $${result.selectedResponse.cost.toFixed(4)})`
      );

      return result;
    } catch (error) {
      console.error('[TriModel] Orchestration failed:', error);
      const message =
        error instanceof Error ? error.message : 'Orchestration failed. Please try again.';
      if (/UNAUTHORIZED|Authentication/i.test(message)) {
        throw new Error('Authentication required. Please log in to use multi-model orchestration.');
      }
      if (/Timed out/i.test(message)) {
        throw new Error(`Request timed out after ${config.timeout}ms. Try fewer models or increase timeout.`);
      }
      if (/fetch|network/i.test(message)) {
        throw new Error('Network error. Check your connection and ensure the backend server is reachable.');
      }
      throw new Error(message);
    } finally {
      setIsOrchestrating(false);
      setCurrentProgress(0);
    }
  }, [config, orchestrationHistory, persistHistory]);

  /** Compare specific models (tRPC), with strict validation & timeout */
  const compareModels = useCallback(async (
    prompt: string,
    modelIds: string[]
  ): Promise<ModelResponse[]> => {
    try {
      const token = await AsyncStorage.getItem('auth-token');
      if (!token) {
        throw new Error('Authentication required. Please log in to compare models.');
      }

      const { trpcClient } = await import('@/lib/trpc');

      const backendCall = trpcClient.orchestration.compare.mutate({ prompt, modelIds });
      const raw = await withTimeout(backendCall, config.timeout, 'orchestration.compare');

      const parsed = CompareWire.safeParse(raw);
      if (!parsed.success) {
        console.error('[TriModel] Compare validation error:', parsed.error.flatten());
        throw new Error('Invalid response from comparison backend.');
      }

      return parsed.data.results.map(toClientModelResponse);
    } catch (error) {
      console.error('[TriModel] Comparison failed:', error);
      const message = error instanceof Error ? error.message : 'Comparison failed. Please try again.';
      if (/UNAUTHORIZED|Authentication/i.test(message)) {
        throw new Error('Authentication required. Please log in to compare models.');
      }
      if (/Timed out/i.test(message)) {
        throw new Error(`Comparison timed out after ${config.timeout}ms.`);
      }
      if (/fetch|network/i.test(message)) {
        throw new Error('Network error. Check your connection and ensure the backend server is reachable.');
      }
      throw new Error(message);
    }
  }, [config.timeout]);

  /** Aggregate stats from local history */
  const getModelStats = useCallback(() => {
    const stats = orchestrationHistory.reduce((acc, result) => {
      result.responses.forEach(response => {
        if (!acc[response.modelId]) {
          acc[response.modelId] = {
            totalRequests: 0,
            avgQuality: 0,
            avgResponseTime: 0,
            totalCost: 0,
            timesSelected: 0,
          };
        }
        const s = acc[response.modelId];
        s.totalRequests++;
        s.avgQuality = (s.avgQuality * (s.totalRequests - 1) + response.qualityScore) / s.totalRequests;
        s.avgResponseTime = (s.avgResponseTime * (s.totalRequests - 1) + response.responseTime) / s.totalRequests;
        s.totalCost += response.cost;
      });

      const chosen = result.selectedResponse.modelId;
      acc[chosen].timesSelected = (acc[chosen].timesSelected || 0) + 1;
      return acc;
    }, {} as Record<string, { totalRequests: number; avgQuality: number; avgResponseTime: number; totalCost: number; timesSelected: number; }>);

    return stats;
  }, [orchestrationHistory]);

  /** Expose API */
  return useMemo(() => ({
    availableModels,
    config,
    orchestrationHistory,
    isOrchestrating,
    currentProgress,

    loadHistory: loadHistoryAction,
    updateConfig,
    orchestrateGeneration,
    compareModels,
    getModelStats,
  }), [
    availableModels,
    config,
    orchestrationHistory,
    isOrchestrating,
    currentProgress,
    loadHistoryAction,
    updateConfig,
    orchestrateGeneration,
    compareModels,
    getModelStats,
  ]);
});
