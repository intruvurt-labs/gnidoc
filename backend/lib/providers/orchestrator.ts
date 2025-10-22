import pLimit from 'p-limit';
import { GenInput, GenResult, ScoredResult, ConsensusResult } from './types';
import { scoreResults } from './scoring';
import { buildHybridConsensus } from './consensus';
import { openaiAdapter } from './adapters/openai';
import { claudeAdapter } from './adapters/anthropic';
import { geminiAdapter } from './adapters/gemini';
import { xaiAdapter } from './adapters/xai';
import { deepseekAdapter } from './adapters/deepseek';
import { huggingfaceAdapter } from './adapters/huggingface';
import { ollamaAdapter } from './adapters/ollama';
import { replicateAdapter } from './adapters/replicate';
import { runwayAdapter } from './adapters/runway';

const PROVIDER_TIMEOUT_MS = 30_000;
const MAX_PARALLEL = parseInt(process.env.LLM_MAX_PARALLEL || '3', 10);

const limit = pLimit(MAX_PARALLEL);

type AdapterFn = (input: GenInput) => Promise<GenResult>;

const Adapters: Record<string, AdapterFn> = {
  openai: openaiAdapter,
  anthropic: claudeAdapter,
  gemini: geminiAdapter,
  xai: xaiAdapter,
  deepseek: deepseekAdapter,
  huggingface: huggingfaceAdapter,
  ollama: ollamaAdapter,
  replicate: replicateAdapter,
  runway: runwayAdapter,
};

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

export async function runOrchestrator(
  providers: string[],
  input: GenInput,
  taskType: 'code' | 'text' = 'text'
): Promise<{ results: ScoredResult[]; consensus: ConsensusResult }> {
  const validProviders = providers.filter(p => p in Adapters);
  
  if (validProviders.length === 0) {
    throw new Error(`No valid providers. Available: ${Object.keys(Adapters).join(', ')}`);
  }

  console.log(`[Orchestrator] Running ${validProviders.length} providers:`, validProviders);

  const tasks = validProviders.map((provider) =>
    limit(async () => {
      try {
        const adapter = Adapters[provider];
        const result = await withTimeout(
          adapter(input),
          PROVIDER_TIMEOUT_MS,
          provider
        );
        console.log(`[Orchestrator] ${provider} completed in ${result.responseTime}ms`);
        return result;
      } catch (error) {
        console.error(`[Orchestrator] ${provider} failed:`, error);
        return {
          provider,
          model: 'unknown',
          kind: 'text' as const,
          status: 'error' as const,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    })
  );

  const settled = await Promise.allSettled(tasks);
  
  const results = settled
    .filter((r): r is PromiseFulfilledResult<GenResult> => r.status === 'fulfilled')
    .map((r) => r.value);

  console.log(`[Orchestrator] Received ${results.length} results`);

  const scored = scoreResults(results, taskType);
  const consensus = buildHybridConsensus(scored);

  console.log(`[Orchestrator] Consensus: ${consensus.agreement * 100}% agreement, ${consensus.confidence * 100}% confidence`);

  return { results: scored, consensus };
}

export async function runSingleProvider(
  provider: string,
  input: GenInput,
  taskType: 'code' | 'text' = 'text'
): Promise<ScoredResult> {
  if (!(provider in Adapters)) {
    throw new Error(`Unknown provider: ${provider}. Available: ${Object.keys(Adapters).join(', ')}`);
  }

  console.log(`[Orchestrator] Running single provider: ${provider}`);

  try {
    const adapter = Adapters[provider];
    const result = await withTimeout(adapter(input), PROVIDER_TIMEOUT_MS, provider);
    const scored = scoreResults([result], taskType)[0];
    
    console.log(`[Orchestrator] ${provider} completed with score ${scored.score}`);
    
    return scored;
  } catch (error) {
    console.error(`[Orchestrator] ${provider} failed:`, error);
    throw error;
  }
}

export { Adapters };
