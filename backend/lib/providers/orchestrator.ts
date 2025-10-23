import pLimit from 'p-limit';
import { GenInput, GenResult, ScoredResult, ConsensusResult, ProviderConfig, OrchestrationMetrics } from './types';
import { scoreResults, calculateCostEfficiency } from './scoring';
import { buildHybridConsensus, validateConsensusQuality } from './consensus';
import { openaiAdapter } from './adapters/openai';
import { claudeAdapter } from './adapters/anthropic';
import { geminiAdapter } from './adapters/gemini';
import { xaiAdapter } from './adapters/xai';
import { deepseekAdapter } from './adapters/deepseek';
import { huggingfaceAdapter } from './adapters/huggingface';
import { ollamaAdapter } from './adapters/ollama';
import { replicateAdapter } from './adapters/replicate';
import { runwayAdapter } from './adapters/runway';

// Enhanced configuration
const PROVIDER_TIMEOUT_MS = parseInt(process.env.PROVIDER_TIMEOUT_MS || '45000', 10);
const MAX_PARALLEL = parseInt(process.env.LLM_MAX_PARALLEL || '4', 10);
const MAX_RETRIES = parseInt(process.env.MAX_RETRIES || '2', 10);

const limit = pLimit(MAX_PARALLEL);

type AdapterFn = (input: GenInput) => Promise<GenResult>;

// Enhanced adapter registry with metadata
const Adapters: Record<string, { 
  adapter: AdapterFn; 
  config: ProviderConfig;
  stats: ProviderStats;
}> = {
  openai: { 
    adapter: openaiAdapter, 
    config: {
      costPer1K: 0.03,
      maxTokens: 128000,
      capabilities: ['code', 'reasoning', 'vision'],
      reliability: 0.98,
      speed: 'fast'
    },
    stats: { calls: 0, errors: 0, totalCost: 0 }
  },
  anthropic: { 
    adapter: claudeAdapter, 
    config: {
      costPer1K: 0.025,
      maxTokens: 200000,
      capabilities: ['code', 'reasoning', 'long-context'],
      reliability: 0.97,
      speed: 'fast'
    },
    stats: { calls: 0, errors: 0, totalCost: 0 }
  },
  gemini: { 
    adapter: geminiAdapter, 
    config: {
      costPer1K: 0.015,
      maxTokens: 1000000,
      capabilities: ['code', 'reasoning', 'multimodal'],
      reliability: 0.96,
      speed: 'very-fast'
    },
    stats: { calls: 0, errors: 0, totalCost: 0 }
  },
  xai: { 
    adapter: xaiAdapter, 
    config: {
      costPer1K: 0.01,
      maxTokens: 32768,
      capabilities: ['code', 'reasoning'],
      reliability: 0.95,
      speed: 'fast'
    },
    stats: { calls: 0, errors: 0, totalCost: 0 }
  },
  deepseek: { 
    adapter: deepseekAdapter, 
    config: {
      costPer1K: 0.0014,
      maxTokens: 128000,
      capabilities: ['code', 'reasoning'],
      reliability: 0.94,
      speed: 'medium'
    },
    stats: { calls: 0, errors: 0, totalCost: 0 }
  },
  huggingface: { 
    adapter: huggingfaceAdapter, 
    config: {
      costPer1K: 0.0008,
      maxTokens: 32768,
      capabilities: ['code', 'specialized'],
      reliability: 0.90,
      speed: 'variable'
    },
    stats: { calls: 0, errors: 0, totalCost: 0 }
  },
  ollama: { 
    adapter: ollamaAdapter, 
    config: {
      costPer1K: 0.0001, // Local compute cost
      maxTokens: 32768,
      capabilities: ['code', 'local'],
      reliability: 0.85,
      speed: 'slow'
    },
    stats: { calls: 0, errors: 0, totalCost: 0 }
  },
  replicate: { 
    adapter: replicateAdapter, 
    config: {
      costPer1K: 0.005,
      maxTokens: 32768,
      capabilities: ['code', 'specialized-models'],
      reliability: 0.92,
      speed: 'medium'
    },
    stats: { calls: 0, errors: 0, totalCost: 0 }
  },
  runway: { 
    adapter: runwayAdapter, 
    config: {
      costPer1K: 0.02,
      maxTokens: 32768,
      capabilities: ['vision', 'multimodal'],
      reliability: 0.89,
      speed: 'medium'
    },
    stats: { calls: 0, errors: 0, totalCost: 0 }
  },
};

