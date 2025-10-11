import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AIModel {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'google' | 'custom';
  capabilities: string[];
  costPerRequest: number;
  avgResponseTime: number;
  qualityScore: number;
}

export interface ModelResponse {
  modelId: string;
  content: string;
  qualityScore: number;
  responseTime: number;
  tokensUsed: number;
  cost: number;
  timestamp: Date;
}

export interface OrchestrationResult {
  id: string;
  prompt: string;
  models: string[];
  responses: ModelResponse[];
  selectedResponse: ModelResponse;
  totalCost: number;
  totalTime: number;
  createdAt: Date;
}

export interface OrchestrationConfig {
  models: string[];
  selectionStrategy: 'quality' | 'speed' | 'cost' | 'balanced';
  minQualityThreshold: number;
  maxCostPerRequest: number;
  timeout: number;
}

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

const STORAGE_KEY = 'tri-model-orchestration';

export const [TriModelProvider, useTriModel] = createContextHook(() => {
  const [availableModels] = useState<AIModel[]>(AVAILABLE_MODELS);
  const [config, setConfig] = useState<OrchestrationConfig>({
    models: ['gpt-4-turbo', 'claude-3-opus', 'gemini-pro'],
    selectionStrategy: 'balanced',
    minQualityThreshold: 85,
    maxCostPerRequest: 0.1,
    timeout: 30000,
  });
  const [orchestrationHistory, setOrchestrationHistory] = useState<OrchestrationResult[]>([]);
  const [isOrchestrating, setIsOrchestrating] = useState<boolean>(false);
  const [currentProgress, setCurrentProgress] = useState<number>(0);

  const loadHistory = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored).map((item: any) => ({
          ...item,
          createdAt: new Date(item.createdAt),
          responses: item.responses.map((r: any) => ({
            ...r,
            timestamp: new Date(r.timestamp),
          })),
        }));
        setOrchestrationHistory(parsed);
        console.log(`[TriModel] Loaded ${parsed.length} orchestration results`);
      }
    } catch (error) {
      console.error('[TriModel] Failed to load history:', error);
    }
  }, []);

  const saveHistory = useCallback(async (history: OrchestrationResult[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(history));
      setOrchestrationHistory(history);
    } catch (error) {
      console.error('[TriModel] Failed to save history:', error);
    }
  }, []);

  const updateConfig = useCallback(async (updates: Partial<OrchestrationConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
    console.log('[TriModel] Config updated:', updates);
  }, []);

  const orchestrateGeneration = useCallback(async (
    prompt: string,
    context?: Record<string, any>
  ): Promise<OrchestrationResult> => {
    setIsOrchestrating(true);
    setCurrentProgress(0);
    
    console.log(`[TriModel] Starting orchestration with ${config.models.length} models`);

    try {
      const { trpcClient } = await import('@/lib/trpc');
      
      setCurrentProgress(10);

      const backendResult = await trpcClient.orchestration.generate.mutate({
        prompt,
        models: config.models,
        selectionStrategy: config.selectionStrategy,
        context,
      });

      setCurrentProgress(95);

      const result: OrchestrationResult = {
        id: backendResult.id,
        prompt: backendResult.prompt,
        models: backendResult.models,
        responses: backendResult.responses.map(r => ({
          modelId: r.modelId,
          content: r.content,
          qualityScore: r.qualityScore,
          responseTime: r.responseTime,
          tokensUsed: r.tokensUsed,
          cost: r.cost,
          timestamp: r.timestamp,
        })),
        selectedResponse: {
          modelId: backendResult.selectedResponse.modelId,
          content: backendResult.selectedResponse.content,
          qualityScore: backendResult.selectedResponse.qualityScore,
          responseTime: backendResult.selectedResponse.responseTime,
          tokensUsed: backendResult.selectedResponse.tokensUsed,
          cost: backendResult.selectedResponse.cost,
          timestamp: backendResult.selectedResponse.timestamp,
        },
        totalCost: backendResult.totalCost,
        totalTime: backendResult.totalTime,
        createdAt: backendResult.createdAt,
      };

      const updatedHistory = [result, ...orchestrationHistory].slice(0, 50);
      await saveHistory(updatedHistory);

      setCurrentProgress(100);
      console.log(`[TriModel] Orchestration complete: Selected ${result.selectedResponse.modelId} with quality ${result.selectedResponse.qualityScore}%`);

      return result;
    } catch (error) {
      console.error('[TriModel] Orchestration failed:', error);
      throw error;
    } finally {
      setIsOrchestrating(false);
      setCurrentProgress(0);
    }
  }, [config, orchestrationHistory, saveHistory]);

  const compareModels = useCallback(async (
    prompt: string,
    modelIds: string[]
  ): Promise<ModelResponse[]> => {
    console.log(`[TriModel] Comparing ${modelIds.length} models`);
    
    try {
      const { trpcClient } = await import('@/lib/trpc');
      
      const result = await trpcClient.orchestration.compare.mutate({
        prompt,
        modelIds,
      });

      return result.results.map(r => ({
        modelId: r.modelId,
        content: r.content,
        qualityScore: r.qualityScore,
        responseTime: r.responseTime,
        tokensUsed: r.tokensUsed,
        cost: r.cost,
        timestamp: r.timestamp,
      }));
    } catch (error) {
      console.error('[TriModel] Comparison failed:', error);
      return [];
    }
  }, []);

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

        const stat = acc[response.modelId];
        stat.totalRequests++;
        stat.avgQuality = (stat.avgQuality * (stat.totalRequests - 1) + response.qualityScore) / stat.totalRequests;
        stat.avgResponseTime = (stat.avgResponseTime * (stat.totalRequests - 1) + response.responseTime) / stat.totalRequests;
        stat.totalCost += response.cost;
        
        if (result.selectedResponse.modelId === response.modelId) {
          stat.timesSelected++;
        }
      });
      return acc;
    }, {} as Record<string, any>);

    return stats;
  }, [orchestrationHistory]);

  return useMemo(() => ({
    availableModels,
    config,
    orchestrationHistory,
    isOrchestrating,
    currentProgress,
    loadHistory,
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
    loadHistory,
    updateConfig,
    orchestrateGeneration,
    compareModels,
    getModelStats,
  ]);
});


