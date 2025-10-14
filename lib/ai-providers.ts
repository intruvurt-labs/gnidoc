@@
-import Constants from 'expo-constants';
+import Constants from 'expo-constants';
+import { Platform } from 'react-native';
 
 export interface AIProvider {
   id: string;
   name: string;
   envKey: string;
   available: boolean;
   models: AIModelConfig[];
 }
 
+export type Capability =
+  | 'code-generation'
+  | 'design'
+  | 'logic'
+  | 'analysis'
+  | 'deployment'
+  | 'multimodal'
+  | 'vision'
+  | 'audio'
+  | 'video'
+  | 'rag'
+  | 'search'
+  | 'fast-response'
+  | 'open-source'
+  | 'routing'
+  | 'long-context'
+  | 'reasoning'
+  | 'balanced'
+  | 'cost-effective'
+  | 'real-time'
+  | 'ui-analysis'
+  | 'ultra-fast'
+  | 'specialized-coding';
+
 export interface AIModelConfig {
   id: string;
   name: string;
   provider: string;
-  capabilities: string[];
+  capabilities: Capability[];
   costPerRequest: number;
   avgResponseTime: number;
   qualityScore: number;
   contextWindow?: number;
   supportsVision?: boolean;
   supportsAudio?: boolean;
   supportsVideo?: boolean;
+  /** Optional: override env key for this model if different from provider */
+  envKeyOverride?: string;
+  /** Computed at runtime; not required to set statically */
+  available?: boolean;
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
 
-function getEnvValue(key: string): string | undefined {
-  if (typeof process !== 'undefined' && process.env) {
-    return process.env[key];
-  }
-  
-  const expoConfig = Constants.expoConfig;
-  if (expoConfig?.extra?.[key]) {
-    return expoConfig.extra[key];
-  }
-  
-  return undefined;
-}
+// NOTE: Never ship *real* provider keys to clients; prefer a server proxy.
+// This helper only *detects presence* for toggling UI.
+function getEnvValue(key: string): string | undefined {
+  // 1) Expo runtime env (EAS): EXPO_PUBLIC_* gets inlined at build time
+  //    If you set EXPO_PUBLIC_OPENAI_API_KEY, check that first.
+  const expoPublic = (typeof process !== 'undefined' && (process as any).env?.[`EXPO_PUBLIC_${key}`]) as string | undefined;
+  if (expoPublic) return expoPublic;
+  // 2) Standard process.env (web/Node)
+  const nodeEnv = (typeof process !== 'undefined' && (process as any).env?.[key]) as string | undefined;
+  if (nodeEnv) return nodeEnv;
+  // 3) app.json/app.config.ts extra (dev or classic builds)
+  const extra = (Constants?.expoConfig as any)?.extra || (globalThis as any)?.__expo?.manifest?.extra;
+  if (extra?.[key]) return extra[key];
+  return undefined;
+}
+
+function hasAnyEnv(keys: string[]): boolean {
+  return keys.some(k => !!getEnvValue(k));
+}
+
+// simple in-memory cache to avoid repeated scans
+let _cache: { at: number; providers: AIProvider[] } | null = null;
+const CACHE_TTL_MS = 60_000;
 
 export function scanAvailableProviders(): AIProvider[] {
-  const providers: AIProvider[] = [
+  if (_cache && Date.now() - _cache.at < CACHE_TTL_MS) return _cache.providers;
+
+  const providers: AIProvider[] = [
     {
       id: 'openai',
       name: 'OpenAI',
       envKey: ENV_KEYS.OPENAI,
-      available: !!getEnvValue(ENV_KEYS.OPENAI),
+      available: !!getEnvValue(ENV_KEYS.OPENAI),
       models: [
         {
           id: 'gpt-4-turbo',
           name: 'GPT-4 Turbo',
           provider: 'openai',
@@
         },
       ],
     },
     {
       id: 'anthropic',
       name: 'Anthropic',
       envKey: ENV_KEYS.ANTHROPIC,
       available: !!getEnvValue(ENV_KEYS.ANTHROPIC),
@@
     },
     {
       id: 'google',
       name: 'Google AI',
       envKey: ENV_KEYS.GOOGLE,
-      available: !!getEnvValue(ENV_KEYS.GOOGLE) || !!getEnvValue(ENV_KEYS.GEMINI),
+      available: !!getEnvValue(ENV_KEYS.GOOGLE) || !!getEnvValue(ENV_KEYS.GEMINI),
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
+          envKeyOverride: ENV_KEYS.GEMINI, // allow either GOOGLE or GEMINI
         },
@@
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
+          envKeyOverride: ENV_KEYS.GEMINI,
         },
       ],
     },
@@
   ];
 
