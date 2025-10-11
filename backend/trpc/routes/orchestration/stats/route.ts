import { z } from "zod";
import { protectedProcedure } from "../../../create-context";

const modelStatsSchema = z.object({
  modelId: z.string(),
  modelName: z.string(),
  totalRequests: z.number(),
  avgQuality: z.number(),
  avgResponseTime: z.number(),
  totalCost: z.number(),
  timesSelected: z.number(),
  successRate: z.number(),
});

export const getModelStatsProcedure = protectedProcedure
  .input(z.object({
    timeRange: z.enum(['day', 'week', 'month', 'all']).default('all'),
  }))
  .output(z.object({
    stats: z.array(modelStatsSchema),
    totalOrchestrations: z.number(),
    totalCost: z.number(),
    avgQualityScore: z.number(),
  }))
  .query(async ({ input, ctx }) => {
    const token = ctx.token;
    
    console.log(`[Model Stats] Fetching stats for token ${token.substring(0, 10)}..., range: ${input.timeRange}`);

    const mockStats = [
      {
        modelId: 'gpt-4-turbo',
        modelName: 'GPT-4 Turbo',
        totalRequests: 0,
        avgQuality: 0,
        avgResponseTime: 0,
        totalCost: 0,
        timesSelected: 0,
        successRate: 0,
      },
      {
        modelId: 'claude-3-opus',
        modelName: 'Claude 3 Opus',
        totalRequests: 0,
        avgQuality: 0,
        avgResponseTime: 0,
        totalCost: 0,
        timesSelected: 0,
        successRate: 0,
      },
      {
        modelId: 'gemini-pro',
        modelName: 'Gemini Pro',
        totalRequests: 0,
        avgQuality: 0,
        avgResponseTime: 0,
        totalCost: 0,
        timesSelected: 0,
        successRate: 0,
      },
      {
        modelId: 'gpt-4-vision',
        modelName: 'GPT-4 Vision',
        totalRequests: 0,
        avgQuality: 0,
        avgResponseTime: 0,
        totalCost: 0,
        timesSelected: 0,
        successRate: 0,
      },
    ];

    return {
      stats: mockStats,
      totalOrchestrations: 0,
      totalCost: 0,
      avgQualityScore: 0,
    };
  });
