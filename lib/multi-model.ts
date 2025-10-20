// orchestrator.ts
import { generateText } from '@rork/toolkit-sdk';

export interface ModelResult {
  model: string;
  output: string;
  score: number;
  responseTime: number;
  tokensUsed: number;
  error?: string;
}

export interface OrchestrationConfig {
  models: string[];           // e.g. ['gpt-4o-mini','claude-3-5-sonnet-20240620']
  prompt: string;             // must be >= 3 words (we enforce below)
  system?: string;            // optional system prompt
  maxParallel?: number;       // default 3
  timeout?: number;           // default 60_000 ms
  minPromptWords?: number;    // default 3
  // optional per-model overrides
  perModelTimeoutMs?: Record<string, number>;
}

export const Providers = {
  openai: 'openai',
  anthropic: 'anthropic',
  groq: 'groq',
  openrouter: 'openrouter',
  ollama: 'ollama', // local
} as const;

export const Registry: Record<string, {
  cost: number; speed: number; json: boolean; code: boolean; provider: keyof typeof Providers;
}> = {
  // OpenAI-like
  'gpt-4':                 { cost: 4, speed: 2, json: true,  code: true, provider: Providers.openai },
  'gpt-4-turbo':           { cost: 4, speed: 3, json: true,  code: true, provider: Providers.openai },
  'gpt-4o':                { cost: 4, speed: 3, json: true,  code: true, provider: Providers.openai },
  'gpt-4o-mini':           { cost: 3, speed: 4, json: true,  code: true, provider: Providers.openai },

  // Anthropic
  'claude-3-opus':         { cost: 5, speed: 2, json: true,  code: true, provider: Providers.anthropic },
  'claude-2':              { cost: 4, speed: 2, json: true,  code: true, provider: Providers.anthropic },
  'claude-3-5-sonnet-20240620': { cost: 4, speed: 3, json: true, code: true, provider: Providers.anthropic },

  // Google
  'gemini-pro':            { cost: 2, speed: 4, json: true,  code: true, provider: Providers.openrouter }, // route via OpenRouter if needed

  // Groq
  'llama3-70b-8192':       { cost: 1, speed: 5, json: false, code: true, provider: Providers.groq },
  'mixtral-8x7b-32768':    { cost: 1, speed: 4, json: false, code: true, provider: Providers.groq },

  // OpenRouter composite id example
  'openrouter/anthropic/claude-3.5-sonnet': { cost: 3, speed: 3, json: true, code: true, provider: Providers.openrouter },

  // Local
  'ollama/llama3':         { cost: 0, speed: 2, json: false, code: true, provider: Providers.ollama },
};

const MODEL_NAMES: Record<string, string> = {
  'gpt-4': 'GPT-4',
  'gpt-4-turbo': 'GPT-4 Turbo',
  'gpt-4o': 'GPT-4o',
  'gpt-4o-mini': 'GPT-4o mini',
  'claude-3-opus': 'Claude 3 Opus',
  'claude-2': 'Claude 2',
  'claude-3-5-sonnet-20240620': 'Claude 3.5 Sonnet',
  'gemini-pro': 'Gemini Pro',
  'mistral-7b': 'Mistral 7B',
  'llama3-70b-8192': 'Llama-3 70B',
  'mixtral-8x7b-32768': 'Mixtral 8x7B',
  'openrouter/anthropic/claude-3.5-sonnet': 'Claude 3.5 (OpenRouter)',
  'ollama/llama3': 'Ollama Llama-3',
};

export async function orchestrateModels(config: OrchestrationConfig): Promise<ModelResult[]> {
  const {
    models,
    prompt,
    system,
    maxParallel = 3,
    timeout = 60_000,
    minPromptWords = 3,
    perModelTimeoutMs = {},
  } = config;

  // Guard prompt quality
  const wordCount = prompt.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount < minPromptWords) {
    throw new Error(`Prompt must have at least ${minPromptWords} words (got ${wordCount}).`);
  }
  if (!models?.length) {
    throw new Error('No models provided.');
  }

  console.log(`[MultiModel] Starting orchestration with ${models.length} models`);
  console.log(`[MultiModel] Models: ${models.join(', ')}`);

  const results: ModelResult[] = [];
  const batches: string[][] = [];
  for (let i = 0; i < models.length; i += maxParallel) {
    batches.push(models.slice(i, i + maxParallel));
  }

  for (const batch of batches) {
    console.log(`[MultiModel] Processing batch: ${batch.join(', ')}`);

    const batchResults = await Promise.allSettled(
      batch.map(model => callModelWithTimeout({
        model,
        prompt,
        system,
        timeout: perModelTimeoutMs[model] ?? timeout,
      })),
    );

    batch.forEach((model, i) => {
      const result = batchResults[i];
      if (result.status === 'fulfilled') {
        results.push(result.value);
        console.log(`[MultiModel] ${model} completed: score=${result.value.score.toFixed(2)}, time=${result.value.responseTime}ms`);
      } else {
        const reason = (result as PromiseRejectedResult).reason;
        console.error(`[MultiModel] ${model} failed:`, reason);
        results.push({
          model,
          output: '',
          score: 0,
          responseTime: 0,
          tokensUsed: 0,
          error: reason instanceof Error ? reason.message : String(reason ?? 'Unknown error'),
        });
      }
    });
  }

  const sorted = results.sort((a, b) => b.score - a.score);
  console.log('[MultiModel] Orchestration complete');
  console.log('[MultiModel] Rankings:');
  sorted.forEach((r, i) => {
    console.log(`  ${i + 1}. ${MODEL_NAMES[r.model] || r.model}: ${r.score.toFixed(2)} (${r.responseTime}ms)`);
  });

  return sorted;
}