-  return providers;
+  // Compute per-model availability (env by model or provider), then provider availability
+  for (const p of providers) {
+    let anyAvailable = false;
+    for (const m of p.models) {
+      const key = m.envKeyOverride ?? p.envKey;
+      m.available = !!getEnvValue(key);
+      if (m.available) anyAvailable = true;
+    }
+    p.available = anyAvailable;
+  }
+
+  _cache = { at: Date.now(), providers };
+  return providers;
 }
 
 export function getAvailableModels(): AIModelConfig[] {
   const providers = scanAvailableProviders();
   const availableModels: AIModelConfig[] = [];
 
   for (const provider of providers) {
-    if (provider.available) {
-      availableModels.push(...provider.models);
+    if (provider.available) {
+      availableModels.push(...provider.models.filter(m => m.available));
       console.log(`[AI Providers] ✓ ${provider.name} available with ${provider.models.length} models`);
     } else {
       console.log(`[AI Providers] ✗ ${provider.name} not available (missing ${provider.envKey})`);
     }
   }
@@
 export function getProviderSummary(): {
   total: number;
   available: number;
   unavailable: number;
   providers: { name: string; available: boolean; modelCount: number }[];
 } {
   const providers = scanAvailableProviders();
   
   return {
     total: providers.length,
-    available: providers.filter(p => p.available).length,
-    unavailable: providers.filter(p => !p.available).length,
+    available: providers.filter(p => p.available).length,
+    unavailable: providers.filter(p => !p.available).length,
     providers: providers.map(p => ({
       name: p.name,
       available: p.available,
-      modelCount: p.models.length,
+      modelCount: p.models.filter(m => m.available).length,
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
-  task: 'code-generation' | 'design' | 'vision' | 'reasoning' | 'fast-response' | 'cost-effective',
+  task: Extract<Capability,
+    'code-generation' | 'design' | 'vision' | 'reasoning' | 'fast-response' | 'cost-effective'
+  >,
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
+
+// Bonus: find a model by constraints (vision/audio, max cost, min quality, max latency)
+export function pickModel(opts: {
+  requiresVision?: boolean;
+  requiresAudio?: boolean;
+  maxCost?: number;
+  minQuality?: number;
+  maxLatencyMs?: number;
+  capability?: Capability;
+  preference?: 'quality' | 'speed' | 'cost';
+}): AIModelConfig | undefined {
+  let pool = getAvailableModels();
+  if (opts.capability) pool = pool.filter(m => m.capabilities.includes(opts.capability!));
+  if (opts.requiresVision) pool = pool.filter(m => m.supportsVision);
+  if (opts.requiresAudio) pool = pool.filter(m => m.supportsAudio);
+  if (typeof opts.maxCost === 'number') pool = pool.filter(m => m.costPerRequest <= opts.maxCost!);
+  if (typeof opts.minQuality === 'number') pool = pool.filter(m => m.qualityScore >= opts.minQuality!);
+  if (typeof opts.maxLatencyMs === 'number') pool = pool.filter(m => m.avgResponseTime <= opts.maxLatencyMs!);
+  if (pool.length === 0) return undefined;
+  switch (opts.preference) {
+    case 'speed': return pool.sort((a,b) => a.avgResponseTime - b.avgResponseTime)[0];
+    case 'cost':  return pool.sort((a,b) => a.costPerRequest - b.costPerRequest)[0];
+    default:      return pool.sort((a,b) => b.qualityScore - a.qualityScore)[0];
+  }
+}
