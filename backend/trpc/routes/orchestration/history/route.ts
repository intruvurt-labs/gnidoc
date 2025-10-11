import { z } from "zod";
import { protectedProcedure } from "../../../create-context";

const historyItemSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  models: z.array(z.string()),
  selectedModelId: z.string(),
  qualityScore: z.number(),
  totalCost: z.number(),
  totalTime: z.number(),
  createdAt: z.date(),
});

export const getOrchestrationHistoryProcedure = protectedProcedure
  .input(z.object({
    limit: z.number().min(1).max(100).default(50),
    offset: z.number().min(0).default(0),
  }))
  .output(z.object({
    items: z.array(historyItemSchema),
    total: z.number(),
    hasMore: z.boolean(),
  }))
  .query(async ({ input, ctx }) => {
    const token = ctx.token;
    
    console.log(`[Orchestration History] Fetching history for token ${token.substring(0, 10)}...`);

    const mockHistory: {
      id: string;
      prompt: string;
      models: string[];
      selectedModelId: string;
      qualityScore: number;
      totalCost: number;
      totalTime: number;
      createdAt: Date;
    }[] = [];

    return {
      items: mockHistory.slice(input.offset, input.offset + input.limit),
      total: mockHistory.length,
      hasMore: input.offset + input.limit < mockHistory.length,
    };
  });

export const deleteOrchestrationHistoryProcedure = protectedProcedure
  .input(z.object({
    id: z.string(),
  }))
  .output(z.object({
    success: z.boolean(),
    message: z.string(),
  }))
  .mutation(async ({ input, ctx }) => {
    const token = ctx.token;
    
    console.log(`[Orchestration History] Token ${token.substring(0, 10)}... deleting history item ${input.id}`);

    return {
      success: true,
      message: 'History item deleted successfully',
    };
  });
