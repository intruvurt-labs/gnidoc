import Constants from 'expo-constants';

export interface AIProvider {
  id: string;
  name: string;
  envKey: string;
  available: boolean;
  models: AIModelConfig[];
}

export interface AIModelConfig {
  id: string;
  name: string;
  provider: string;
  capabilities: string[];
  costPerRequest: number;
  avgResponseTime: number;
  qualityScore: number;
  contextWindow?: number;
  supportsVision?: boolean;
  supportsAudio?: boolean;
  supportsVideo?: boolean;
}

const ENV_KEYS = {
  OPENAI: 'OPENAI_API_KEY',
  ANTHROPIC: 'ANTHROPIC_API_KEY',
  GOOGLE: 'GOOGLE_API_KEY',
  GEMINI: 'GEMINI_API_KEY',
  REPLICATE: 'REPLICATE_API_KEY',
  RUNWAY: 'RUNWAY_API_KEY',
  HUGGINGFACE: 'HUGGINGFACE_API_KEY',
  COHERE: 'COHERE_API_KEY',
  STABILITY: 'STABILITY_API_KEY',
  TOGETHER: 'TOGETHER_API_KEY',
  PERPLEXITY: 'PERPLEXITY_API_KEY',
  GROQ: 'GROQ_API_KEY',
  MISTRAL: 'MISTRAL_API_KEY',
  DEEPSEEK: 'DEEPSEEK_API_KEY',
  XAI: 'XAI_API_KEY',
  FIREWORKS: 'FIREWORKS_API_KEY',
  ANYSCALE: 'ANYSCALE_API_KEY',
  DEEPINFRA: 'DEEPINFRA_API_KEY',
  OPENROUTER: 'OPENROUTER_API_KEY',
} as const;

function getEnvValue(key: string): string | undefined {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  
  const expoConfig = Constants.expoConfig;
  if (expoConfig?.extra?.[key]) {
    return expoConfig.extra[key];
  }
  
  return undefined;
}

