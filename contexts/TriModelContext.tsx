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
    
    const startTime = Date.now();
    console.log(`[TriModel] Starting orchestration with ${config.models.length} models`);

    try {
      const { generateText } = await import('@rork/toolkit-sdk');
      const selectedModels = availableModels.filter(m => config.models.includes(m.id));
      const responses: ModelResponse[] = [];
      
      for (let i = 0; i < selectedModels.length; i++) {
        const model = selectedModels[i];
        setCurrentProgress(((i + 1) / selectedModels.length) * 90);
        
        console.log(`[TriModel] Generating with ${model.name}...`);
        const modelStartTime = Date.now();
        
        try {
          const systemPrompt = `You are an expert ${model.capabilities.join(', ')} AI assistant. Generate high-quality, production-ready code based on the user's request.

CRITICAL REQUIREMENTS:
- Use TypeScript with proper typing
- Follow React Native and Expo best practices
- Include proper error handling
- Use StyleSheet for styling
- Ensure web compatibility
- Add comprehensive comments
- Follow the cyan (#00FFFF) and red (#FF0040) color scheme

${context ? `CONTEXT:\n${JSON.stringify(context, null, 2)}` : ''}

Generate ONLY valid code without markdown formatting.`;

          const content = await generateText({
            messages: [
              { role: 'user', content: `${systemPrompt}\n\nUser Request: ${prompt}` }
            ]
          });

          const responseTime = Date.now() - modelStartTime;
          const tokensUsed = Math.ceil(content.length / 4);
          const cost = (tokensUsed / 1000) * model.costPerRequest;
          
          const qualityScore = await evaluateQuality(content, prompt);

          responses.push({
            modelId: model.id,
            content,
            qualityScore,
            responseTime,
            tokensUsed,
            cost,
            timestamp: new Date(),
          });

          console.log(`[TriModel] ${model.name} completed: Quality ${qualityScore}%, ${responseTime}ms`);
        } catch (error) {
          console.error(`[TriModel] ${model.name} failed:`, error);
          responses.push({
            modelId: model.id,
            content: `// Error: ${error instanceof Error ? error.message : 'Generation failed'}`,
            qualityScore: 0,
            responseTime: Date.now() - modelStartTime,
            tokensUsed: 0,
            cost: 0,
            timestamp: new Date(),
          });
        }
      }

      setCurrentProgress(95);

      const selectedResponse = selectBestResponse(responses, config.selectionStrategy);
      const totalTime = Date.now() - startTime;
      const totalCost = responses.reduce((sum, r) => sum + r.cost, 0);

      const result: OrchestrationResult = {
        id: `orch-${Date.now()}`,
        prompt,
        models: config.models,
        responses,
        selectedResponse,
        totalCost,
        totalTime,
        createdAt: new Date(),
      };

      const updatedHistory = [result, ...orchestrationHistory].slice(0, 50);
      await saveHistory(updatedHistory);

      setCurrentProgress(100);
      console.log(`[TriModel] Orchestration complete: Selected ${selectedResponse.modelId} with quality ${selectedResponse.qualityScore}%`);

      return result;
    } catch (error) {
      console.error('[TriModel] Orchestration failed:', error);
      throw error;
    } finally {
      setIsOrchestrating(false);
      setCurrentProgress(0);
    }
  }, [config, availableModels, orchestrationHistory, saveHistory]);

  const compareModels = useCallback(async (
    prompt: string,
    modelIds: string[]
  ): Promise<ModelResponse[]> => {
    console.log(`[TriModel] Comparing ${modelIds.length} models`);
    
    const { generateText } = await import('@rork/toolkit-sdk');
    const responses: ModelResponse[] = [];

    for (const modelId of modelIds) {
      const model = availableModels.find(m => m.id === modelId);
      if (!model) continue;

      const startTime = Date.now();
      try {
        const content = await generateText({
          messages: [{ role: 'user', content: prompt }]
        });

        const responseTime = Date.now() - startTime;
        const qualityScore = await evaluateQuality(content, prompt);

        responses.push({
          modelId,
          content,
          qualityScore,
          responseTime,
          tokensUsed: Math.ceil(content.length / 4),
          cost: model.costPerRequest,
          timestamp: new Date(),
        });
      } catch (error) {
        console.error(`[TriModel] Model ${modelId} comparison failed:`, error);
      }
    }

    return responses;
  }, [availableModels]);

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

async function evaluateQuality(content: string, prompt: string): Promise<number> {
  let score = 70;

  if (content.includes('import') && content.includes('export')) score += 5;
  if (content.includes('interface') || content.includes('type')) score += 5;
  if (content.includes('StyleSheet.create')) score += 5;
  if (content.includes('try') && content.includes('catch')) score += 5;
  if (content.includes('useState') || content.includes('useEffect')) score += 5;
  if (!content.includes('any')) score += 3;
  if (!content.includes('console.log')) score += 2;
  
  const hasComments = (content.match(/\/\//g) || []).length > 2;
  if (hasComments) score += 3;
  
  const lines = content.split('\n').length;
  if (lines > 20 && lines < 500) score += 2;

  return Math.min(100, score);
}

function selectBestResponse(
  responses: ModelResponse[],
  strategy: OrchestrationConfig['selectionStrategy']
): ModelResponse {
  if (responses.length === 0) {
    throw new Error('No responses to select from');
  }

  switch (strategy) {
    case 'quality':
      return responses.reduce((best, current) =>
        current.qualityScore > best.qualityScore ? current : best
      );
    
    case 'speed':
      return responses.reduce((best, current) =>
        current.responseTime < best.responseTime ? current : best
      );
    
    case 'cost':
      return responses.reduce((best, current) =>
        current.cost < best.cost ? current : best
      );
    
    case 'balanced':
    default:
      return responses.reduce((best, current) => {
        const bestScore = (best.qualityScore * 0.6) + 
                         ((10000 / best.responseTime) * 0.3) + 
                         ((1 / best.cost) * 0.1);
        const currentScore = (current.qualityScore * 0.6) + 
                            ((10000 / current.responseTime) * 0.3) + 
                            ((1 / current.cost) * 0.1);
        return currentScore > bestScore ? current : best;
      });
  }
}
