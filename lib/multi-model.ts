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
  models: string[];
  prompt: string;
  system?: string;
  maxParallel?: number;
  timeout?: number;
}

const MODEL_NAMES: Record<string, string> = {
  'gpt-4': 'GPT-4',
  'gpt-4-turbo': 'GPT-4 Turbo',
  'claude-3-opus': 'Claude 3 Opus',
  'claude-2': 'Claude 2',
  'gemini-pro': 'Gemini Pro',
  'mistral-7b': 'Mistral 7B',
};

export async function orchestrateModels(config: OrchestrationConfig): Promise<ModelResult[]> {
  const { models, prompt, system, maxParallel = 3, timeout = 60000 } = config;

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
      batch.map(model => callModelWithTimeout(model, prompt, system, timeout))
    );

    for (let i = 0; i < batchResults.length; i++) {
      const result = batchResults[i];
      const model = batch[i];
      
      if (result.status === 'fulfilled') {
        results.push(result.value);
        console.log(`[MultiModel] ${model} completed: score=${result.value.score}, time=${result.value.responseTime}ms`);
      } else {
        console.error(`[MultiModel] ${model} failed:`, result.reason);
        results.push({
          model,
          output: '',
          score: 0,
          responseTime: 0,
          tokensUsed: 0,
          error: result.reason instanceof Error ? result.reason.message : 'Unknown error',
        });
      }
    }
  }

  const sortedResults = results.sort((a, b) => b.score - a.score);
  
  console.log('[MultiModel] Orchestration complete');
  console.log('[MultiModel] Rankings:');
  sortedResults.forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.model}: ${r.score.toFixed(2)} (${r.responseTime}ms)`);
  });

  return sortedResults;
}

async function callModelWithTimeout(
  model: string,
  prompt: string,
  system: string | undefined,
  timeout: number
): Promise<ModelResult> {
  const startTime = Date.now();
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout);
  });

  try {
    const modelName = MODEL_NAMES[model] || model;
    console.log(`[MultiModel] Calling ${modelName}...`);

    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    
    if (system) {
      messages.push({ role: 'user', content: system });
    }
    
    messages.push({ role: 'user', content: prompt });

    const outputPromise = generateText({ messages });
    
    const output = await Promise.race([outputPromise, timeoutPromise]);
    
    const responseTime = Date.now() - startTime;
    const outputStr = String(output || '');
    const tokensUsed = Math.ceil(outputStr.length / 4);
    const score = scoreOutput(outputStr, prompt);

    console.log(`[MultiModel] ${modelName} response: ${outputStr.length} chars, score=${score.toFixed(2)}`);

    return {
      model,
      output: outputStr,
      score,
      responseTime,
      tokensUsed,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`[MultiModel] ${model} error after ${responseTime}ms:`, error);
    
    throw error;
  }
}

export function scoreOutput(output: string, prompt: string): number {
  if (!output || output.length < 10) {
    return 0;
  }

  let score = 0.5;

  const lengthScore = Math.min(output.length / 2000, 0.15);
  score += lengthScore;

  if (output.includes('import ') || output.includes('export ')) {
    score += 0.1;
  }

  if (output.includes('function') || output.includes('const ')) {
    score += 0.08;
  }

  if (/<\w+[\s>]/.test(output)) {
    score += 0.08;
  }

  if (output.includes('interface ') || output.includes('type ')) {
    score += 0.07;
  }

  if (/try\s*{[\s\S]*}[\s\n]*catch\s*\(/.test(output)) {
    score += 0.05;
  }

  if (output.includes('StyleSheet.create')) {
    score += 0.05;
  }

  const lines = output.split('\n').length;
  if (lines >= 20 && lines <= 500) {
    score += 0.05;
  }

  const commentCount = (output.match(/\/\//g) || []).length;
  if (commentCount >= 3 && commentCount <= 30) {
    score += 0.04;
  }

  if (output.includes('TODO') || output.includes('FIXME')) {
    score -= 0.05;
  }

  if (/\bany\b/.test(output)) {
    score -= 0.03;
  }

  const promptWords = prompt.toLowerCase().split(/\s+/);
  const outputLower = output.toLowerCase();
  const relevanceScore = promptWords.filter(word => 
    word.length > 3 && outputLower.includes(word)
  ).length / Math.max(promptWords.length, 1);
  score += relevanceScore * 0.1;

  if (output.includes('useState') || output.includes('useEffect')) {
    score += 0.05;
  }

  if (output.includes('testID') || output.includes('testId')) {
    score += 0.03;
  }

  return Math.max(0, Math.min(1, score));
}