export function scanAvailableProviders(): AIProvider[] {
  const providers: AIProvider[] = [
    {
      id: 'openai',
      name: 'OpenAI',
      envKey: ENV_KEYS.OPENAI,
      available: !!getEnvValue(ENV_KEYS.OPENAI),
      models: [
        {
          id: 'gpt-4-turbo',
          name: 'GPT-4 Turbo',
          provider: 'openai',
          capabilities: ['code-generation', 'design', 'logic', 'deployment', 'analysis'],
          costPerRequest: 0.03,
          avgResponseTime: 3000,
          qualityScore: 95,
          contextWindow: 128000,
          supportsVision: false,
        },
        {
          id: 'gpt-4o',
          name: 'GPT-4o',
          provider: 'openai',
          capabilities: ['code-generation', 'design', 'logic', 'multimodal', 'vision'],
          costPerRequest: 0.025,
          avgResponseTime: 2500,
          qualityScore: 96,
          contextWindow: 128000,
          supportsVision: true,
        },
        {
          id: 'gpt-4-vision',
          name: 'GPT-4 Vision',
          provider: 'openai',
          capabilities: ['design', 'ui-analysis', 'multimodal', 'vision'],
          costPerRequest: 0.04,
          avgResponseTime: 3500,
          qualityScore: 92,
          contextWindow: 128000,
          supportsVision: true,
        },
        {
          id: 'gpt-3.5-turbo',
          name: 'GPT-3.5 Turbo',
          provider: 'openai',
          capabilities: ['code-generation', 'logic', 'fast-response'],
          costPerRequest: 0.002,
          avgResponseTime: 1500,
          qualityScore: 85,
          contextWindow: 16385,
        },
        {
          id: 'o1-preview',
          name: 'O1 Preview',
          provider: 'openai',
          capabilities: ['reasoning', 'complex-logic', 'mathematics', 'code-generation'],
          costPerRequest: 0.15,
          avgResponseTime: 8000,
          qualityScore: 98,
          contextWindow: 128000,
        },
      ],
    },
    {
      id: 'anthropic',
      name: 'Anthropic',
      envKey: ENV_KEYS.ANTHROPIC,
      available: !!getEnvValue(ENV_KEYS.ANTHROPIC),
      models: [
        {
          id: 'claude-3-opus',
          name: 'Claude 3 Opus',
          provider: 'anthropic',
          capabilities: ['code-generation', 'design', 'logic', 'analysis', 'reasoning'],
          costPerRequest: 0.025,
          avgResponseTime: 2500,
          qualityScore: 93,
          contextWindow: 200000,
        },
        {
          id: 'claude-3-sonnet',
          name: 'Claude 3 Sonnet',
          provider: 'anthropic',
          capabilities: ['code-generation', 'design', 'logic', 'balanced'],
          costPerRequest: 0.015,
          avgResponseTime: 2000,
          qualityScore: 91,
          contextWindow: 200000,
        },
        {
          id: 'claude-3-haiku',
          name: 'Claude 3 Haiku',
          provider: 'anthropic',
          capabilities: ['code-generation', 'fast-response', 'cost-effective'],
          costPerRequest: 0.005,
          avgResponseTime: 1200,
          qualityScore: 87,
          contextWindow: 200000,
        },
        {
          id: 'claude-3.5-sonnet',
          name: 'Claude 3.5 Sonnet',
          provider: 'anthropic',
          capabilities: ['code-generation', 'design', 'logic', 'analysis', 'vision'],
          costPerRequest: 0.018,
          avgResponseTime: 2200,
          qualityScore: 94,
          contextWindow: 200000,
          supportsVision: true,
        },
      ],
    },
    {
      id: 'google',
      name: 'Google AI',
      envKey: ENV_KEYS.GOOGLE,
      available: !!getEnvValue(ENV_KEYS.GOOGLE) || !!getEnvValue(ENV_KEYS.GEMINI),
      models: [
        {
          id: 'gemini-pro',
          name: 'Gemini Pro',
          provider: 'google',
          capabilities: ['code-generation', 'design', 'multimodal'],
          costPerRequest: 0.02,
          avgResponseTime: 2000,
          qualityScore: 90,
          contextWindow: 32000,
        },
        {
          id: 'gemini-1.5-pro',
          name: 'Gemini 1.5 Pro',
          provider: 'google',
          capabilities: ['code-generation', 'design', 'multimodal', 'vision', 'long-context'],
          costPerRequest: 0.035,
          avgResponseTime: 2800,
          qualityScore: 92,
          contextWindow: 1000000,
          supportsVision: true,
        },
        {
          id: 'gemini-1.5-flash',
          name: 'Gemini 1.5 Flash',
          provider: 'google',
          capabilities: ['code-generation', 'fast-response', 'multimodal', 'vision'],
          costPerRequest: 0.01,
          avgResponseTime: 1500,
          qualityScore: 88,
          contextWindow: 1000000,
          supportsVision: true,
        },
        {
          id: 'gemini-2.0-flash',
          name: 'Gemini 2.0 Flash',
          provider: 'google',
          capabilities: ['code-generation', 'multimodal', 'vision', 'audio', 'fast-response'],
          costPerRequest: 0.012,
          avgResponseTime: 1400,
          qualityScore: 89,
          contextWindow: 1000000,
          supportsVision: true,
          supportsAudio: true,
        },
      ],
    },
    {
      id: 'replicate',
      name: 'Replicate',
      envKey: ENV_KEYS.REPLICATE,
      available: !!getEnvValue(ENV_KEYS.REPLICATE),
      models: [
        {
          id: 'llama-3-70b',
          name: 'Llama 3 70B',
          provider: 'replicate',
          capabilities: ['code-generation', 'logic', 'open-source'],
          costPerRequest: 0.008,
          avgResponseTime: 2500,
          qualityScore: 88,
          contextWindow: 8192,
        },
        {
          id: 'mixtral-8x7b',
          name: 'Mixtral 8x7B',
          provider: 'replicate',
          capabilities: ['code-generation', 'logic', 'open-source', 'fast-response'],
          costPerRequest: 0.006,
          avgResponseTime: 2000,
          qualityScore: 86,
          contextWindow: 32768,
        },
        {
          id: 'sdxl',
          name: 'Stable Diffusion XL',
          provider: 'replicate',
          capabilities: ['image-generation', 'design', 'art'],
          costPerRequest: 0.005,
          avgResponseTime: 5000,
          qualityScore: 90,
        },
      ],
    },
    {
      id: 'runway',
      name: 'Runway',
      envKey: ENV_KEYS.RUNWAY,
      available: !!getEnvValue(ENV_KEYS.RUNWAY),
      models: [
        {
          id: 'gen-2',
          name: 'Gen-2',
          provider: 'runway',
          capabilities: ['video-generation', 'video-editing', 'multimodal'],
          costPerRequest: 0.5,
          avgResponseTime: 30000,
          qualityScore: 92,
          supportsVideo: true,
        },
      ],
    },
    {
      id: 'groq',
      name: 'Groq',
      envKey: ENV_KEYS.GROQ,
      available: !!getEnvValue(ENV_KEYS.GROQ),
      models: [
        {
          id: 'llama-3-70b-groq',
          name: 'Llama 3 70B (Groq)',
          provider: 'groq',
          capabilities: ['code-generation', 'ultra-fast', 'logic'],
          costPerRequest: 0.004,
          avgResponseTime: 500,
          qualityScore: 88,
          contextWindow: 8192,
        },
        {
          id: 'mixtral-8x7b-groq',
          name: 'Mixtral 8x7B (Groq)',
          provider: 'groq',
          capabilities: ['code-generation', 'ultra-fast', 'logic'],
          costPerRequest: 0.003,
          avgResponseTime: 400,
          qualityScore: 86,
          contextWindow: 32768,
        },
      ],
    },
    {
      id: 'cohere',
      name: 'Cohere',
      envKey: ENV_KEYS.COHERE,
      available: !!getEnvValue(ENV_KEYS.COHERE),
      models: [
        {
          id: 'command-r-plus',
          name: 'Command R+',
          provider: 'cohere',
          capabilities: ['code-generation', 'logic', 'rag', 'search'],
          costPerRequest: 0.015,
          avgResponseTime: 2200,
          qualityScore: 89,
          contextWindow: 128000,
        },
      ],
    },
    {
      id: 'mistral',
      name: 'Mistral AI',
      envKey: ENV_KEYS.MISTRAL,
      available: !!getEnvValue(ENV_KEYS.MISTRAL),
      models: [
        {
          id: 'mistral-large',
          name: 'Mistral Large',
          provider: 'mistral',
          capabilities: ['code-generation', 'logic', 'reasoning'],
          costPerRequest: 0.02,
          avgResponseTime: 2300,
          qualityScore: 90,
          contextWindow: 32000,
        },
        {
          id: 'mistral-medium',
          name: 'Mistral Medium',
          provider: 'mistral',
          capabilities: ['code-generation', 'logic', 'balanced'],
          costPerRequest: 0.012,
          avgResponseTime: 1800,
          qualityScore: 87,
          contextWindow: 32000,
        },
      ],
    },
    {
      id: 'deepseek',
      name: 'DeepSeek',
      envKey: ENV_KEYS.DEEPSEEK,
      available: !!getEnvValue(ENV_KEYS.DEEPSEEK),
      models: [
        {
          id: 'deepseek-coder',
          name: 'DeepSeek Coder',
          provider: 'deepseek',
          capabilities: ['code-generation', 'specialized-coding', 'cost-effective'],
          costPerRequest: 0.001,
          avgResponseTime: 1500,
          qualityScore: 89,
          contextWindow: 16000,
        },
      ],
    },
    {
      id: 'xai',
      name: 'xAI',
      envKey: ENV_KEYS.XAI,
      available: !!getEnvValue(ENV_KEYS.XAI),
      models: [
        {
          id: 'grok-beta',
          name: 'Grok Beta',
          provider: 'xai',
          capabilities: ['code-generation', 'logic', 'reasoning', 'real-time'],
          costPerRequest: 0.025,
          avgResponseTime: 2500,
          qualityScore: 90,
          contextWindow: 131072,
        },
      ],
    },
    {
      id: 'together',
      name: 'Together AI',
      envKey: ENV_KEYS.TOGETHER,
      available: !!getEnvValue(ENV_KEYS.TOGETHER),
      models: [
        {
          id: 'llama-3-70b-together',
          name: 'Llama 3 70B (Together)',
          provider: 'together',
          capabilities: ['code-generation', 'logic', 'fast-response'],
          costPerRequest: 0.005,
          avgResponseTime: 1800,
          qualityScore: 88,
          contextWindow: 8192,
        },
      ],
    },
    {
      id: 'perplexity',
      name: 'Perplexity',
      envKey: ENV_KEYS.PERPLEXITY,
      available: !!getEnvValue(ENV_KEYS.PERPLEXITY),
      models: [
        {
          id: 'pplx-70b-online',
          name: 'Perplexity 70B Online',
          provider: 'perplexity',
          capabilities: ['code-generation', 'search', 'real-time', 'research'],
          costPerRequest: 0.01,
          avgResponseTime: 3000,
          qualityScore: 87,
          contextWindow: 4096,
        },
      ],
    },
    {
      id: 'openrouter',
      name: 'OpenRouter',
      envKey: ENV_KEYS.OPENROUTER,
      available: !!getEnvValue(ENV_KEYS.OPENROUTER),
      models: [
        {
          id: 'auto',
          name: 'Auto (Best Available)',
          provider: 'openrouter',
          capabilities: ['code-generation', 'logic', 'routing', 'multi-provider'],
          costPerRequest: 0.02,
          avgResponseTime: 2500,
          qualityScore: 90,
          contextWindow: 128000,
        },
      ],
    },
  ];

  return providers;
}

