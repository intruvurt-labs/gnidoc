import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { runOrchestrator } from "../../../../lib/providers/orchestrator";
import { GenInput } from "../../../../lib/providers/types";

const compareRequestSchema = z.object({
  prompt: z.string().min(1).max(5000),
  providers: z.array(z.string()).min(2).max(10),
  taskType: z.enum(['code', 'text']).optional().default('text'),
});

const comparisonResultSchema = z.object({
  provider: z.string(),
  model: z.string(),
  content: z.string().optional(),
  score: z.number(),
  responseTime: z.number().optional(),
  tokensUsed: z.number().optional(),
  status: z.enum(['ok','error','timeout']),
  error: z.string().optional(),
  confidence: z.number().optional(),
  reasoning: z.string().optional(),
});

export const compareModelsProcedure = protectedProcedure
  .input(compareRequestSchema)
  .output(z.object({
    prompt: z.string(),
    results: z.array(comparisonResultSchema),
    consensus: z.object({
      consensus: z.string(),
      confidence: z.number(),
      agreement: z.number(),
      reasoning: z.string(),
      winner: comparisonResultSchema,
    }),
    timestamp: z.date(),
  }))
  .mutation(async ({ input }) => {
    const genInput = GenInput.parse({ prompt: input.prompt });
    const { results, consensus } = await runOrchestrator(input.providers, genInput, input.taskType);

    const normalizedResults = results.map(r => ({
      provider: r.provider,
      model: r.model,
      content: r.text,
      score: r.score,
      responseTime: r.responseTime,
      tokensUsed: r.tokensUsed,
      status: r.status,
      error: r.error,
      confidence: r.confidence,
      reasoning: r.reasoning,
    }));

    return {
      prompt: input.prompt,
      results: normalizedResults,
      consensus: {
        consensus: consensus.consensus,
        confidence: consensus.confidence,
        agreement: consensus.agreement,
        reasoning: consensus.reasoning,
        winner: normalizedResults.find(r => r.provider === consensus.winner.provider && r.model === consensus.winner.model) || normalizedResults[0],
      },
      timestamp: new Date(),
    };
  });