interface ProviderStats {
  calls: number;
  errors: number;
  totalCost: number;
}

interface OrchestrationOptions {
  budget?: number;
  qualityThreshold?: number;
  speedPriority?: 'cost' | 'quality' | 'speed';
  fallbackStrategy?: 'aggressive' | 'conservative';
  requireConsensus?: boolean;
}

async function withRetry<T>(
  operation: () => Promise<T>,
  provider: string,
  maxRetries: number = MAX_RETRIES
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      Adapters[provider].stats.errors++;
      
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        console.warn(`[Orchestrator] ${provider} attempt ${attempt} failed, retrying in ${delay}ms:`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError!;
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  provider: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${provider} timeout after ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ]);
}

function selectOptimalProviders(
  requestedProviders: string[], 
  taskType: 'code' | 'text' | 'vision',
  options: OrchestrationOptions
): string[] {
  const availableProviders = requestedProviders.filter(p => p in Adapters);
  
  if (availableProviders.length === 0) {
    throw new Error(`No valid providers. Available: ${Object.keys(Adapters).join(', ')}`);
  }

  // Score providers based on task type and priorities
  const scoredProviders = availableProviders.map(provider => {
    const adapter = Adapters[provider];
    let score = 0;
    
    // Task type matching
    if (taskType === 'code' && adapter.config.capabilities.includes('code')) score += 3;
    if (taskType === 'vision' && adapter.config.capabilities.includes('vision')) score += 3;
    
    // Reliability
    score += adapter.config.reliability * 2;
    
    // Cost efficiency
    if (options.speedPriority === 'cost') {
      score += (1 - adapter.config.costPer1K) * 2;
    }
    
    // Speed
    if (options.speedPriority === 'speed') {
      if (adapter.config.speed === 'very-fast') score += 2;
      if (adapter.config.speed === 'fast') score += 1;
    }
    
    return { provider, score };
  });

  // Sort by score and take top performers
  return scoredProviders
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(availableProviders.length, MAX_PARALLEL))
    .map(p => p.provider);
}

