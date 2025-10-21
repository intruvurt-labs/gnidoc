import { runOpenAI } from './adapters/openai';
import { runAnthropic } from './adapters/anthropic';
import { runGemini } from './adapters/gemini';
import { runXAI } from './adapters/xai';
import { runDeepSeek } from './adapters/deepseek';
import { runHuggingFace } from './adapters/huggingface';
import { runOllama } from './adapters/ollama';
import { runReplicate } from './adapters/replicate';
import { runRunway } from './adapters/runway';
import { getModelInfo } from './registry';
import type { ModelResult, GenerationRequest } from './types';

export async function callProvider(
  model: string,
  prompt: string,
  system?: string,
  temperature = 0.7,
  maxTokens = 4096
): Promise<ModelResult> {
  const modelInfo = getModelInfo(model);
  
  if (!modelInfo) {
    if (model.includes('/')) {
      return runHuggingFace(model, prompt, system, temperature, maxTokens);
    }
    throw new Error(`Unknown model: ${model}`);
  }

  const { provider } = modelInfo;

  switch (provider) {
    case 'openai':
      return runOpenAI(model, prompt, system, temperature, maxTokens);
    
    case 'anthropic':
      return runAnthropic(model, prompt, system, temperature, maxTokens);
    
    case 'gemini':
      return runGemini(model, prompt, system, temperature, maxTokens);
    
    case 'xai':
      return runXAI(model, prompt, system, temperature, maxTokens);
    
    case 'deepseek':
      return runDeepSeek(model, prompt, system, temperature, maxTokens);
    
    case 'huggingface':
      return runHuggingFace(model, prompt, system, temperature, maxTokens);
    
    case 'ollama':
      return runOllama(model, prompt, system, temperature, maxTokens);
    
    case 'replicate':
      return runReplicate(model, prompt, system, temperature, maxTokens);
    
    case 'runway':
      return runRunway(model, prompt, system, temperature, maxTokens);
    
    default:
      throw new Error(`No adapter for provider: ${provider}`);
  }
}

export async function callProviderWithTimeout(
  model: string,
  prompt: string,
  system?: string,
  temperature = 0.7,
  maxTokens = 4096,
  timeoutMs = 90000
): Promise<ModelResult> {
  return Promise.race([
    callProvider(model, prompt, system, temperature, maxTokens),
    new Promise<ModelResult>((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
    ),
  ]).catch((error: any) => ({
    model,
    output: '',
    score: 0,
    responseTime: timeoutMs,
    tokensUsed: 0,
    error: error?.message || 'Request failed',
  }));
}

export async function orchestrateMultiModel(
  request: GenerationRequest,
  maxParallel = 3
): Promise<ModelResult[]> {
  const { prompt, context, models, systemPrompt, temperature, maxTokens } = request;
  
  const fullPrompt = context ? `${context}\n\n${prompt}` : prompt;
  const results: ModelResult[] = [];

  for (let i = 0; i < models.length; i += maxParallel) {
    const batch = models.slice(i, i + maxParallel);
    const batchResults = await Promise.all(
      batch.map(model =>
        callProviderWithTimeout(model, fullPrompt, systemPrompt, temperature, maxTokens)
      )
    );
    results.push(...batchResults);
  }

  return results;
}
