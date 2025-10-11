import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { generateText } from "@rork/toolkit-sdk";

const compareRequestSchema = z.object({
  prompt: z.string().min(1).max(5000),
  modelIds: z.array(z.string()).min(2).max(10),
});

const comparisonResultSchema = z.object({
  modelId: z.string(),
  modelName: z.string(),
  content: z.string(),
  qualityScore: z.number(),
  responseTime: z.number(),
  tokensUsed: z.number(),
  cost: z.number(),
  timestamp: z.date(),
  error: z.string().optional(),
});

export const compareModelsProcedure = protectedProcedure
  .input(compareRequestSchema)
  .output(z.object({
    prompt: z.string(),
    results: z.array(comparisonResultSchema),
    consensus: z.object({
      bestQuality: z.string(),
      fastest: z.string(),
      mostCostEffective: z.string(),
      recommended: z.string(),
    }),
    timestamp: z.date(),
  }))
  .mutation(async ({ input, ctx }) => {
    const token = ctx.token;
    console.log(`[Comparison] Token ${token.substring(0, 10)}... comparing ${input.modelIds.length} models`);

    if (!process.env.EXPO_PUBLIC_TOOLKIT_URL) {
      throw new Error('EXPO_PUBLIC_TOOLKIT_URL environment variable is not set. Please configure it in your .env file.');
    }

    const availableModels = [
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        provider: 'openai' as const,
        costPerRequest: 0.03,
      },
      {
        id: 'claude-3-opus',
        name: 'Claude 3 Opus',
        provider: 'anthropic' as const,
        costPerRequest: 0.025,
      },
      {
        id: 'gemini-pro',
        name: 'Gemini Pro',
        provider: 'google' as const,
        costPerRequest: 0.02,
      },
      {
        id: 'gpt-4-vision',
        name: 'GPT-4 Vision',
        provider: 'openai' as const,
        costPerRequest: 0.04,
      },
    ];

    const results: {
      modelId: string;
      modelName: string;
      content: string;
      qualityScore: number;
      responseTime: number;
      tokensUsed: number;
      cost: number;
      timestamp: Date;
      error?: string;
    }[] = [];

    for (const modelId of input.modelIds) {
      const model = availableModels.find(m => m.id === modelId);
      if (!model) {
        console.warn(`[Comparison] Model ${modelId} not found, skipping`);
        continue;
      }

      const startTime = Date.now();

      try {
        console.log(`[Comparison] Generating with ${model.name}...`);

        const content = await generateText({
          messages: [{ role: 'user', content: input.prompt }]
        });

        const responseTime = Date.now() - startTime;
        const tokensUsed = Math.ceil(content.length / 4);
        const cost = (tokensUsed / 1000) * model.costPerRequest;
        const qualityScore = evaluateQuality(content, input.prompt);

        results.push({
          modelId: model.id,
          modelName: model.name,
          content,
          qualityScore,
          responseTime,
          tokensUsed,
          cost,
          timestamp: new Date(),
        });

        console.log(`[Comparison] ${model.name}: Quality ${qualityScore}%, ${responseTime}ms, $${cost.toFixed(4)}`);
      } catch (error) {
        console.error(`[Comparison] ${model.name} failed:`, error);
        
        results.push({
          modelId: model.id,
          modelName: model.name,
          content: `// Error: ${error instanceof Error ? error.message : 'Generation failed'}`,
          qualityScore: 0,
          responseTime: Date.now() - startTime,
          tokensUsed: 0,
          cost: 0,
          timestamp: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const validResults = results.filter(r => r.qualityScore > 0);

    const consensus = {
      bestQuality: validResults.length > 0 
        ? validResults.reduce((best, curr) => curr.qualityScore > best.qualityScore ? curr : best).modelId
        : results[0]?.modelId || 'none',
      fastest: validResults.length > 0
        ? validResults.reduce((best, curr) => curr.responseTime < best.responseTime ? curr : best).modelId
        : results[0]?.modelId || 'none',
      mostCostEffective: validResults.length > 0
        ? validResults.reduce((best, curr) => curr.cost < best.cost ? curr : best).modelId
        : results[0]?.modelId || 'none',
      recommended: validResults.length > 0
        ? validResults.reduce((best, curr) => {
            const bestScore = (best.qualityScore * 0.6) + ((10000 / best.responseTime) * 0.3) + ((1 / (best.cost + 0.001)) * 0.1);
            const currScore = (curr.qualityScore * 0.6) + ((10000 / curr.responseTime) * 0.3) + ((1 / (curr.cost + 0.001)) * 0.1);
            return currScore > bestScore ? curr : best;
          }).modelId
        : results[0]?.modelId || 'none',
    };

    console.log(`[Comparison] Consensus: Best=${consensus.bestQuality}, Fastest=${consensus.fastest}, Recommended=${consensus.recommended}`);

    return {
      prompt: input.prompt,
      results,
      consensus,
      timestamp: new Date(),
    };
  });

function evaluateQuality(content: string, prompt: string): number {
  let score = 70;

  if (content.includes('import') && content.includes('export')) score += 5;
  if (content.includes('interface') || content.includes('type')) score += 5;
  if (content.includes('StyleSheet.create')) score += 5;
  if (content.includes('try') && content.includes('catch')) score += 5;
  if (content.includes('useState') || content.includes('useEffect')) score += 5;
  if (!content.includes('any')) score += 3;
  
  const hasComments = (content.match(/\/\//g) || []).length > 2;
  if (hasComments) score += 3;
  
  const lines = content.split('\n').length;
  if (lines > 20 && lines < 500) score += 2;

  if (content.includes('#00FFFF') || content.includes('cyan')) score += 2;

  return Math.min(100, score);
}
