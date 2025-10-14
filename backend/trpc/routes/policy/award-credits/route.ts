import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';

export const awardCreditsProcedure = protectedProcedure
  .input(
    z.object({
      amount: z.number().positive(),
      reason: z.string(),
      artifactId: z.string().optional(),
      scanDetails: z
        .object({
          offendingLines: z.number(),
          totalLines: z.number(),
          confidence: z.number(),
        })
        .optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const { amount, reason, artifactId, scanDetails } = input;

    console.log('[Policy] Awarding Bix credits:', {
      amount,
      reason,
      artifactId,
      scanDetails,
    });

    return {
      success: true,
      newBalance: amount,
      awarded: amount,
      reason,
      timestamp: new Date().toISOString(),
    };
  });
