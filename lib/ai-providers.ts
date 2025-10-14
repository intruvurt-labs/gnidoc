import Constants from 'expo-constants';

export interface AIProvider {
  id: string;
  name: string;
  envKey: string;
  available: boolean;
  models: AIModelConfig[];
}

export type Capability =
  | 'code-generation'
  | 'design'
  | 'logic'
  | 'analysis'
  | 'deployment'
  | 'multimodal'
  | 'vision'
  | 'audio'
  | 'video'
  | 'rag'
  | 'search'
  | 'fast-response'
  | 'open-source'
  | 'routing'
  | 'long-context'
  | 'reasoning'
  | 'balanced'
  | 'cost-effective'
  | 'real-time'
  | 'ui-analysis'
  | 'ultra-fast'
  | 'specialized-coding';

export interface AIModelConfig {
  id: string;
  name: string;
  provider: string;
  capabilities: Capability[];
  costPerRequest: number;
  avgResponseTime: number;
  qualityScore: number;
  contextWindow?: number;
  supportsVision?: boolean;
  supportsAudio?: boolean;
  supportsVideo?: boolean;
  envKeyOverride?: string;
  available?: boolean;
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
  const expoPublic = (typeof process !== 'undefined' && (process as any).env?.[`EXPO_PUBLIC_${key}`]) as string | undefined;
  if (expoPublic) return expoPublic;
  const nodeEnv = (typeof process !== 'undefined' && (process as any).env?.[key]) as string | undefined;
  if (nodeEnv) return nodeEnv;
  const extra = (Constants?.expoConfig as any)?.extra || (globalThis as any)?.__expo?.manifest?.extra;
  if (extra?.[key]) return extra[key];
  return undefined;
}

let _cache: { at: number; providers: AIProvider[] } | null = null;
const CACHE_TTL_MS = 60_000;

export function scanAvailableProviders(): AIProvider[] {
  if (_cache && Date.now() - _cache.at < CACHE_TTL_MS) return _cache.providers;

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
          capabilities: ['code-generation', 'design', 'logic', 'analysis', 'reasoning', 'long-context'],
          costPerRequest: 0.03,
          avgResponseTime: 3000,
          qualityScore: 95,
          contextWindow: 128000,
        },
        {
          id: 'gpt-4',
          name: 'GPT-4',
          provider: 'openai',
          capabilities: ['code-generation', 'design', 'logic', 'analysis', 'reasoning'],
          costPerRequest: 0.06,
          avgResponseTime: 4000,
          qualityScore: 98,
          contextWindow: 8192,
        },
        {
          id: 'gpt-3.5-turbo',
          name: 'GPT-3.5 Turbo',
          provider: 'openai',
          capabilities: ['code-generation', 'fast-response', 'cost-effective'],
          costPerRequest: 0.002,
          avgResponseTime: 1000,
          qualityScore: 85,
          contextWindow: 16385,
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
          capabilities: ['code-generation', 'design', 'logic', 'analysis', 'reasoning', 'long-context'],
          costPerRequest: 0.075,
          avgResponseTime: 3500,
          qualityScore: 97,
          contextWindow: 200000,
        },
        {
          id: 'claude-3-sonnet',
          name: 'Claude 3 Sonnet',
          provider: 'anthropic',
          capabilities: ['code-generation', 'design', 'logic', 'analysis', 'balanced'],
          costPerRequest: 0.015,
          avgResponseTime: 2000,
          qualityScore: 93,
          contextWindow: 200000,
        },
        {
          id: 'claude-3-haiku',
          name: 'Claude 3 Haiku',
          provider: 'anthropic',
          capabilities: ['code-generation', 'fast-response', 'cost-effective'],
          costPerRequest: 0.0025,
          avgResponseTime: 800,
          qualityScore: 88,
          contextWindow: 200000,
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
          envKeyOverride: ENV_KEYS.GEMINI,
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
          envKeyOverride: ENV_KEYS.GEMINI,
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
          id: 'llama-3.1-70b',
          name: 'Llama 3.1 70B',
          provider: 'groq',
          capabilities: ['code-generation', 'ultra-fast', 'open-source'],
          costPerRequest: 0.001,
          avgResponseTime: 500,
          qualityScore: 87,
          contextWindow: 8192,
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
          costPerRequest: 0.0015,
          avgResponseTime: 1200,
          qualityScore: 91,
          contextWindow: 16384,
        },
      ],
    },
  ];

  for (const p of providers) {
    let anyAvailable = false;
    for (const m of p.models) {
      const key = m.envKeyOverride ?? p.envKey;
      m.available = !!getEnvValue(key);
      if (m.available) anyAvailable = true;
    }
    p.available = anyAvailable;
  }

  _cache = { at: Date.now(), providers };
  return providers;
}

export function getAvailableModels(): AIModelConfig[] {
  const providers = scanAvailableProviders();
  const availableModels: AIModelConfig[] = [];

  for (const provider of providers) {
    if (provider.available) {
      availableModels.push(...provider.models.filter(m => m.available));
      console.log(`[AI Providers] ✓ ${provider.name} available with ${provider.models.length} models`);
    } else {
      console.log(`[AI Providers] ✗ ${provider.name} not available (missing ${provider.envKey})`);
    }
  }

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
      modelCount: p.models.filter(m => m.available).length,
    })),
  };
}

export function getModelsByCapability(capability: string): AIModelConfig[] {
  const allModels = getAvailableModels();
  return allModels.filter(m => m.capabilities.includes(capability as Capability));
}

export function getModelById(modelId: string): AIModelConfig | undefined {
  const allModels = getAvailableModels();
  return allModels.find(m => m.id === modelId);
}

export function getBestModelForTask(
  task: Extract<Capability,
    'code-generation' | 'design' | 'vision' | 'reasoning' | 'fast-response' | 'cost-effective'
  >,
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

export function pickModel(opts: {
  requiresVision?: boolean;
  requiresAudio?: boolean;
  maxCost?: number;
  minQuality?: number;
  maxLatencyMs?: number;
  capability?: Capability;
  preference?: 'quality' | 'speed' | 'cost';
}): AIModelConfig | undefined {
  let pool = getAvailableModels();
  if (opts.capability) pool = pool.filter(m => m.capabilities.includes(opts.capability!));
  if (opts.requiresVision) pool = pool.filter(m => m.supportsVision);
  if (opts.requiresAudio) pool = pool.filter(m => m.supportsAudio);
  if (typeof opts.maxCost === 'number') pool = pool.filter(m => m.costPerRequest <= opts.maxCost!);
  if (typeof opts.minQuality === 'number') pool = pool.filter(m => m.qualityScore >= opts.minQuality!);
  if (typeof opts.maxLatencyMs === 'number') pool = pool.filter(m => m.avgResponseTime <= opts.maxLatencyMs!);
  if (pool.length === 0) return undefined;
  switch (opts.preference) {
    case 'speed': return pool.sort((a,b) => a.avgResponseTime - b.avgResponseTime)[0];
    case 'cost':  return pool.sort((a,b) => a.costPerRequest - b.costPerRequest)[0];
    default:      return pool.sort((a,b) => b.qualityScore - a.qualityScore)[0];
  }
}