/** Convenience: return best result quickly (non-error highest score) */
export function pickBest(results: ModelResult | ModelResult[] | undefined): ModelResult | null {
  if (!results) return null;
  const arr = Array.isArray(results) ? results : [results];
  const ok = arr.filter(r => !r.error && r.output);
  if (!ok.length) return null;
  return ok.sort((a, b) => b.score - a.score)[0];
}

async function callModelWithTimeout(params: {
  model: string;
  prompt: string;
  system?: string;
  timeout: number;
}): Promise<ModelResult> {
  const { model, prompt, system, timeout } = params;
  const start = Date.now();

  const display = MODEL_NAMES[model] || model;
  console.log(`[MultiModel] Calling ${display}...`);

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout)
  );

  try {
    // Messages: add system as proper system role if supported by your SDK.
    // If @rork/toolkit-sdk only supports 'messages', pass system as first message.
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
    if (system?.trim()) messages.push({ role: 'system', content: system.trim() });
    messages.push({ role: 'user', content: prompt });

    // Pass model so the SDK hits the right provider.
    const outputPromise = generateText({ model, messages });

    const output = await Promise.race([outputPromise, timeoutPromise]);

    const responseTime = Date.now() - start;
    const outputStr = String(output ?? '');
    const tokensUsed = roughTokenEstimate(outputStr);
    const score = scoreOutput(outputStr, prompt);

    console.log(`[MultiModel] ${display} response: ${outputStr.length} chars, score=${score.toFixed(2)}`);

    return {
      model,
      output: outputStr,
      score,
      responseTime,
      tokensUsed,
    };
  } catch (err: any) {
    const responseTime = Date.now() - start;
    console.error(`[MultiModel] ${display} error after ${responseTime}ms:`, err);
    throw err instanceof Error ? err : new Error(String(err));
  }
}

/** Rough token estimator (safe default for ranking) */
function roughTokenEstimate(text: string): number {
  // ~4 chars per token heuristic; clamp to >=1 if non-empty
  const tokens = Math.max(0, Math.ceil((text || '').length / 4));
  return tokens;
}

/** Heuristic scoring tuned for code + UI artifacts */
export function scoreOutput(output: string, prompt: string): number {
  if (!output || output.trim().length < 10) return 0;

  let score = 0.5;

  // Penalize extremely short or extremely long outputs
  const len = output.length;
  if (len < 400) score -= 0.08;
  if (len > 60_000) score -= 0.1; // discourage rambling dumps

  // Structure signals (light, additive)
  if (output.includes('import ') || output.includes('export ')) score += 0.08;
  if (output.includes('function') || /\bconst\s+\w+\s*=\s*\(/.test(output)) score += 0.06;
  if (/<\w+[\s>]/.test(output)) score += 0.06;                 // JSX/HTML presence
  if (output.includes('interface ') || output.includes('type ')) score += 0.05;
  if (/try\s*{[\s\S]*}\s*catch\s*\(/.test(output)) score += 0.04;
  if (output.includes('StyleSheet.create')) score += 0.04;     // RN signal
  if (output.includes('useState') || output.includes('useEffect')) score += 0.04;
  if (output.includes('testID') || output.includes('testId')) score += 0.03;

  // Comments but not too many
  const commentCount = (output.match(/\/\//g) || []).length;
  if (commentCount >= 2 && commentCount <= 40) score += 0.03;

  // Basic relevance to prompt (unique words ≥ 4 chars)
  const pwords = Array.from(new Set(prompt.toLowerCase().split(/\s+/).filter(w => w.length > 3)));
  const olower = output.toLowerCase();
  const hits = pwords.filter(w => olower.includes(w)).length;
  score += Math.min(0.12, (hits / Math.max(1, pwords.length)) * 0.12);

  // Deductions
  if (/\bany\b/.test(output)) score -= 0.03;
  if (output.includes('TODO') || output.includes('FIXME')) score -= 0.04;
  if (/^\s*```/.test(output) && !/```[^\n`]+\n/.test(output)) score -= 0.05; // code fences without filenames

  // Clamp
  return Math.max(0, Math.min(1, score));
}
