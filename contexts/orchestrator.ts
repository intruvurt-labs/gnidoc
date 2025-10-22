import { orchestrateModels as baseOrchestrate, pickBest as basePickBest, scoreOutput as baseScoreOutput, type OrchestrationConfig, type ModelResult } from '@/lib/multi-model';

type CacheKey = string;
const memCache = new Map<CacheKey, { ts: number; results: ModelResult[] }>();

function keyOf(cfg: OrchestrationConfig): CacheKey {
  const { models, prompt, system, maxParallel = 3, minPromptWords = 3 } = cfg;
  return JSON.stringify({ models: [...models].sort(), prompt, system: system ?? '', maxParallel, minPromptWords });
}

export async function orchestrateModels(cfg: OrchestrationConfig & { cacheTtlMs?: number; force?: boolean }): Promise<ModelResult[]> {
  const start = Date.now();
  const cacheTtlMs = Number.isFinite(cfg.cacheTtlMs) ? (cfg.cacheTtlMs as number) : 15_000;
  const k = keyOf(cfg);
  if (!cfg.force && memCache.has(k)) {
    const hit = memCache.get(k)!;
    if (Date.now() - hit.ts <= cacheTtlMs) {
      console.log('[Orchestrator] cache hit');
      return hit.results;
    }
  }
  console.log('[Orchestrator] start', { models: cfg.models.length, maxParallel: cfg.maxParallel ?? 3 });
  try {
    const results = await baseOrchestrate(cfg);
    memCache.set(k, { ts: Date.now(), results });
    console.log('[Orchestrator] done', { ms: Date.now() - start, best: basePickBest(results)?.model ?? null });
    return results;
  } catch (e) {
    console.error('[Orchestrator] failed', e);
    throw e;
  }
}

export function pickBest(results: ModelResult | ModelResult[] | undefined): ModelResult | null {
  return basePickBest(results);
}

export { baseScoreOutput as scoreOutput };
export type { OrchestrationConfig, ModelResult };