export function getAvailableModels(): AIModelConfig[] {
  const providers = scanAvailableProviders();
  const availableModels: AIModelConfig[] = [];

  for (const provider of providers) {
    if (provider.available) {
      availableModels.push(...provider.models);
      console.log(`[AI Providers] ✓ ${provider.name} available with ${provider.models.length} models`);
    } else {
      console.log(`[AI Providers] ✗ ${provider.name} not available (missing ${provider.envKey})`);
    }
  }

  console.log(`[AI Providers] Total available models: ${availableModels.length}`);
  return availableModels;
}

export function getProviderSummary(): {
  total: number;
  available: number;
  unavailable: number;
  providers: { name: string; available: boolean; modelCount: number }[];
} {
  const providers = scanAvailableProviders();
  
  return {
    total: providers.length,
    available: providers.filter(p => p.available).length,
    unavailable: providers.filter(p => !p.available).length,
    providers: providers.map(p => ({
      name: p.name,
      available: p.available,
      modelCount: p.models.length,
    })),
  };
}

export function getModelsByCapability(capability: string): AIModelConfig[] {
  const allModels = getAvailableModels();
  return allModels.filter(m => m.capabilities.includes(capability));
}

export function getModelById(modelId: string): AIModelConfig | undefined {
  const allModels = getAvailableModels();
  return allModels.find(m => m.id === modelId);
}

export function getBestModelForTask(
  task: 'code-generation' | 'design' | 'vision' | 'reasoning' | 'fast-response' | 'cost-effective',
  strategy: 'quality' | 'speed' | 'cost' = 'quality'
): AIModelConfig | undefined {
  const models = getModelsByCapability(task);
  
  if (models.length === 0) return undefined;

  switch (strategy) {
    case 'quality':
      return models.sort((a, b) => b.qualityScore - a.qualityScore)[0];
    case 'speed':
      return models.sort((a, b) => a.avgResponseTime - b.avgResponseTime)[0];
    case 'cost':
      return models.sort((a, b) => a.costPerRequest - b.costPerRequest)[0];
    default:
      return models[0];
  }
}