export async function runOrchestrator(
  providers: string[],
  input: GenInput,
  taskType: 'code' | 'text' | 'vision' = 'text',
  options: OrchestrationOptions = {}
): Promise<{ 
  results: ScoredResult[]; 
  consensus: ConsensusResult;
  metrics: OrchestrationMetrics;
}> {
  const startTime = Date.now();
  
  // Select optimal providers based on task and priorities
  const optimalProviders = selectOptimalProviders(providers, taskType, options);
  
  console.log(`[Orchestrator] Running ${optimalProviders.length} providers:`, optimalProviders);

  const tasks = optimalProviders.map((provider) =>
    limit(async (): Promise<GenResult> => {
      Adapters[provider].stats.calls++;
      
      return withRetry(async () => {
        const adapter = Adapters[provider].adapter;
        const result = await withTimeout(
          adapter(input),
          PROVIDER_TIMEOUT_MS,
          provider
        );
        
        // Track cost
        if (result.tokensUsed) {
          const cost = (result.tokensUsed / 1000) * Adapters[provider].config.costPer1K;
          Adapters[provider].stats.totalCost += cost;
        }
        
        console.log(`[Orchestrator] ${provider} completed in ${result.responseTime}ms`);
        return result;
      }, provider);
    })
  );

  const settled = await Promise.allSettled(tasks);
  
  const results = settled
    .filter((r): r is PromiseFulfilledResult<GenResult> => r.status === 'fulfilled')
    .map((r) => r.value);

  console.log(`[Orchestrator] Received ${results.length} successful results`);

  // Handle failures with fallback if needed
  if (results.length === 0) {
    throw new Error('All providers failed to generate results');
  }

  if (results.length < optimalProviders.length && options.fallbackStrategy === 'aggressive') {
    console.warn(`[Orchestrator] ${optimalProviders.length - results.length} providers failed, considering fallback`);
    // Could trigger fallback to additional providers here
  }

  const scored = scoreResults(results, taskType);
  const consensus = buildHybridConsensus(scored);
  
  // Validate consensus quality
  const validation = validateConsensusQuality(consensus, scored);
  if (!validation.valid && options.requireConsensus) {
    console.warn(`[Orchestrator] Consensus validation failed:`, validation.errors);
    // Could trigger regeneration with different providers
  }

  const totalTime = Date.now() - startTime;
  
  const metrics: OrchestrationMetrics = {
    totalTime,
    providersUsed: optimalProviders,
    successfulProviders: results.map(r => r.provider),
    totalTokens: results.reduce((sum, r) => sum + (r.tokensUsed || 0), 0),
    totalCost: results.reduce((sum, r) => {
      const providerCost = Adapters[r.provider].config.costPer1K;
      return sum + ((r.tokensUsed || 0) / 1000) * providerCost;
    }, 0),
    consensusStrength: consensus.confidence,
    qualityScore: consensus.agreement
  };

  console.log(`[Orchestrator] Completed in ${totalTime}ms with ${metrics.consensusStrength * 100}% confidence`);

  return { results: scored, consensus, metrics };
}

export async function runSingleProvider(
  provider: string,
  input: GenInput,
  taskType: 'code' | 'text' | 'vision' = 'text'
): Promise<ScoredResult> {
  if (!(provider in Adapters)) {
    throw new Error(`Unknown provider: ${provider}. Available: ${Object.keys(Adapters).join(', ')}`);
  }

  console.log(`[Orchestrator] Running single provider: ${provider}`);

  Adapters[provider].stats.calls++;

  try {
    const adapter = Adapters[provider].adapter;
    const result = await withRetry(
      () => withTimeout(adapter(input), PROVIDER_TIMEOUT_MS, provider),
      provider
    );
    
    // Track cost
    if (result.tokensUsed) {
      const cost = (result.tokensUsed / 1000) * Adapters[provider].config.costPer1K;
      Adapters[provider].stats.totalCost += cost;
    }
    
    const scored = scoreResults([result], taskType)[0];
    
    console.log(`[Orchestrator] ${provider} completed with score ${scored.score} in ${result.responseTime}ms`);
    
    return scored;
  } catch (error) {
    console.error(`[Orchestrator] ${provider} failed:`, error);
    Adapters[provider].stats.errors++;
    throw error;
  }
}

export function getProviderStats(): Record<string, ProviderStats> {
  const stats: Record<string, ProviderStats> = {};
  for (const [provider, data] of Object.entries(Adapters)) {
    stats[provider] = { ...data.stats };
  }
  return stats;
}

export function resetProviderStats(): void {
  for (const provider of Object.keys(Adapters)) {
    Adapters[provider].stats = { calls: 0, errors: 0, totalCost: 0 };
  }
}

export function getAvailableProviders(): string[] {
  return Object.keys(Adapters);
}

export function getProviderCapabilities(provider: string): ProviderConfig | null {
  return Adapters[provider]?.config || null;
}

// Cost optimization helper
export function estimateCost(
  providers: string[],
  estimatedTokens: number
): { provider: string; estimatedCost: number }[] {
  return providers
    .filter(p => p in Adapters)
    .map(provider => ({
      provider,
      estimatedCost: (estimatedTokens / 1000) * Adapters[provider].config.costPer1K
    }))
    .sort((a, b) => a.estimatedCost - b.estimatedCost);
}

export { Adapters };