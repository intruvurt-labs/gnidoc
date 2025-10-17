import { z } from 'zod';
import { ENV } from '../lib/env';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

export interface OpenRouterModel {
  id: string;
  name: string;
  pricing: {
    prompt: string;
    completion: string;
  };
  context_length: number;
  architecture: {
    modality: string;
    tokenizer: string;
  };
  top_provider: {
    context_length: number;
    max_completion_tokens: number;
  };
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GenerationParams {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

export interface GenerationResponse {
  id: string;
  model: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function getAvailableModels(): Promise<OpenRouterModel[]> {
  const apiKey = ENV.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    console.warn('[OpenRouter] API key not configured, returning empty model list');
    return [];
  }

  try {
    const response = await fetch(`${OPENROUTER_BASE_URL}/models`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      console.error('[OpenRouter] Failed to fetch models:', response.statusText);
      return [];
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('[OpenRouter] Error fetching models:', error);
    return [];
  }
}

export async function generateWithModel(params: GenerationParams): Promise<GenerationResponse> {
  const apiKey = ENV.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    throw new Error('OpenRouter API key not configured. Please add OPENROUTER_API_KEY to your .env file.');
  }

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': ENV.EXPO_PUBLIC_API_URL || 'https://gnidoc.xyz',
      'X-Title': 'gnidoC terceS',
    },
    body: JSON.stringify({
      model: params.model,
      messages: params.messages,
      temperature: params.temperature ?? 0.7,
      max_tokens: params.max_tokens ?? 2000,
      top_p: params.top_p ?? 1,
      frequency_penalty: params.frequency_penalty ?? 0,
      presence_penalty: params.presence_penalty ?? 0,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('[OpenRouter] API error:', errorData);
    throw new Error(`OpenRouter API error: ${response.statusText}`);
  }

  return response.json();
}

export async function orchestrateMultiModel(params: {
  prompt: string;
  models: string[];
  systemPrompt?: string;
  temperature?: number;
  max_tokens?: number;
}): Promise<Array<{
  model: string;
  response: string;
  tokensUsed: number;
  cost: number;
  responseTime: number;
  error?: string;
}>> {
  const results = await Promise.allSettled(
    params.models.map(async (modelId) => {
      const startTime = Date.now();
      
      try {
        const messages: ChatMessage[] = [];
        
        if (params.systemPrompt) {
          messages.push({ role: 'system', content: params.systemPrompt });
        }
        
        messages.push({ role: 'user', content: params.prompt });

        const response = await generateWithModel({
          model: modelId,
          messages,
          temperature: params.temperature,
          max_tokens: params.max_tokens,
        });

        const responseTime = Date.now() - startTime;
        const tokensUsed = response.usage.total_tokens;
        
        const promptPrice = parseFloat(response.model.split('/').pop()?.includes('gpt-4') ? '0.03' : '0.0015');
        const completionPrice = parseFloat(response.model.split('/').pop()?.includes('gpt-4') ? '0.06' : '0.002');
        
        const cost = 
          (response.usage.prompt_tokens / 1000) * promptPrice +
          (response.usage.completion_tokens / 1000) * completionPrice;

        return {
          model: modelId,
          response: response.choices[0].message.content,
          tokensUsed,
          cost,
          responseTime,
        };
      } catch (error) {
        return {
          model: modelId,
          response: '',
          tokensUsed: 0,
          cost: 0,
          responseTime: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    })
  );

  return results.map((result, idx) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        model: params.models[idx],
        response: '',
        tokensUsed: 0,
        cost: 0,
        responseTime: 0,
        error: result.reason?.message || 'Generation failed',
      };
    }
  });
}
