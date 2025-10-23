export const Providers = {
  openai: 'openai',
  anthropic: 'anthropic',
  gemini: 'gemini','vision',
  runway: 'runway',
  xai: 'xai',
  huggingface: 'huggingface',
  deepseek: 'deepseek',
  ollama: 'ollama',
  replicate: 'replicate',
} as const;

export type ProviderName = typeof Providers[keyof typeof Providers];

export interface ModelCapabilities {
  cost?: number;
  speed?: number;
  json?: boolean;
  code?: boolean;
  vision?: boolean;
  type?: 'deep-research' | 'cross-referenced code' | 'text' | 'image' | 'video' | 'audio';
  async?: boolean;
  local?: boolean;
  dynamicModelId?: boolean;
  aliasOf?: string;
}

export const Registry: Record<ProviderName, { models: Record<string, ModelCapabilities> }> = {
  openai: {
    models: {
      'gpt-4o': { cost: 5, speed: 3, json: true, code: true, vision: true },
      'gpt-4o-mini': { cost: 2, speed: 5, json: true, code: true, vision: true },
      'o1-preview': { cost: 8, speed: 2, json: true, code: true, vision: false },
      'o1-mini': { cost: 4, speed: 3, json: true, code: true, vision: false },
      'gpt5': { aliasOf: 'gpt-4o' },
    },
  },
  anthropic: {
    models: {
      'claude-3-5-sonnet-20241022': { cost: 5, speed: 4, json: true, code: true, vision: true },
      'claude-3-5-sonnet-20240620': { cost: 4, speed: 3, json: true, code: true, vision: true },
      'claude-3-opus-20240229': { cost: 6, speed: 2, json: true, code: true, vision: true },
      'claude-3-haiku-20240307': { cost: 1, speed: 5, json: true, code: true, vision: true },
    },
  },
  gemini: {
    models: {
      'gemini-2.5-pro': { cost: 4, speed: 2, json: true, code: true, vision: true },
      'gemini-1.5-flash': { cost: 2, speed: 5, json: true, code: true, vision: true },
      'gemini-2.0-flash-exp': { cost: 2, speed: 5, json: true, code: true, vision: true },
    },
  },
  runway: {
    models: {
      'gen-3-alpha': { type: 'video', async: true, vision: true, cost: 12, speed: 1 },
      'gen-3.5': { type: 'video', async: true, vision: true, cost: 14, speed: 1 },
    },
  },
  xai: {
    models: {
      'grok-2-1212': { cost: 3, speed: 4, json: true, code: true, vision: true },
      'grok-2-vision-1212': { cost: 3, speed: 4, json: true, code: true, vision: true },
      'grok-beta': { cost: 2, speed: 5, json: true, code: true, vision: false },
    },
  },
  huggingface: {
    models: {
      'text-generation': { dynamicModelId: true, json: false, code: true, cost: 1, speed: 3 },
      'image-generation': { dynamicModelId: true, type: 'image', cost: 1, speed: 2 },
    },
  },
  deepseek: {
    models: {
      'deepseek-chat': { cost: 1, speed: 5, json: true, code: true, vision: false },
      'deepseek-coder': { cost: 1, speed: 5, json: true, code: true, vision: false },
    },
  },
  ollama: {
    models: {
      'llama3.2': { cost: 0, speed: 3, local: true, json: false, code: true },
      'llama3.1': { cost: 0, speed: 2, local: true, json: false, code: true },
      'codellama': { cost: 0, speed: 2, local: true, json: false, code: true },
      'mistral': { cost: 0, speed: 3, local: true, json: false, code: true },
      'qwen2.5-coder': { cost: 0, speed: 3, local: true, json: false, code: true },
    },
  },
  replicate: {
    models: {
      'prediction': { dynamicModelId: true, async: true, cost: 2, speed: 2 },
    },
  },
};

export function getModelInfo(model: string): { provider: ProviderName; capabilities: ModelCapabilities } | null {
  for (const [provider, config] of Object.entries(Registry)) {
    const capabilities = config.models[model];
    if (capabilities) {
      if (capabilities.aliasOf) {
        const aliased = config.models[capabilities.aliasOf];
        return { provider: provider as ProviderName, capabilities: aliased };
      }
      return { provider: provider as ProviderName, capabilities };
    }
  }
  
  if (model.includes('/')) return { provider: 'huggingface', capabilities: { dynamicModelId: true, cost: 1, speed: 3, code: true } };
  if (model.startsWith('gen-')) return { provider: 'runway', capabilities: { type: 'video', async: true, cost: 10, speed: 1 } };
  
  return null;
}
